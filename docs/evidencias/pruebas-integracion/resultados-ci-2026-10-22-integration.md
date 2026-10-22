## Resultados de pruebas de integración — Kontrol backend

Commit `bf04237` · rama `161/merge` · evento `pull_request` · [corrida](https://github.com/PabloVS044/Kontrol/actions/runs/39727616024) · generado 2026-10-22T05:22:40.359Z

### Pruebas de integración (API + PostgreSQL) — ✅ aprobado

| Archivos | Total | Aprobadas | Fallidas | Omitidas | Tiempo en pruebas |
|---|---|---|---|---|---|
| 6 | 48 | 48 | 0 | 0 | 0.60 s |

| Resultado | Archivo | Grupo | Prueba | Duración |
|---|---|---|---|---|
| ✅ | integration/auth.int.test.js | I1 — registro, login y sesión contra la base real | POST /api/auth/register persiste al usuario con la contraseña hasheada | 41 ms |
| ✅ | integration/auth.int.test.js | I1 — registro, login y sesión contra la base real | rechaza un segundo registro con el mismo correo (409) | 4 ms |
| ✅ | integration/auth.int.test.js | I1 — registro, login y sesión contra la base real | POST /api/auth/login valida la contraseña contra el hash guardado y emite un JWT | 5 ms |
| ✅ | integration/auth.int.test.js | I1 — registro, login y sesión contra la base real | rechaza el login con una contraseña incorrecta (401) | 4 ms |
| ✅ | integration/auth.int.test.js | I1 — registro, login y sesión contra la base real | GET /api/auth/me resuelve el token emitido al mismo usuario de la base | 4 ms |
| ✅ | integration/auth.int.test.js | I1 — registro, login y sesión contra la base real | GET /api/auth/me sin token responde 401 | 2 ms |
| ✅ | integration/authorization.int.test.js | I5 — autorización por rol dentro de la empresa | owner, admin y manager pueden registrar gastos (200) | 57 ms |
| ✅ | integration/authorization.int.test.js | I5 — autorización por rol dentro de la empresa | un collaborator no puede registrar gastos (403) y no queda movimiento | 4 ms |
| ✅ | integration/authorization.int.test.js | I5 — autorización por rol dentro de la empresa | un manager no puede borrar actividades de presupuesto (403): solo owner y admin | 4 ms |
| ✅ | integration/authorization.int.test.js | I5 — autorización por rol dentro de la empresa | un admin sí puede borrar la actividad (200) | 5 ms |
| ✅ | integration/authorization.int.test.js | I5 — autorización por rol dentro de la empresa | un collaborator sin asignación al proyecto no puede crear productos en él (403) | 8 ms |
| ✅ | integration/authorization.int.test.js | I5 — autorización por rol dentro de la empresa | un manager sí puede crear productos en un proyecto de su empresa (201) | 7 ms |
| ✅ | integration/authorization.int.test.js | I5 — autorización por rol dentro de la empresa | solo owner y admin ajustan el presupuesto asignado del proyecto | 10 ms |
| ✅ | integration/authorization.int.test.js | I5 — autorización por empresa y por token | sin token responde 401 | 2 ms |
| ✅ | integration/authorization.int.test.js | I5 — autorización por empresa y por token | un token firmado con otro secreto responde 401 | 2 ms |
| ✅ | integration/authorization.int.test.js | I5 — autorización por empresa y por token | sin cabecera X-Company-ID responde 400 | 1 ms |
| ✅ | integration/authorization.int.test.js | I5 — autorización por empresa y por token | un usuario autenticado que no es miembro de la empresa recibe 403 | 2 ms |
| ✅ | integration/authorization.int.test.js | I5 — autorización por empresa y por token | el owner de una empresa desactivada pierde el acceso (403) | 9 ms |
| ✅ | integration/budget.int.test.js | I6 — actividades, gastos y resumen del presupuesto | un proyecto nuevo arranca con su presupuesto completo disponible | 28 ms |
| ✅ | integration/budget.int.test.js | I6 — actividades, gastos y resumen del presupuesto | POST /api/budgets crea una actividad planificada que aparece en el resumen | 20 ms |
| ✅ | integration/budget.int.test.js | I6 — actividades, gastos y resumen del presupuesto | registrar un gasto crea un movimiento GASTO_ADMIN ligado a la actividad y lo descuenta | 11 ms |
| ✅ | integration/budget.int.test.js | I6 — actividades, gastos y resumen del presupuesto | los gastos se acumulan en la misma actividad aunque el nombre cambie de mayúsculas | 10 ms |
| ✅ | integration/budget.int.test.js | I6 — actividades, gastos y resumen del presupuesto | el historial de gastos de la actividad devuelve los dos movimientos | 9 ms |
| ✅ | integration/budget.int.test.js | I6 — actividades, gastos y resumen del presupuesto | un ajuste de fondos se suma al presupuesto y queda en el historial | 12 ms |
| ✅ | integration/budget.int.test.js | I6 — actividades, gastos y resumen del presupuesto | al pasar del presupuesto el resumen marca la alerta EXCEDIDO | 8 ms |
| ✅ | integration/budget.int.test.js | I6 — actividades, gastos y resumen del presupuesto | un gasto de monto cero lo rechaza la validación (400) y no escribe nada | 10 ms |
| ✅ | integration/budget.int.test.js | I6 — aislamiento entre empresas en presupuesto | B no puede leer el resumen de presupuesto de un proyecto de A (404) | 3 ms |
| ✅ | integration/budget.int.test.js | I6 — aislamiento entre empresas en presupuesto | B no puede cargar gastos al proyecto de A (404) y el ROLLBACK no deja movimiento | 3 ms |
| ✅ | integration/budget.int.test.js | I6 — aislamiento entre empresas en presupuesto | B no ve, no edita ni borra actividades de A | 11 ms |
| ✅ | integration/budget.int.test.js | I6 — aislamiento entre empresas en presupuesto | B no puede ajustar los fondos de A (404) | 3 ms |
| ✅ | integration/posSale.int.test.js | I2 — venta del punto de venta persistida de forma atómica | crea la venta, un movimiento SALIDA por línea y descuenta el stock | 28 ms |
| ✅ | integration/posSale.int.test.js | I2 — venta del punto de venta persistida de forma atómica | con stock insuficiente responde 409 y el ROLLBACK no deja venta ni movimientos | 7 ms |
| ✅ | integration/posSale.int.test.js | I2 — venta del punto de venta persistida de forma atómica | un descuento por encima del tope configurado en empresa_config se rechaza (422) | 3 ms |
| ✅ | integration/productBarcode.int.test.js | I3 — unicidad del código de barras por proyecto | crea el primer producto con el código de barras (201) | 26 ms |
| ✅ | integration/productBarcode.int.test.js | I3 — unicidad del código de barras por proyecto | el mismo código en el mismo proyecto lo rechaza la base y la API responde 409 | 14 ms |
| ✅ | integration/productBarcode.int.test.js | I3 — unicidad del código de barras por proyecto | el mismo código en otro proyecto de la empresa sí se permite (201) | 81 ms |
| ✅ | integration/productBarcode.int.test.js | I3 — unicidad del código de barras por proyecto | varios productos sin código de barras conviven en el mismo proyecto (índice parcial) | 22 ms |
| ✅ | integration/productSupplier.int.test.js | I4 — vincular, actualizar y desvincular un proveedor de un producto | POST /:id/suppliers crea la relación con su precio (201) | 29 ms |
| ✅ | integration/productSupplier.int.test.js | I4 — vincular, actualizar y desvincular un proveedor de un producto | vincular dos veces el mismo proveedor responde 409 sin duplicar la fila | 5 ms |
| ✅ | integration/productSupplier.int.test.js | I4 — vincular, actualizar y desvincular un proveedor de un producto | PUT /:id/suppliers/:supplierId actualiza la fila que nombran los parámetros de la ruta | 6 ms |
| ✅ | integration/productSupplier.int.test.js | I4 — vincular, actualizar y desvincular un proveedor de un producto | PUT sobre una relación que no existe responde 404, no 500 | 4 ms |
| ✅ | integration/productSupplier.int.test.js | I4 — vincular, actualizar y desvincular un proveedor de un producto | un supplierId no numérico lo rechaza la validación de parámetros (400) | 4 ms |
| ✅ | integration/productSupplier.int.test.js | I4 — vincular, actualizar y desvincular un proveedor de un producto | DELETE /:id/suppliers/:supplierId borra la relación y un segundo DELETE da 404 | 7 ms |
| ✅ | integration/productSupplier.int.test.js | I4 — vincular, actualizar y desvincular un proveedor de un producto | el producto y el proveedor siguen existiendo después de desvincularlos | 1 ms |
| ✅ | integration/productSupplier.int.test.js | I4 — aislamiento entre empresas en producto ↔ proveedor | B no puede vincular su proveedor a un producto de A | 5 ms |
| ✅ | integration/productSupplier.int.test.js | I4 — aislamiento entre empresas en producto ↔ proveedor | B no puede cambiar el precio pactado entre A y su proveedor | 6 ms |
| ✅ | integration/productSupplier.int.test.js | I4 — aislamiento entre empresas en producto ↔ proveedor | B no puede desvincular el proveedor de un producto de A | 5 ms |
| ✅ | integration/productSupplier.int.test.js | I4 — aislamiento entre empresas en producto ↔ proveedor | B tampoco puede editar ni borrar el producto de A | 7 ms |

