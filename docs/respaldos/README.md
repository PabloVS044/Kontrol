# P-2 · Política de respaldos con restauración probada

## Estado

La restauración de laboratorio se ejecutó y verificó el **26/10/2026**, con inicio a las **17:04:39 de Guatemala**.

Resultado: `restored_verified_lab`.

El ensayo utilizó bases sintéticas de PostgreSQL y MongoDB en contenedores aislados. La comparación de origen y destino fue satisfactoria en ambos motores y la limpieza terminó correctamente.

La aceptación de la tarea queda sujeta a revisión de la evidencia y del alcance declarado. La operación de respaldos productivos no está acreditada por este ensayo.

## Resultados

| Comprobación | Resultado |
| --- | --- |
| Pruebas unitarias de la herramienta | 16 aprobadas |
| Inventario PostgreSQL | Coincide |
| Inventario MongoDB | Coincide |
| Restauración verificada | Sí |
| Limpieza de recursos del ensayo | Completa |
| Captura y cifrado | 0.735 s |
| Descifrado y restauración | 1.437 s |
| Recuperación con validación | 23.875 s |

La herramienta crea fuentes sintéticas, captura y cifra respaldos, elimina los contenedores y volúmenes fuente, restaura en destinos nuevos y compara los inventarios.

La comparación incluye datos, secuencias, columnas, restricciones e índices de PostgreSQL, además de documentos, opciones e índices de MongoDB. También se verifican relaciones y totales de ventas y la pérdida esperada de registros posteriores al respaldo.

## Documentación

- [Estado actual y fuentes](estado-actual.md).
- [Política y objetivos RPO/RTO](politica.md).
- [Procedimiento de restauración](procedimiento-restauracion.md).
- [Exclusiones y textos para L-1/L-2](alcance-y-textos-legales.md).
- [Historial de evidencias](evidencias/README.md).
- [Informe de la ejecución exitosa](evidencias/kontrol-p2-20261026t230439z-6fee091f237c/evidence.json).
- [Ficha del operador](evidencias/kontrol-p2-20261026t230439z-6fee091f237c/ficha-operador.md).

## Implementación

- Herramienta: `scripts/backups/drill.py`.
- Fixtures e inventario: `scripts/backups/`.
- Pruebas: `tests/backups/test_drill.py`.
- Workflow: `.github/workflows/backup-restore-drill.yml`.

Se corrigió la lectura y escritura de texto para utilizar UTF-8 explícito en Windows. También se añadió una normalización limitada para representaciones equivalentes de conversiones de arrays en restricciones CHECK de PostgreSQL, manteniendo la detección de diferencias reales.

## Criterios de aceptación

| Criterio | Situación |
| --- | --- |
| Estado actual documentado | Disponible; configuraciones de proveedores no verificadas siguen identificadas como desconocidas |
| Política con objetivos justificados | RPO de 6 h y RTO de 4 h definidos como objetivos propuestos |
| Restauración ejecutada | Verificada para el alcance sintético del laboratorio |
| Procedimiento versionado | Disponible |
| Exclusiones | Documentadas |
| Evidencia | Informes y ficha del operador asociados a la ejecución |
| Texto para L-1/L-2 | Ajustado al alcance efectivamente probado |

## Límites

Los tiempos del laboratorio no acreditan RPO/RTO productivos. No se verificaron copias productivas, recuperación de archivos de UploadThing, reaprovisionamiento del servicio completo ni activación de programación, almacenamiento externo y retención.

El workflow está preparado; la evidencia de esta entrega corresponde a una ejecución local, no a un run de GitHub Actions.

Los informes de intentos anteriores se conservan como antecedentes. No se versionan dumps, claves ni el directorio `private/`.