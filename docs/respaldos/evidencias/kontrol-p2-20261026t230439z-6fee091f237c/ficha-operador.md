# Ficha del operador — Restauración P-2

## Identificación

- Operador: Alejandra Avilés.
- Revisor: pendiente de revisión del PR.
- Ejecución: `kontrol-p2-20261026t230439z-6fee091f237c`.
- Inicio: 26/10/2026, 17:04:39, America/Guatemala (UTC−06:00).
- Entorno: computadora local con Windows, PowerShell y Docker Desktop.
- Código probado: f416476df5695b13f2a90cd1fddc43c2aceb1298.
- Alcance: bases sintéticas de PostgreSQL y MongoDB en contenedores aislados.

## Resultado

Estado final: `restored_verified_lab`.

| Medición | Segundos |
| --- | ---: |
| Captura y cifrado de respaldos | 0.735 |
| Descifrado y restauración | 1.437 |
| Recuperación con recreación de destinos y validación | 23.875 |

Comprobaciones registradas:

- `restoration_verified: true`.
- `cleanup_complete: true`.
- `comparison.postgres_equal: true`.
- `comparison.mongo_equal: true`.

Las 16 pruebas unitarias de la herramienta también terminaron aprobadas.

## Qué se recuperó

Se recuperaron los datos y objetos incluidos en los inventarios de PostgreSQL y MongoDB del ensayo. Las fuentes sintéticas se eliminaron antes de restaurar en destinos nuevos.

La comparación de origen y destino resultó satisfactoria. El procedimiento también completó las comprobaciones de relaciones y totales de ventas y de ausencia de los registros añadidos después del respaldo.

Los inventarios y resultados detallados se conservan en `evidence.json`.

## Qué no se recuperó ni se acreditó

- Archivos binarios de UploadThing.
- Roles, credenciales y permisos de administración de los motores.
- Secretos, certificados, VM, DNS, logs y servicios externos.
- Cambios de bootstrap que no están en el esquema base utilizado.
- Registros añadidos deliberadamente después de la captura.
- Recuperación de la aplicación productiva.
- Programación, retención y almacenamiento externo de respaldos productivos.
- Cumplimiento de RPO/RTO en producción.

## Pasos manuales y correcciones

1. Preparación de Python 3.12 y del entorno `.venv-backups`.
2. Instalación de las dependencias de la herramienta.
3. Corrección de lecturas y escrituras para utilizar UTF-8 explícito en Windows.
4. Conservación del inventario restaurado antes de ejecutar la comparación.
5. Normalización limitada de conversiones equivalentes en restricciones CHECK de PostgreSQL.
6. Incorporación de una prueba de regresión para la normalización.
7. Ejecución de las 16 pruebas unitarias y del ensayo completo.
8. Copia de los informes públicos al repositorio, excluyendo respaldos y claves.

La normalización mantiene la comparación de restricciones y distingue cambios en los valores permitidos; no elimina la verificación del esquema.

## Evidencia

- [Informe estructurado](evidence.json).
- [Resumen generado](evidence.md).

Esta ejecución acredita una restauración real de laboratorio con datos sintéticos. Sus tiempos no constituyen un RTO productivo ni una garantía de recuperación del servicio.