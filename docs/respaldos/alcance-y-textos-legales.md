# Alcance, exclusiones y textos para L-1/L-2

## Medida comprobada

El 26/10/2026 se completó una restauración de laboratorio de PostgreSQL y MongoDB con datos sintéticos en un entorno aislado.

El resultado fue `restored_verified_lab`, con inventarios coincidentes y limpieza completa.

La restauración tomó 1.437 segundos; la recuperación con recreación de destinos y validación tomó 23.875 segundos. Estos tiempos corresponden únicamente al ensayo y no constituyen compromisos de recuperación del servicio.

Ver [evidencia](evidencias/kontrol-p2-20261026t230439z-6fee091f237c/evidence.json) y [ficha del operador](evidencias/kontrol-p2-20261026t230439z-6fee091f237c/ficha-operador.md).

## Exclusiones y límites

| Activo o proceso | Alcance acreditado |
| --- | --- |
| Datos PostgreSQL/MongoDB | Restauración verificada de las bases sintéticas del ensayo |
| Copias productivas | No verificadas por esta ejecución |
| Archivos de UploadThing | No se respaldan ni restauran sus bytes; solo se conservan referencias presentes en las bases |
| Roles, credenciales, propietarios y permisos de los motores | No se acredita su recuperación operativa; el laboratorio utiliza sus propias cuentas |
| Bootstrap fuera del SQL base | No cubierto por el esquema sintético utilizado |
| Secretos, certificados, VM, DNS y logs | No recuperados por el ensayo |
| Aplicación y proveedores externos | No se prueba la recuperación completa del servicio |
| Datos posteriores al respaldo | Quedan fuera; se comprueba deliberadamente la ausencia de registros tardíos |
| Bajas posteriores al respaldo | Su reaplicación operativa sigue requiriendo un procedimiento y registro independiente |
| Programación, almacenamiento externo y retención | Definidos en la política propuesta, sin activación productiva acreditada |
| RPO/RTO productivos | Objetivos propuestos, no verificados por el tiempo del laboratorio |

## Texto técnico para L-1 — Disponibilidad y recuperación

Se ha definido una política de respaldo y recuperación y se ha verificado una restauración de laboratorio de bases PostgreSQL y MongoDB con datos sintéticos en un entorno aislado. Esta prueba no acredita recuperación del entorno productivo ni establece una garantía de disponibilidad, tiempo de recuperación o pérdida máxima de datos. La cobertura de archivos adjuntos y de copias de proveedores requiere verificación adicional.

## Texto técnico para L-2 — Protección y copias

El procedimiento de laboratorio probado incluye cifrado de respaldos y comprobación de integridad y de los datos restaurados. La política propuesta contempla almacenamiento separado, acceso restringido y retención limitada, cuya operación productiva sigue pendiente de acreditación. El ensayo no demuestra respaldo de archivos adjuntos ni eliminación inmediata de información en todas las copias anteriores.

## Condiciones para ampliar estas afirmaciones

Antes de describir el proceso como operativo en producción, verificar:

- Programación y monitoreo de capturas.
- Almacenamiento externo e identidades con acceso.
- Custodia independiente de claves.
- Retención y eliminación efectiva de copias.
- Restauración de una copia representativa del alcance productivo.
- Reaplicación de bajas y validación de la aplicación antes de habilitar el servicio.

Los objetivos RPO de 6 horas y RTO de 4 horas no deben publicarse como garantías basándose en esta prueba.

Estos textos aportan hechos técnicos para L-1/L-2. No sustituyen su revisión jurídica ni constituyen aprobación de publicación.