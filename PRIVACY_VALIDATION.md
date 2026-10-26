# Privacidad P1: correcciones y validación antes del merge

Este paquete contiene el proyecto completo basado en el ZIP entregado. Copia los
archivos modificados sobre tu rama `Kontrol-feat-p1-export-delete-account` y revisa
el diff. No cambia dependencias ni versiones del lockfile. `CAMBIOS_PRIVACIDAD.txt`
lista los archivos añadidos/modificados; `privacy-fixes.patch` permite revisar o
aplicar únicamente el cambio desde la raíz de la rama.

## Requisitos

- Node 22, la versión de `.nvmrc`.
- Docker con Compose v2, disponible en Docker Desktop.
- Acceso al registro npm para `npm ci`.
- Puertos locales 5433 y 27018 libres para las bases de prueba.

El Compose de integración usa PostgreSQL 16 y MongoDB 7 con replica set de un nodo.
Los datos de esas bases son desechables. La suite reinicia el esquema SQL de
`kontrol_test` y la base Mongo `kontrol_privacy_test`. No apunta a producción.
La validación rechaza Mongo remoto/SRV o una base con otro nombre; tampoco se
saltan las pruebas si las bases no están disponibles.

## Ejecutar desde la raíz del proyecto

```bash
node --version
npm ci
npm run db:test:up -w backend
npm run validate:privacy -w backend
npm run lint -- --pass-on-unpruned-suppressions
npm run db:test:down -w backend
```

`validate:privacy` ejecuta secuencialmente cobertura unitaria general, integración
PostgreSQL, regresión y la suite de privacidad con ambas bases reales. Si falla
cualquier paso, se detiene con código distinto de cero. Para repetir solo el
nuevo gate:

```bash
npm run test:privacy -w backend
```

No ejecutes simultáneamente las suites que reinician la misma base de pruebas.
El comando de bajada también se puede ejecutar por separado si un test falla.

URLs locales por defecto (no necesitas crear un `.env` de pruebas):

- PostgreSQL: `postgres://kontrol:kontrol@localhost:5433/kontrol_test`
- Mongo: `mongodb://127.0.0.1:27018/kontrol_privacy_test?replicaSet=rs0&directConnection=true`

Se pueden especificar `TEST_DATABASE_URL` y `TEST_MONGODB_URI`, conservando las
restricciones de bases locales de prueba. No uses `DATABASE_URL` de producción.

## Qué se corrigió

1. La limpieza Mongo completa y la marca persistente de cuenta eliminada se
   confirman juntas o se revierten juntas. Las transacciones reintentan conflictos
   transitorios; no se ejecutan operaciones paralelas dentro de una sesión.
2. Los participantes se retiran con `$pull`; dos bajas simultáneas no reemplazan
   la lista con una copia antigua. Se limpia también autoría/lecturas en mensajes
   que ya no estén asociados a una conversación accesible por el usuario.
3. Todas las escrituras de IA y chat humano pasan por la marca de privacidad.
   La respuesta tardía de IA revalida antes de guardar. La llamada a la IA se
   realiza fuera de la transacción. Los eventos de socket se emiten después del
   commit para evitar duplicarlos cuando Mongo reintenta.
4. La exportación instala listeners antes de esperar el pool, comprueba una
   respuesta ya cerrada y libera exactamente una vez. Mantiene el cupo de
   concurrencia hasta terminar la liberación de la conexión. Los clientes PG
   rotos se descartan del pool.
5. La baja libera la conexión PostgreSQL antes de procesar Mongo. El outbox
   conserva reintentos y protege la confirmación/reprogramación con el número
   de intento; el trabajador no superpone sus propios ciclos.
6. Se conserva el control de permisos, la reautenticación y los límites de tasa.

`account_privacy_states` es una colección técnica: contiene únicamente `_id`
(numérico), `deleted` y `revision`. Se conserva para impedir escrituras tardías;
no se debe borrar al limpiar cuentas, ni reutilizar IDs SQL de cuentas eliminadas.
La baja sigue conservando registros empresariales y copias externas según el
alcance ya documentado en la política del proyecto.

## Evidencia exigida

| Caso | Suite |
| --- | --- |
| Cancelación antes del pool, en preparación, en streaming y por timeout | `privacyExportController.test.js` |
| Error SQL, error de rollback y liberación del cupo | `privacyExportController.test.js` |
| Credenciales incorrectas, prueba Google ajena/caducada y fallo antes del commit | `privacyDeletionController.test.js` |
| JWT sin versión, con purpose, revocado o cuenta inactiva | `requireAuth.test.js` |
| Usuario ajeno/rol insuficiente y borrado solo del titular autenticado | `privacyAuthorization.test.js` |
| Límite de exportación por usuario/empresa y concurrencia global/por empresa | `rateLimit.test.js` |
| Fuerza bruta de eliminación por usuario e IP | `rateLimit.test.js` |
| Limpieza completa, rollback real y dos bajas concurrentes | `privacy/privacyLifecycle.test.js` |
| Escrituras tardías de IA, mensajes humanos y recibos de lectura | `privacy/privacyLifecycle.test.js` |
| Fallo de COMMIT PostgreSQL, recuperación outbox y desconexión Mongo real | `privacy/privacyLifecycle.test.js` |
| Exportación con datos Mongo reales y aislamiento entre empresas | `privacy/privacyLifecycle.test.js` |
| Reintentos, leases vencidos, trabajador concurrente y límite de backoff | `accountDeletionOutbox.test.js` y suite real |

La suite real simula únicamente el proveedor externo de IA y fallos deliberados.
No sustituye los modelos ni las conexiones Mongo/PostgreSQL por mocks. La prueba
de rollback compara documentos antes y después de inyectar un error intermedio;
la de COMMIT usa un trigger diferido real en PostgreSQL.

## Cobertura y CI

`vitest.privacy.config.js` exige al menos **70 % por archivo** en sentencias,
ramas, funciones y líneas para los siete archivos de privacidad/persistencia
incluidos explícitamente. Es un criterio de aceptación configurado, no una
medición ya obtenida. Los umbrales generales existentes se mantienen.

Se generan:

- `backend/reports/privacy-results.json`
- `backend/reports/privacy-junit.xml`
- `backend/coverage/privacy/index.html`
- `backend/coverage/privacy/coverage-summary.json`

El workflow `.github/workflows/privacy-validation.yml` levanta las dos bases,
ejecuta el gate y publica reportes en cada PR a `main`/`develop`, o manualmente.
Para bloquear el merge, el administrador del repositorio debe añadir el check
`Privacidad - PostgreSQL y Mongo reales` a las reglas de protección de la rama.
Crear el workflow no cambia por sí mismo esas reglas de GitHub.

## Despliegue

Mongo standalone ya no es compatible con las escrituras transaccionales. El
Compose local lo convierte a replica set con `rs0`; conserva el volumen existente.
Si usas el servidor local desde Node en tu equipo, utiliza:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/kontrol_chat?replicaSet=rs0&directConnection=true
```

Dentro de Compose se usa `mongodb://mongo:27017/kontrol_chat?replicaSet=rs0`.
Producción puede usar Atlas o un replica set/clúster configurado para transacciones.
No copies la configuración desechable sin autenticación del test a producción.
El backend comprueba el soporte al conectar y deja el chat indisponible si no lo
hay; los trabajos de eliminación permanecen pendientes para reintentarse.

Despliega estos cambios en todas las instancias de API y retira las instancias
antiguas antes de habilitar bajas. Una instancia antigua no conoce la marca de
privacidad y podría volver a insertar datos. Los límites de exportación siguen
siendo por proceso; para varias réplicas se necesita un almacén de límites
compartido y un presupuesto de conexiones acorde.

Las limpiezas demasiado grandes para el tiempo/memoria de una transacción se
revierten y quedan pendientes, sin purga parcial. El outbox no promete un plazo
si Mongo está indisponible o una cuenta supera ese presupuesto; revisa las tareas
pendientes en operación. No se implementa una transacción distribuida SQL/Mongo.

## Estado de comprobación de esta entrega

No se certifica un resultado verde de Vitest o de cobertura desde el entorno de
preparación: no dispone de las dependencias ni de Docker/bases reales, y el
registro npm devolvió HTTP 403 al intentar instalarlas. La revisión de sintaxis,
referencias y las comprobaciones aisladas se describen en `VALIDACION_LOCAL.txt`.
Ejecuta los comandos anteriores y conserva los reportes antes de aprobar el PR.

Documentación técnica utilizada:

- https://mongoosejs.com/docs/transactions.html
- https://www.mongodb.com/docs/manual/core/transactions-production-consideration/
