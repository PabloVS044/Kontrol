"""Unit checks for the drill's safety/integrity. They do not replace a restore."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from cryptography.fernet import Fernet, InvalidToken

SCRIPT = Path(__file__).resolve().parents[2] / 'scripts/backups/drill.py'
spec = importlib.util.spec_from_file_location('drill', SCRIPT)
drill = importlib.util.module_from_spec(spec)
spec.loader.exec_module(drill)


class ArchiveIntegrity(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name)
        self.key = Fernet.generate_key()
        self.raw = b'Binary synthetic dump\x00\x01\xff\n' * 30
        self.plain = self.folder / 'postgres.dump'
        self.plain.write_bytes(self.raw)
        self.record = drill.encrypt_archive(self.plain, self.key)

    def test_round_trip_removes_plaintext(self):
        self.assertFalse(self.plain.exists())
        self.assertEqual(drill.decrypt_archive(self.folder, self.record, self.key), self.raw)
        self.assertNotIn(self.key.decode(), json.dumps(self.record))

    def test_changed_ciphertext_rejected(self):
        path = self.folder / self.record['file']
        path.write_bytes(path.read_bytes()[:-1] + b'X')
        with self.assertRaisesRegex(ValueError, 'Encrypted archive checksum'):
            drill.decrypt_archive(self.folder, self.record, self.key)

    def test_authentication_still_required_if_checksum_changed(self):
        path = self.folder / self.record['file']
        data = bytearray(path.read_bytes())
        data[50] = ord('A') if data[50] != ord('A') else ord('B')
        path.write_bytes(data)
        self.record['encrypted_sha256'] = drill.sha256(data)
        with self.assertRaises(InvalidToken):
            drill.decrypt_archive(self.folder, self.record, self.key)

    def test_wrong_key_rejected(self):
        with self.assertRaises(InvalidToken):
            drill.decrypt_archive(self.folder, self.record, Fernet.generate_key())

    def test_plaintext_digest_and_size_checked(self):
        for name, value in [('plain_sha256', '0' * 64), ('plain_bytes', 0)]:
            with self.subTest(name=name), self.assertRaisesRegex(ValueError, 'Plain archive checksum'):
                drill.decrypt_archive(self.folder, {**self.record, name: value}, self.key)

    def test_manifest_cannot_read_outside_directory(self):
        for name in ['../backup.fernet', '/backup.fernet', '..\\backup.fernet', 'wrong.dump']:
            with self.subTest(name=name), self.assertRaises(ValueError):
                drill.decrypt_archive(self.folder, {**self.record, 'file': name}, self.key)

    def test_lab_limit_prevents_unbounded_encryption(self):
        other = self.folder / 'large.dump'
        other.write_bytes(b'12345')
        with patch.object(drill, 'MAX_ARCHIVE', 4), self.assertRaises(drill.Blocked):
            drill.encrypt_archive(other, self.key)
        self.assertTrue(other.exists())

    def test_lab_limit_prevents_unbounded_decryption(self):
        with patch.object(drill, 'MAX_ARCHIVE', 4), self.assertRaises(drill.Blocked):
            drill.decrypt_archive(self.folder, self.record, self.key)


class SafetyAndEvidence(unittest.TestCase):
    def test_only_local_engine(self):
        for host in ['unix:///var/run/docker.sock', 'npipe:////./pipe/docker_engine']:
            drill.assert_local_engine(host)
        for host in ['ssh://vm', 'tcp://localhost:2375', 'tcp://production:2376', '', 'https://host']:
            with self.subTest(host=host), self.assertRaises(drill.Blocked):
                drill.assert_local_engine(host)

    def test_capacity_boundary(self):
        drill.require_space(drill.MIN_FREE)
        with self.assertRaises(drill.Blocked):
            drill.require_space(drill.MIN_FREE - 1)

    def test_inventory_detects_missing_data_indexes_and_sequences(self):
        snapshot = {'tables': [{'name': 'usuario', 'rows': 4, 'sha256': 'abc'}],
                    'indexes': ['one'], 'sequence': '4|t'}
        drill.verify_equal(snapshot, dict(reversed(list(snapshot.items()))))
        for field in snapshot:
            changed = {**snapshot, field: None}
            with self.subTest(field=field), self.assertRaises(RuntimeError):
                drill.verify_equal(snapshot, changed)

    def test_sql_identifier_quotes_unsafe_name(self):
        self.assertEqual(drill.identifier('a"; drop table usuario;--'), '"a""; drop table usuario;--"')

    def test_blocked_run_does_not_claim_restore(self):
        with tempfile.TemporaryDirectory() as folder:
            runner = drill.Runner(folder)
            with patch.object(runner, 'preflight', side_effect=drill.Blocked('No Docker')), \
                    patch.object(runner, 'execute') as execute, patch('builtins.print'):
                self.assertEqual(runner.run(), 2)
                execute.assert_not_called()
            report = json.loads((runner.output / 'evidence.json').read_text())
            self.assertEqual(report['status'], 'blocked')
            self.assertFalse(report['restoration_started'])
            self.assertFalse(report['restoration_verified'])
            self.assertNotIn('restore_seconds', report)
            self.assertNotIn('recovery_with_validation_seconds', report)
            self.assertFalse(report['production_accessed'])

    def test_cleanup_requires_name_and_owner_label(self):
        with tempfile.TemporaryDirectory() as folder:
            runner = drill.Runner(folder)
            with patch.object(runner, 'docker') as docker:
                with self.assertRaisesRegex(RuntimeError, 'outside this run'):
                    runner.label_owned('container', 'production-postgres')
                docker.assert_not_called()
                docker.return_value = b'[{"Config":{"Labels":{"kontrol.p2.run":"someone-else"}}}]'
                with self.assertRaisesRegex(RuntimeError, 'another owner'):
                    runner.label_owned('container', runner.run_id + '-source-pg')
                docker.return_value = json.dumps([{'Config': {'Labels': {'kontrol.p2.run': runner.run_id}}}]).encode()
                runner.label_owned('container', runner.run_id + '-source-pg')

    def test_cleanup_failure_is_nonzero_even_after_restore(self):
        with tempfile.TemporaryDirectory() as folder:
            runner = drill.Runner(folder)
            def restored():
                runner.report.update(status='restored_verified_lab', restoration_verified=True)
            with patch.object(runner, 'preflight'), patch.object(runner, 'execute', side_effect=restored), \
                    patch.object(runner, 'cleanup', return_value=['owned-container']), patch('builtins.print'):
                self.assertEqual(runner.run(), 1)
            report = json.loads((runner.output / 'evidence.json').read_text())
            self.assertEqual(report['status'], 'cleanup_failed')
            self.assertTrue(report['restoration_verified'])


if __name__ == '__main__':
    unittest.main()
