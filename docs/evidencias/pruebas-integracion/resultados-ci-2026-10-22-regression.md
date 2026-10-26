## Resultados de pruebas de integración — Kontrol backend

Commit `bf04237` · rama `161/merge` · evento `pull_request` · [corrida](https://github.com/PabloVS044/Kontrol/actions/runs/39727616024) · generado 2026-10-22T05:22:46.234Z

### Pruebas de regresión (API + PostgreSQL) — ✅ aprobado

| Archivos | Total | Aprobadas | Fallidas | Omitidas | Tiempo en pruebas |
|---|---|---|---|---|---|
| 4 | 11 | 11 | 0 | 0 | 0.29 s |

| Resultado | Archivo | Grupo | Prueba | Duración |
|---|---|---|---|---|
| ✅ | regression/agentScope.regression.test.js | DT-16 — las vistas del agente quedan aisladas por transacción | no deja vistas en la conexión devuelta al pool ni mezcla empresas consecutivas | 104 ms |
| ✅ | regression/salePriceAuthority.regression.test.js | RG2 — autoridad del precio en el servidor | un precio manipulado por el cliente se rechaza con 409 PRICE_MISMATCH y no se vende nada | 31 ms |
| ✅ | regression/salePriceAuthority.regression.test.js | RG2 — autoridad del precio en el servidor | sin precio en el body se cobra el precio vigente de la base | 21 ms |
| ✅ | regression/salePriceAuthority.regression.test.js | RG2 — autoridad del precio en el servidor | si el precio cambia en la base, la venta usa el nuevo precio | 34 ms |
| ✅ | regression/saleTotals.regression.test.js | RG1 — desglose de la venta con descuento e IVA | Q100 − 10 % + IVA 12 % = Q100.80 en la respuesta (ticket) | 31 ms |
| ✅ | regression/saleTotals.regression.test.js | RG1 — desglose de la venta con descuento e IVA | las mismas cifras quedan persistidas en la tabla venta (reportes) | 8 ms |
| ✅ | regression/saleTotals.regression.test.js | RG1 — desglose de la venta con descuento e IVA | el IVA de cada línea suma exactamente el IVA de la cabecera | 7 ms |
| ✅ | regression/tenantIsolation.regression.test.js | RG3 — una empresa no puede ver ni vender datos de otra | cada owner lista solo los proyectos de su empresa | 27 ms |
| ✅ | regression/tenantIsolation.regression.test.js | RG3 — una empresa no puede ver ni vender datos de otra | el owner de B no puede listar proyectos enviando el X-Company-ID de A (403) | 5 ms |
| ✅ | regression/tenantIsolation.regression.test.js | RG3 — una empresa no puede ver ni vender datos de otra | el owner de B no puede registrar ventas en nombre de la empresa A (403) | 10 ms |
| ✅ | regression/tenantIsolation.regression.test.js | RG3 — una empresa no puede ver ni vender datos de otra | tampoco puede vender un producto de A desde su propia empresa | 8 ms |

