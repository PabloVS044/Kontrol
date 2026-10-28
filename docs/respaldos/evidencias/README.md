# Evidencias de P-2

## Restauración verificada

Ejecución: `kontrol-p2-20261026t230439z-6fee091f237c`.

Inicio: **26/10/2026, 17:04:39, America/Guatemala**.

Estado final: **`restored_verified_lab`**.

| Resultado | Valor |
| --- | --- |
| Pruebas unitarias | 16 aprobadas |
| PostgreSQL | Inventarios coincidentes |
| MongoDB | Inventarios coincidentes |
| Restauración verificada | Sí |
| Limpieza completa | Sí |
| Captura y cifrado | 0.735 s |
| Descifrado y restauración | 1.437 s |
| Recuperación con validación | 23.875 s |

Archivos de evidencia:

- [evidence.json](kontrol-p2-20261026t230439z-6fee091f237c/evidence.json).
- [evidence.md](kontrol-p2-20261026t230439z-6fee091f237c/evidence.md).
- [Ficha del operador](kontrol-p2-20261026t230439z-6fee091f237c/ficha-operador.md).

El ensayo se ejecutó con datos sintéticos en un equipo local con Windows y Docker Desktop. No acredita restauración productiva ni cumplimiento de RPO/RTO del servicio.

## Antecedentes

El intento inicial del entorno de preparación quedó bloqueado por ausencia de Docker:

- [Informe inicial](intento-kontrol-p2-20261026t030856z-29ad0b1156de/evidence.json).
- [Resumen inicial](intento-kontrol-p2-20261026t030856z-29ad0b1156de/evidence.md).

Durante la ejecución posterior en Windows se identificaron y corrigieron:

1. Lecturas de texto dependientes de la codificación del sistema.
2. Falta del inventario restaurado en informes de comparación fallida.
3. Diferencias textuales equivalentes en dos restricciones CHECK de PostgreSQL.

Los informes anteriores no deben sobrescribirse ni presentarse como exitosos.

## Reglas para nuevas evidencias

Cada ejecución debe tener su propia carpeta e incluir:

- Informes `evidence.json` y `evidence.md` generados por la herramienta.
- Ficha del operador con fecha, equipo, código probado, pasos manuales, resultados y exclusiones.

Si existían cambios locales durante el ensayo, deben declararse junto al commit base.

No versionar el directorio `private/`, claves, dumps, credenciales ni archivos `.env`. Revisar los informes antes de incorporarlos al PR.