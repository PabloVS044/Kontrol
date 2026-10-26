# Estado actual de los respaldos

Revisión documental: 25/10/2026, Guatemala. Fuente: ZIP de `develop` entregado.
No se accedió a la VM, al panel de Atlas, a Supabase ni a UploadThing. La fecha
del último estado de despliegue documentado es 14/10/2026; no es una medición actual.

| Activo | Lo que acredita el repositorio | Copia, frecuencia, ubicación y retención actuales | Responsable / restauraciones anteriores |
| --- | --- | --- | --- |
| PostgreSQL productivo | PostgreSQL 16 en Docker, VM Google Cloud, volumen `kontrol_postgres_data` | No se encontró job de respaldo en scripts/Compose/workflows. Copias externas al repo: desconocidas. El volumen no es copia independiente | Operador nominal y restauración anterior: no acreditados |
| MongoDB | MongoDB Atlas externo; chat e IA | Plan, snapshots, frecuencia, retención, región y accesos efectivos: desconocidos; no se infieren del nombre Atlas | No hay evidencia versionada de restauración |
| Antiguo PostgreSQL de pruebas | Supabase gratuito, excedió cuota; ambiente retirado el 14/10 según despliegue | No corresponde al PostgreSQL productivo documentado; no contar sus posibles copias como cobertura productiva | No acreditado |
| Archivos adjuntos | UploadThing; SQL/Mongo guardan referencias, no necesariamente bytes | No se encontró exportación/copia propia de los binarios ni política de retención comprobada | No acreditado |
| Código/configuración declarativa | Versionados en Git; Compose y documentación | El ZIP es una instantánea sin historial `.git`. Git no respalda las bases, secretos ni archivos externos | Historial/remoto: comprobar en el clon del equipo |
| Secretos, TLS, logs, VM | `.env` externo, volúmenes del proxy/DB y logs | Copia fuera de la VM, snapshots de disco, claves y retención: desconocidos | No acreditado |

## Capacidad e impedimentos

`docs/despliegue-produccion.md` registra ocupación del disco del 98 % (26/09),
100 % (01/10) y aproximadamente 77 % (14/10, unos 2 GB libres). Son antecedentes,
no espacio disponible hoy. La prueba no debe ejecutarse en esa VM ni en el entorno
compartido. Se eligió un runner hospedado de GitHub o un equipo independiente.

El preflight ejecutado en este entorno encontró 30 931 714 048 bytes libres en el
host (aprox. 28.8 GiB), pero **Docker no está instalado**. No pudo medir disco/RAM
de Docker ni iniciar motores. La disponibilidad de espacio del host no elimina
ese bloqueo. El reporte exacto está en [evidencias](evidencias/README.md).

## Fuentes versionadas

- `docs/despliegue-produccion.md`: arquitectura y fechas; problemas de espacio;
  retiro del entorno de pruebas y de la dependencia de Supabase para ese entorno.
- `docker-compose.prod.yml`: PostgreSQL local, Mongo externo, volúmenes y servicios.
- `backend/kontrol.sql` y `backend/src/db/`: esquema base y cambios de bootstrap.
- `backend/src/models/`: colecciones Mongo de chat e IA.
- `docs/legal/inventario-datos.md`, `politica-privacidad.md` y
  `terminos-condiciones.md`: cobertura de copias no acreditada y proveedores.
- `.github/workflows/` y `scripts/` antes de este cambio: sin procedimiento de
  respaldo/restauración probado encontrado.

## Verificaciones que requieren acceso del operador

Registrar respuestas con fecha y evidencia sin secretos: proyecto/cluster real,
versión y tamaño de cada base, plan de Atlas, backups habilitados, último éxito,
frecuencia/retención, región de copia, bucket o snapshots existentes, IAM y nombre
del responsable y suplente. Preguntar si hubo una restauración anterior y adjuntar
su informe. Verificar si el esquema desplegado incluye bootstrap y cambios aún no
presentes en el SQL base. Si no hay evidencia, conservar «desconocido/no acreditado».
No reemplazarlo por «no existe» solo por no estar en el repositorio.
