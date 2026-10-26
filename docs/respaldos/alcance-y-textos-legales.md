# Exclusiones y redacción sustentada para L-1/L-2

## Qué queda sin respaldo/restauración acreditados

| Activo | Lo previsto / lo probado | Límite |
| --- | --- | --- |
| Datos PostgreSQL/Mongo | Herramienta preparada; restauración aún bloqueada | No hay copia productiva ni recuperación verificada en esta entrega |
| Binarios de UploadThing | Referencias dentro de las bases | No se copian/restauran bytes. La prueba usa una URL ficticia y no descarga archivos |
| Roles globales, contraseñas de motor, propietarios y permisos | El laboratorio crea su propio usuario; usa `--no-owner --no-acl` | No acredita recuperación de autenticación/roles del cluster. `pg_dump` no sustituye un respaldo de objetos globales |
| Usuarios/roles de administración Mongo | Solo se respalda la base ficticia | No se recuperan cuentas/roles externos a ella |
| Bootstrap/migraciones fuera de `backend/kontrol.sql` | El laboratorio carga el SQL versionado | No acredita igualdad con el esquema desplegado ni tablas añadidas al iniciar backend |
| Secretos y certificados | No incluidos | Deben reaprovisionarse desde custodia separada; no ponerlos en Git |
| VM, proxy, DNS, sistema operativo, logs | No incluidos | No hay restauración de disco completo, servicio web o recuperación de historial de logs |
| Correo, identidad externa, IA y demás proveedores | Fuera de las dos bases | No se respalda el estado/control del proveedor |
| Cambios posteriores al snapshot | Se introduce deliberadamente una fila y un documento tardíos | Quedan fuera; no hay PITR/WAL/oplog probado |
| Bajas posteriores al snapshot | Requieren reaplicación antes de habilitar una recuperación | Registro independiente y ejecución operativa no acreditados; P-1 no se fusiona con este cambio |

## Texto que corresponde al estado actual

Estos párrafos describen medidas técnicas verificadas/documentadas, no sustituyen
la revisión jurídica ni aprueban publicar los documentos legales.

**L-1 — Términos, disponibilidad y recuperación:**

Se ha definido un procedimiento de respaldo y restauración de las bases de datos.
Su ejecución de prueba aún no ha podido completarse, por lo que no se afirma que
exista recuperación verificada ni se garantizan tiempos de recuperación o una
pérdida máxima de datos. La cobertura de copias de los proveedores y de archivos
adjuntos no está acreditada.

**L-2 — Privacidad, medidas de protección y copias:**

La política técnica propuesta contempla copias cifradas con acceso restringido y
retención limitada. Su operación y restauración aún están pendientes de verificación.
No se afirma que los archivos adjuntos estén respaldados ni que la supresión de
una cuenta elimine inmediatamente todas las copias anteriores. La cobertura y
retención efectivas se documentarán al comprobar el proceso.

El intento bloqueado no permite afirmar «se realizan copias cada 4 h», «retención
activa de 28 días», «RPO garantizado de 6 h», «RTO garantizado de 4 h» ni «restauración
probada». Los valores de la política son objetivos elegidos, todavía sin operación
ni medición productivas acreditadas.

## Tras un futuro éxito del laboratorio

Solo después de adjuntar el informe se podrá informar la fecha, motores, alcance
sintético y duración exactos, manteniendo expresamente que no valida producción,
archivos externos ni RPO/RTO productivos. No se incluye aquí un texto en pasado con
fechas o tiempos ficticios para evitar publicarlo por accidente.

Para afirmar que existe un proceso operativo, contrastar la programación real,
ubicación, retención/purga, acceso, custodia de claves y una restauración del alcance
real con su informe. Entonces actualizar L-1/L-2 con esos hechos y sus exclusiones.
