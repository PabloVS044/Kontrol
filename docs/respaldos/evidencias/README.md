# Evidencias de P-2

## Intento ejecutado en esta entrega

- Inicio: 25/10/2026 21:08:56, Guatemala; 26/10/2026 03:08:56 UTC.
- Resultado: **BLOCKED**, salida 2. Docker no está instalado.
- Capacidad host medida: 30 931 714 048 bytes libres (aprox. 28.8 GiB).
- Bases creadas/restauradas: ninguna. Datos recuperados: ninguno.
- Duración de restauración: no medida. No confundir los 0.015 s del preflight con recuperación.
- Acceso a producción/pruebas compartidas: ninguno.
- Informe original: [evidence.json](intento-kontrol-p2-20261026t030856z-29ad0b1156de/evidence.json)
  y [evidence.md](intento-kontrol-p2-20261026t030856z-29ad0b1156de/evidence.md).

**Esta evidencia demuestra el bloqueo; no cumple la restauración del criterio de aceptación.**

## Validación auxiliar realizada

Se ejecutó `python3 -m unittest discover -s tests/backups -v`: **15 pruebas, OK**.
Comprueban cifrado/descifrado, autenticación, detección de alteración, límites,
rechazo de rutas/engines ajenos, capacidad, diferencias de inventario, propiedad de
recursos y evidencia de fallos. Los dobles usados en esas pruebas no representan
una restauración de bases. Las pruebas de aplicación/Vitest de P-1 no se ejecutaron
en esta entrega de P-2.

## Plantilla para completar después de una ejecución real

Crear un archivo `ficha-operador.md` junto a los informes, con:

- Operador y revisor:
- Commit exacto de la rama:
- Fecha/hora y zona:
- Equipo independiente o URL del run de GitHub:
- Tipo de fuente: sintética / copia real autorizada, descrita sin datos sensibles:
- Motores/versiones y tamaño de la fuente:
- Juego de copias y punto de recuperación:
- Destino aislado y comprobación de capacidad:
- Resultado literal y código de salida:
- Duración de captura, restauración y recuperación con validación:
- Filas/documentos/objetos recuperados y comparación con manifiesto:
- Qué no se recuperó:
- Pasos manuales ejecutados:
- Incidentes y correcciones:
- Limpieza de destino confirmada:
- RPO/RTO de producción: verificado/no verificado y fundamento:
- Limitaciones que pueden describir L-1/L-2:

No completar campos con estimaciones como si fueran mediciones. Adjuntar siempre
los JSON/Markdown generados y revisar que no haya claves, copias ni datos personales.
