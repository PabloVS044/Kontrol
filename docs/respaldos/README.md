# P-2 · Política de respaldos con restauración probada

**Estado de esta entrega: implementación y documentación preparadas; P-2 NO cerrada.**
La ejecución del 25/10/2026 a las 21:08:56 de Guatemala (26/10 UTC) se detuvo
porque este entorno no tiene Docker. No se creó ni restauró ninguna base. El
informe de ese intento registra `status: blocked`, no una restauración exitosa.

Este cambio parte exclusivamente del ZIP `Kontrol-develop (2).zip`. No incorpora
las correcciones de código de P-1. El documento
[de P-1](../p1-cambios-y-aplicacion.md) explica por separado el ZIP anterior.

## Documentos y código

- [Estado actual y fuentes](estado-actual.md).
- [Política y objetivos RPO/RTO](politica.md).
- [Procedimiento paso a paso](procedimiento-restauracion.md).
- [Exclusiones y texto para L-1/L-2](alcance-y-textos-legales.md).
- [Evidencia y pendientes](evidencias/README.md).
- Herramienta: `scripts/backups/drill.py`; fixtures sintéticos SQL/Mongo e inventario.
- Pruebas: `tests/backups/test_drill.py`.
- CI: `.github/workflows/backup-restore-drill.yml`.

## Qué demuestra la herramienta cuando termina correctamente

Crea una red interna y bases nuevas PostgreSQL 16/MongoDB 7, carga el esquema
versionado y datos ficticios, toma respaldos lógicos, los cifra, elimina los
contenedores y volúmenes fuente, crea destinos vacíos y restaura desde las copias.
Compara todas las filas del esquema base, conteos, hashes, secuencias, columnas,
restricciones e índices; también los documentos, opciones e índices de las cuatro
colecciones Mongo. Comprueba relaciones y totales de ventas. Agrega datos después
del respaldo para demostrar expresamente que esos datos no se recuperan.

La herramienta mide respaldo, restauración y recuperación con validación. Solo
publica metadatos de la prueba; claves y respaldos quedan en `private/`, ignorados
por Git y excluidos del artifact de CI. Rechaza Docker remoto y no acepta URI de
origen ni destino. No inicia la aplicación ni ejecuta despliegues.

Un resultado `restored_verified_lab` acredita una restauración real de **datos
sintéticos**, con ese esquema y volumen. No demuestra que haya copias de producción,
que UploadThing esté respaldado o que se cumplan los objetivos de producción.
No se debe presentar el tiempo del laboratorio como RTO productivo.

## Criterios de aceptación y situación

| Criterio | Evidencia disponible | Estado |
| --- | --- | --- |
| Estado actual | Revisión del repositorio; cobertura de proveedores desconocida | Documentado, sin acceso al panel/VM actual |
| Política con RPO/RTO justificados | Objetivos 6 h / 4 h; frecuencia, retención, custodia y roles definidos | Escrita; activación y asignación nominal pendientes |
| Restauración ejecutada | Intento bloqueado, ninguna base restaurada | **PENDIENTE: impide cerrar P-2** |
| Procedimiento reproducible | Runbook, herramienta y workflow aislado | Versionables; falta ejecución integral |
| Qué no se respalda | Lista explícita, incluidos archivos externos | Documentado |
| Texto L-1/L-2 sustentado | Texto conservador que reconoce ausencia de recuperación probada | Preparado; no publicar garantías |

Para cerrar el criterio de restauración hay que ejecutar el procedimiento en un
equipo aparte o runner de GitHub, revisar el informe exitoso y versionarlo. Para
presentar además la política como **operativa**, verificar la programación,
almacenamiento externo, custodia de claves y responsables reales, y restaurar una
copia representativa de la fuente que se vaya a prometer. Registrar sus límites.
