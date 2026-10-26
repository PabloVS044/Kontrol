#!/usr/bin/env python3
"""Real logical backup/restore drill, only on newly created synthetic databases.

No source URI, existing container, volume or restore destination is accepted.
The script never starts Kontrol's application or deploys to its VM.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
DB = 'kontrol_p2_drill'
PG_IMAGE = 'postgres:16-alpine'
MONGO_IMAGE = 'mongo:7'
MIN_FREE = 8 * 1024**3
MAX_ARCHIVE = 256 * 1024**2  # laboratory tool: bounded-memory authenticated encryption
RUN_PATTERN = re.compile(r'^kontrol-p2-[0-9]{8}t[0-9]{6}z-[0-9a-f]{12}$')


class Blocked(RuntimeError):
    pass


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False)


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def private_write(path, data):
    path = Path(path)
    with path.open('xb') as stream:
        os.chmod(path, 0o600)
        stream.write(data)


def encrypt_archive(path, key):
    from cryptography.fernet import Fernet
    path = Path(path)
    if path.stat().st_size > MAX_ARCHIVE:
        raise Blocked('Archive exceeds the 256 MiB laboratory encryption limit.')
    raw = path.read_bytes()
    encrypted = path.with_suffix(path.suffix + '.fernet')
    private_write(encrypted, Fernet(key).encrypt(raw))
    record = {'file': encrypted.name, 'plain_bytes': len(raw), 'plain_sha256': sha256(raw),
              'encrypted_bytes': encrypted.stat().st_size, 'encrypted_sha256': sha256(encrypted.read_bytes())}
    path.unlink()
    return record


def decrypt_archive(directory, record, key):
    from cryptography.fernet import Fernet
    name = record['file']
    if Path(name).name != name or '/' in name or '\\' in name or not name.endswith('.fernet'):
        raise ValueError('Invalid archive filename.')
    source = Path(directory) / name
    if source.stat().st_size > 2 * MAX_ARCHIVE:
        raise Blocked('Encrypted archive exceeds the laboratory size limit.')
    encrypted = source.read_bytes()
    if sha256(encrypted) != record['encrypted_sha256']:
        raise ValueError('Encrypted archive checksum mismatch.')
    raw = Fernet(key).decrypt(encrypted)
    if sha256(raw) != record['plain_sha256'] or len(raw) != record['plain_bytes']:
        raise ValueError('Plain archive checksum/size mismatch.')
    return raw


def assert_local_engine(host):
    # Reject SSH/TCP tunnels to the VM or a shared engine, even localhost TCP.
    if not (host.startswith('unix://') or host.startswith('npipe://')):
        raise Blocked('Use a local Docker socket/Desktop, not a remote Docker engine.')


def require_space(free_bytes):
    if free_bytes < MIN_FREE:
        raise Blocked('At least 8 GiB free is required on both host and Docker storage.')


def verify_equal(source, restored):
    if canonical(source) != canonical(restored):
        raise RuntimeError('Restored contents/schema/indexes/sequences differ from the source snapshot.')


def identifier(name):
    return '"' + name.replace('"', '""') + '"'

def normalize_pg_constraint(definition):
    """Normalize equivalent casts of varchar literal arrays to text arrays."""
    literal = r"'(?:[^']|'')*'::character varying"
    array_cast = rf"\(ARRAY\[({literal}(?:, {literal})*)\]\)::text\[\]"

    def replace(match):
        items = re.findall(literal, match.group(1))
        return 'ARRAY[' + ', '.join(
            f'({item})::text' for item in items
        ) + ']'

    return re.sub(array_cast, replace, definition)

class Runner:
    def __init__(self, output):
        self.run_id = 'kontrol-p2-' + datetime.now(timezone.utc).strftime('%Y%m%dt%H%M%Sz') + '-' + secrets.token_hex(6)
        assert RUN_PATTERN.fullmatch(self.run_id)
        self.output = Path(output).resolve() / self.run_id
        self.output.mkdir(parents=True, exist_ok=False, mode=0o700)
        self.backups = self.output / 'private'
        self.backups.mkdir(mode=0o700)
        self.containers = []
        self.volumes = []
        self.network = None
        self.report = {
            'format': 'kontrol-p2-restore-evidence-v1', 'run_id': self.run_id,
            'started_at_utc': utc_now(),
            # Guatemala uses UTC-06; avoid depending on a system tz database on Windows.
            'started_at_guatemala': datetime.now(timezone(timedelta(hours=-6))).isoformat(),
            'status': 'started', 'scope': 'synthetic isolated PostgreSQL and MongoDB; not production',
            'production_accessed': False, 'shared_test_accessed': False,
            'restoration_started': False, 'restoration_verified': False,
            'rpo_production_verified': False, 'rto_production_verified': False,
            'policy_rpo_hours': 6, 'policy_rto_hours': 4,
            'source_schema_sha256': sha256((ROOT / 'backend/kontrol.sql').read_bytes()),
            'not_recovered': [
                'UploadThing binary objects (only database references)',
                'PostgreSQL cluster roles, passwords, ownership and grants',
                'MongoDB users/roles outside the selected database',
                'VM, TLS private keys, environment secrets, logs and external providers',
                'Application bootstrap migrations not present in backend/kontrol.sql',
            ],
            'steps': [],
        }
        self.started = time.monotonic()

    def command(self, args, *, data=None, output=None, timeout=300, record=True):
        start = time.monotonic()
        result = subprocess.run(args, input=data, stdout=output or subprocess.PIPE,
                                stderr=subprocess.PIPE, timeout=timeout, check=False)
        if record:
            self.report['steps'].append({'tool': args[0], 'action': ' '.join(args[1:4]),
                'exit_code': result.returncode, 'seconds': round(time.monotonic() - start, 3)})
        if result.returncode:
            # Do not copy arbitrary database/tool stderr into a report intended for git.
            raise RuntimeError(f'{args[0]} failed with exit code {result.returncode}; action: {args[1:4]}')
        return result.stdout or b''

    def docker(self, *args, **kwargs):
        return self.command(['docker', *args], **kwargs)

    def preflight(self):
        self.report['host_free_bytes_before'] = shutil.disk_usage(self.output).free
        require_space(self.report['host_free_bytes_before'])
        try:
            from cryptography.fernet import Fernet  # noqa: F401
        except ImportError as error:
            raise Blocked('Install scripts/backups/requirements.txt first.') from error
        if not shutil.which('docker'):
            raise Blocked('Docker is not installed. No database restoration was executed.')
        if os.environ.get('DOCKER_HOST'):
            assert_local_engine(os.environ['DOCKER_HOST'])
        context = json.loads(self.docker('context', 'inspect'))[0]
        assert_local_engine(context['Endpoints']['docker']['Host'])
        info = json.loads(self.docker('info', '--format', '{{json .}}'))
        self.report['docker_memory_bytes'] = info.get('MemTotal', 0)
        if info.get('MemTotal', 0) < 4 * 1024**3:
            raise Blocked('At least 4 GiB of Docker memory is required for this isolated drill.')
        self.docker('pull', PG_IMAGE, timeout=600)
        self.docker('pull', MONGO_IMAGE, timeout=600)
        self.report['image_ids'] = {
            image: self.docker('image', 'inspect', '--format', '{{.Id}}', image).decode().strip()
            for image in [PG_IMAGE, MONGO_IMAGE]
        }
        # This temporary anonymous volume is removed by --rm. It measures the
        # Docker data filesystem, which can differ from the host on Desktop.
        space = self.docker('run', '--rm', '--network', 'none', '--entrypoint', '/bin/df',
                            PG_IMAGE, '-Pk', '/var/lib/postgresql/data').decode().splitlines()[-1].split()
        self.report['docker_free_bytes_before'] = int(space[3]) * 1024
        require_space(self.report['docker_free_bytes_before'])

    def create_network(self):
        name = self.run_id + '-net'
        self.docker('network', 'create', '--internal', '--label', 'kontrol.p2.run=' + self.run_id, name)
        self.network = name

    def start_database(self, kind, side):
        name = self.run_id + '-' + side + '-' + kind
        volume = name + '-data'
        self.docker('volume', 'create', '--label', 'kontrol.p2.run=' + self.run_id, volume)
        self.volumes.append(volume)
        args = ['run', '-d', '--name', name, '--network', self.network,
                '--label', 'kontrol.p2.run=' + self.run_id, '--cpus', '1',
                '--memory', '768m', '--pids-limit', '256']
        if kind == 'pg':
            args += ['-e', 'POSTGRES_USER=p2drill', '-e', 'POSTGRES_DB=' + DB,
                     '-e', 'POSTGRES_HOST_AUTH_METHOD=trust',
                     '-v', volume + ':/var/lib/postgresql/data', PG_IMAGE]
        else:
            args += ['-v', volume + ':/data/db', MONGO_IMAGE,
                     '--bind_ip_all', '--wiredTigerCacheSizeGB', '0.25']
        # Docker may create the container even when starting it fails.
        self.containers.append(name)
        self.docker(*args)
        deadline = time.monotonic() + 90
        while True:
            try:
                if kind == 'pg':
                    # The entrypoint's temporary init server only listens on a Unix
                    # socket. Wait for the final TCP server before loading fixtures.
                    self.docker('exec', name, 'pg_isready', '-h', '127.0.0.1', '-U', 'p2drill', '-d', DB, timeout=5, record=False)
                else:
                    self.mongo(name, "print(db.adminCommand({ping:1}).ok)", record=False)
                break
            except (RuntimeError, subprocess.TimeoutExpired):
                if time.monotonic() >= deadline:
                    raise RuntimeError('Disposable database did not become ready in 90 seconds.')
                time.sleep(1)
        return name

    def sql(self, container, sql):
        return self.docker('exec', '-i', container, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1',
                           '-U', 'p2drill', '-d', DB, data=sql.encode())

    def mongo(self, container, javascript, record=True):
        # --file /dev/stdin avoids the interactive shell's prompts.
        return self.docker('exec', '-i', container, 'mongosh', '--quiet', '--file', '/dev/stdin',
                           data=javascript.encode(), record=record)

    def pg_inventory(self, container):
        tables = self.sql(container, "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;").decode().splitlines()
        inventory = {'tables': [], 'sequences': {}}
        for table in tables:
            raw = self.sql(container, f'COPY (SELECT row_to_json(t)::text FROM public.{identifier(table)} t ORDER BY row_to_json(t)::text) TO STDOUT;')
            inventory['tables'].append({'name': table, 'rows': raw.count(b'\n'), 'sha256': sha256(raw)})
        for name in self.sql(container, "SELECT sequencename FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename;").decode().splitlines():
            inventory['sequences'][name] = self.sql(container, f'SELECT last_value,is_called FROM public.{identifier(name)};').decode().strip()
        definitions = """
SELECT json_build_object(
 'columns',(SELECT json_agg(c ORDER BY table_name,ordinal_position) FROM
   (SELECT table_name,column_name,ordinal_position,data_type,is_nullable,column_default
    FROM information_schema.columns WHERE table_schema='public') c),
 'constraints',(SELECT json_agg(c ORDER BY relation,name) FROM
   (SELECT r.relname AS relation,c.conname AS name,c.contype AS type,pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace
    WHERE n.nspname='public') c),
 'indexes',(SELECT json_agg(i ORDER BY tablename,indexname) FROM
   (SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public') i));
"""
        inventory['definitions'] = json.loads(self.sql(container, definitions))

        for constraint in inventory['definitions'].get('constraints') or []:
            if constraint['type'] == 'c':
                constraint['definition'] = normalize_pg_constraint(
                    constraint['definition']
                )

        return inventory

    def mongo_inventory(self, container):
        return json.loads(self.mongo(container, (HERE / 'mongo-inventory.js').read_text(encoding='utf-8')))

    def label_owned(self, kind, name):
        if not name.startswith(self.run_id + '-') or not RUN_PATTERN.fullmatch(self.run_id):
            raise RuntimeError('Refusing to remove a resource outside this run.')
        value = json.loads(self.docker(kind, 'inspect', name))[0]
        labels = value.get('Config', {}).get('Labels') if kind == 'container' else value.get('Labels')
        if (labels or {}).get('kontrol.p2.run') != self.run_id:
            raise RuntimeError('Refusing to remove a resource with another owner label.')

    def remove_container(self, name):
        self.label_owned('container', name)
        self.docker('rm', '-f', '-v', name)
        self.containers.remove(name)

    def remove_volume(self, name):
        self.label_owned('volume', name)
        self.docker('volume', 'rm', name)
        self.volumes.remove(name)

    def execute(self):
        from cryptography.fernet import Fernet
        self.create_network()
        source_pg = self.start_database('pg', 'source')
        source_mongo = self.start_database('mongo', 'source')
        self.sql(source_pg, (ROOT / 'backend/kontrol.sql').read_text(encoding='utf-8'))
        self.sql(source_pg, (HERE / 'seed.sql').read_text(encoding='utf-8'))
        self.mongo(source_mongo, (HERE / 'mongo-seed.js').read_text(encoding='utf-8'))
        source = {'postgres': self.pg_inventory(source_pg), 'mongo': self.mongo_inventory(source_mongo)}
        if not source['postgres']['tables'] or len(source['mongo']) != 4:
            raise RuntimeError('Fixtures did not initialize the expected source.')
        self.report['source_snapshot'] = source
        self.report['source_versions'] = {
            'postgres': self.sql(source_pg, 'SELECT version();').decode().strip(),
            'mongo': self.mongo(source_mongo, 'print(db.version())').decode().strip(),
        }
        key = Fernet.generate_key()
        private_write(self.backups / 'restore.key', key)
        manifest = []
        backup_start = time.monotonic()
        for name, command in [
            ('postgres.dump', ['exec', source_pg, 'pg_dump', '-U', 'p2drill', '-d', DB, '-Fc', '--no-owner', '--no-acl']),
            ('mongo.archive.gz', ['exec', source_mongo, 'mongodump', '--db', DB, '--archive', '--gzip']),
        ]:
            target = self.backups / name
            with target.open('xb') as output:
                os.chmod(target, 0o600)
                self.docker(*command, output=output)
            manifest.append(encrypt_archive(target, key))
        self.report['backup_seconds'] = round(time.monotonic() - backup_start, 3)
        self.report['backup_completed_at_utc'] = utc_now()
        self.report['archives'] = manifest
        private_write(self.backups / 'manifest.json', (canonical(manifest) + '\n').encode())
        # Deliberately write AFTER the backup to demonstrate what is not recovered.
        self.sql(source_pg, "INSERT INTO public.usuario(nombre,apellido,email,id_rol) SELECT 'Post backup','P2','post-backup@example.test',id_rol FROM public.rol WHERE nombre_rol='usuario';")
        self.mongo(source_mongo, "db.getSiblingDB('kontrol_p2_drill').messages.insertOne({p2_post_backup:true,text:'deliberately absent from backup'});")
        self.report['deliberate_post_backup_loss'] = {'postgres_rows': 1, 'mongo_documents': 1}
        incident = time.monotonic()
        self.report['incident_at_utc'] = utc_now()
        for container in [source_pg, source_mongo]:
            self.remove_container(container)
            self.remove_volume(container + '-data')
        self.report['source_removed_before_restore'] = True
        dest_pg = self.start_database('pg', 'restore')
        dest_mongo = self.start_database('mongo', 'restore')
        if self.pg_inventory(dest_pg)['tables'] or self.mongo_inventory(dest_mongo):
            raise RuntimeError('Restore destination must be newly created and empty.')
        self.report['destination_empty_verified'] = True
        self.report['restoration_started'] = True
        restore_start = time.monotonic()
        pg_bytes = decrypt_archive(self.backups, manifest[0], key)
        mongo_bytes = decrypt_archive(self.backups, manifest[1], key)
        self.docker('exec', '-i', dest_pg, 'pg_restore', '--exit-on-error', '--single-transaction',
                    '--no-owner', '--no-acl', '-U', 'p2drill', '-d', DB, data=pg_bytes)
        self.docker('exec', '-i', dest_mongo, 'mongorestore', '--archive', '--gzip', '--stopOnError', data=mongo_bytes)
        self.report['restore_seconds'] = round(time.monotonic() - restore_start, 3)
        restored = {
            'postgres': self.pg_inventory(dest_pg),
            'mongo': self.mongo_inventory(dest_mongo),
        }

        self.report['restored_snapshot'] = restored
        self.report['comparison'] = {
            'postgres_equal': canonical(source['postgres']) == canonical(restored['postgres']),
            'mongo_equal': canonical(source['mongo']) == canonical(restored['mongo']),
        }

        verify_equal(source, restored)
        if self.sql(dest_pg, "SELECT count(*) FROM public.usuario WHERE email='post-backup@example.test';").strip() != b'0':
            raise RuntimeError('Unexpected post-backup PostgreSQL row was recovered.')
        if self.mongo(dest_mongo, "print(db.getSiblingDB('kontrol_p2_drill').messages.countDocuments({p2_post_backup:true}))").strip() != b'0':
            raise RuntimeError('Unexpected post-backup MongoDB document was recovered.')
        # Business joins and totals prove FK-dependent data remains usable.
        totals = self.sql(dest_pg, 'SELECT count(*),sum(total) FROM public.venta v JOIN public.empresa e USING(id_empresa) JOIN public.usuario u USING(id_usuario);').decode().strip()
        if totals != '2|102':
            raise RuntimeError('Restored business totals do not match the fixture.')
        self.report['business_smoke'] = {'sales': 2, 'total': '102'}
        self.report['recovery_with_validation_seconds'] = round(time.monotonic() - incident, 3)
        self.report['restoration_verified'] = True
        self.report['status'] = 'restored_verified_lab'

    def cleanup(self):
        failures = []
        for name in list(reversed(self.containers)):
            try:
                self.remove_container(name)
            except Exception:
                failures.append(name)
        for name in list(reversed(self.volumes)):
            try:
                self.remove_volume(name)
            except Exception:
                failures.append(name)
        if self.network:
            try:
                self.label_owned('network', self.network)
                self.docker('network', 'rm', self.network)
            except Exception:
                failures.append(self.network)
        self.report['cleanup_complete'] = not failures
        self.report['remaining_owned_resources'] = failures
        return failures

    def finish(self):
        self.report['finished_at_utc'] = utc_now()
        self.report['total_attempt_seconds'] = round(time.monotonic() - self.started, 3)
        self.report['host_free_bytes_after'] = shutil.disk_usage(self.output).free
        # Only allow-listed tool metadata/counts/hashes are retained, not stderr or dumps.
        (self.output / 'evidence.json').write_text(
            json.dumps(self.report, indent=2, ensure_ascii=False) + '\n',
            encoding='utf-8',
        )
        verified = self.report['restoration_verified']
        text = '\n'.join([
            '# P-2 · Evidencia de intento de restauración', '',
            f"Estado: **{self.report['status']}**", '',
            f"Inicio Guatemala: {self.report['started_at_guatemala']}",
            f"Fin UTC: {self.report['finished_at_utc']}",
            f"Restauración iniciada: {'sí' if self.report['restoration_started'] else 'no'}.",
            f"Restauración verificada: {'sí' if verified else 'no'}.",
            f"Bloqueo/error: {self.report.get('blocker', self.report.get('failure', 'ninguno'))}",
            f"Restauración (segundos): {self.report.get('restore_seconds', 'no medida')}",
            f"Recuperación con validación (segundos): {self.report.get('recovery_with_validation_seconds', 'no medida')}", '',
            'Alcance: bases sintéticas aisladas. No verifica copias ni RPO/RTO de producción.',
            'Ver evidence.json para conteos, huellas, índices, secuencias, exclusiones y pasos.', '',
            'No adjuntar el directorio private: contiene claves y respaldos.', '',
        ])
        (self.output / 'evidence.md').write_text(text, encoding='utf-8')

    def run(self):
        code = 0
        try:
            self.preflight()
            self.execute()
        except Blocked as error:
            self.report.update(status='blocked', blocker=str(error))
            code = 2
        except Exception as error:
            self.report.update(status='failed', error_type=type(error).__name__, failure=str(error))
            code = 1
        finally:
            if self.cleanup():
                code = 1
                self.report['status'] = 'cleanup_failed'
            self.finish()
        print(f"{self.report['status']}: {self.output / 'evidence.json'}")
        return code


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / '.backups-local')
    args = parser.parse_args()
    return Runner(args.output).run()


if __name__ == '__main__':
    sys.exit(main())
