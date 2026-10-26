# Política propuesta de respaldo y recuperación — versión 1

**Estado:** definida para revisión y activación. No está acreditada como operativa.
No hay restauración verificada en esta entrega. Esta política no constituye un SLA.

## Alcance

Respaldar el contenido completo de la base PostgreSQL de Kontrol (esquema, datos,
secuencias, índices, restricciones y demás objetos de aplicación) y de su base
Mongo (colecciones, documentos, índices y opciones). Incluir tablas/colecciones
nuevas sin listas restrictivas. Cuando se integre P-1, incluir también outbox y
marcas de eliminación; esta entrega de `develop` no contiene ese código.

Un respaldo operativo contiene datos sensibles y hashes de contraseña: no es la
exportación de privacidad de P-1. Debe permanecer cifrado y restringido. No adjuntar
sus bytes, claves ni datos a Git/PR/artifacts públicos. Las exclusiones están
[enumeradas por separado](alcance-y-textos-legales.md).

## Objetivos elegidos y fundamento

| Objetivo | Valor | Justificación y cómo se comprueba |
| --- | --- | --- |
| RPO: antigüedad máxima del último punto recuperable | **6 horas** | Límite técnico inicial de pérdida para movimientos de inventario/ventas/chat. Evita proponer 24 h de pérdida; a falta de WAL/PITR probado, permite copias lógicas con recursos acotados. Programar cada 4 h deja 2 h para detección, reintento y traslado. Medir edad del snapshot realmente recuperable, no del inicio del último job. Requiere validación del negocio: si 6 h de ventas es inaceptable, adoptar un objetivo menor y un mecanismo adecuado. |
| RTO: tiempo desde que se declara el incidente hasta servicio validado | **4 horas** | Presupuesto inicial: 30 min evaluación, 30 min destino, 60 min obtención/restauración, 60 min validación, 30 min habilitación y 30 min margen. El tamaño real y las dependencias no se midieron: el valor es objetivo, no garantía. Cronometrar hasta que los flujos de aplicación estén disponibles, no solo hasta terminar `pg_restore`. |

El antecedente de disco lleno favorece copias fuera de la VM y un destino de
recuperación independiente. No justifica prometer estos tiempos sin medirlos.
Si se superan, registrar incumplimiento y corregir capacidad/frecuencia/proceso;
no ajustar el informe para aparentar cumplimiento.

## Operación prevista

| Aspecto | Decisión |
| --- | --- |
| Frecuencia | Cada 4 h, a las 00:00, 04:00, 08:00, 12:00, 16:00 y 20:00 de `America/Guatemala`; 06:00, 10:00, 14:00, 18:00, 22:00 y 02:00 UTC |
| Retención | 28 días desde captura; hasta 168 juegos completos PG+Mongo. No se propone retención indefinida. Borrado por ciclo de vida revisado y comprobado, también en versiones de objetos |
| Ubicación | Bucket privado de Google Cloud Storage, fuera del disco de la VM, en proyecto/cuenta administrativa de respaldo con permisos separados. Nombre, región y cuenta concretos pendientes de configuración; no se afirma que ya exista |
| Protección | Cifrado antes del traslado, TLS, acceso mínimo y registro de acceso. Clave en gestor de secretos independiente del bucket y custodia de recuperación separada. No guardar clave junto con la copia productiva |
| Responsable | Rol de Infraestructura: programar, comprobar éxito/espacio, custodiar y restaurar. Suplente: líder técnico. Backend/datos valida integridad; responsable del servicio decide recuperación. Nombres y canal operativo: asignación pendiente |
| Monitoreo | Revisar cada ejecución. Reintentar al fallar; alertar al operador en 15 min. Edad del último juego verificable > 5 h: alerta preventiva; > 6 h: incumplimiento del RPO. No hay monitor ni canal activados por este commit |
| Prueba periódica | Una restauración mensual en destino separado, y otra tras cambios de esquema, motor, cifrado o destino. Versionar evidencia sin datos; el workflow incorporado es manual/por PR, no una programación productiva |
| Evidencia | Conservar informes sanitizados durante 12 meses en el repositorio; los artifacts de CI caducan a 30 días, por lo que deben descargarse y revisarse antes |

## Consistencia entre bases

`pg_dump` produce una instantánea consistente de **una base PostgreSQL**; no crea
una transacción distribuida con MongoDB. Capturar un juego requiere bloquear
escrituras de la aplicación y trabajadores, drenar las operaciones en curso,
registrar inicio/fin y capturar ambas bases durante la misma ventana sin escrituras.
Reabrir al terminar ambas capturas; cifrado/traslado pueden ocurrir después. Si una
captura falla, invalidar el juego y reintentar; no unir copias de horas diferentes.
La pausa debe diseñarse y medirse antes de activar una frecuencia de 4 h.

La prueba sintética cumple esa condición porque ningún otro proceso escribe en
sus fuentes. `mongodump --db` no debe combinarse con `--oplog`; para un respaldo
con oplog se necesita otro alcance y procedimiento compatible. Si el servicio
requiere continuidad sin pausa, elegir y probar PITR/snapshots coordinados; no
presuponer esa capacidad por usar Atlas.

## Espacio, retención y bajas

Antes de capturar/restaurar verificar tamaño lógico, tamaño de copias e índices,
espacio temporal y al menos 30 % de margen en destino. El mínimo fijo del laboratorio
es 8 GiB libres en host y Docker y 4 GiB de RAM; no dimensiona producción. No ejecutar
el simulacro sobre la VM con antecedentes de disco lleno. Descargar y procesar en
el runner/equipo separado, no acumular 28 días de copias en producción.

Las copias previas pueden contener cuentas después eliminadas hasta su caducidad.
Antes de habilitar una restauración operativa, reaplicar las bajas ocurridas después
del snapshot desde un registro de supresión conservado aparte y verificado; el
registro y la automatización no se implementan aquí. Revocar sesiones/credenciales
cuando corresponda. No reabrir el servicio sin esa revisión ni prometer borrado
inmediato de todas las copias. Si ese registro no existe, hay un bloqueo operativo.

## Condiciones de activación

Asignar responsables, validar tolerancia a pérdida, confirmar fuente/proveedores,
provisionar bucket/IAM/clave, implementar programación y alertas, medir ventana de
consistencia y capacidad, probar ciclo de vida y ejecutar restauración representativa
con validación de aplicación. El script de laboratorio prueba mecanismos; no instala
estos controles productivos. El alcance de P-2 no autoriza un deploy ni tocar las
bases compartidas.

Fuentes técnicas: [PostgreSQL 16: pg_dump](https://www.postgresql.org/docs/16/app-pgdump.html),
[PostgreSQL: backup lógico](https://www.postgresql.org/docs/16/backup-dump.html),
[MongoDB: mongodump](https://www.mongodb.com/docs/database-tools/mongodump/).
