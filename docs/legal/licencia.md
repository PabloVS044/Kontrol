# Licencia de Kontrol

**Decisión del 17 de octubre de 2026.** Requiere revisión profesional antes de un uso comercial real.

## Decisión: software propietario, todos los derechos reservados

Kontrol no se distribuye bajo ninguna licencia abierta. El código, la documentación y el resto del material del repositorio son propiedad de **los integrantes del equipo de desarrollo**, que se reservan todos los derechos. Nadie más puede copiarlo, modificarlo, distribuirlo ni explotarlo sin su autorización por escrito. El texto está en [`LICENSE`](../../LICENSE).

**Titularidad.** El software pertenece a los integrantes del equipo y **no a la Universidad del Valle de Guatemala**. Fuente: declaración del equipo del 17-10-2026. Este expediente no revisó documentos de la universidad ni del curso que la respalden.

## Por qué

| Consideración | Consecuencia para la decisión |
| --- | --- |
| El proyecto se plantea salir a mercado como producto comercial. | Los titulares necesitan conservar el control de quién usa y explota el código. |
| Una licencia abierta permitiría a cualquiera copiar el producto y competir con él, y no se puede retirar para las versiones ya publicadas. | Empezar cerrado deja abiertas todas las opciones: los titulares pueden abrir o licenciar más adelante. El camino inverso no existe. |
| La [auditoría de dependencias](licencias/README.md) no encontró licencias copyleft fuertes (GPL, AGPL, SSPL) en el árbol. | Ninguna dependencia obliga a publicar el código de Kontrol, así que la licencia propietaria es viable. |

## Qué permite y qué prohíbe

- **No se concede ningún permiso** de uso, copia, modificación, distribución ni sublicencia. Cada autorización se da por escrito y caso por caso. Las solicitudes van a `support@kontrol.it.com`.
- **Usar el servicio no es licenciar el código.** Quien usa Kontrol como plataforma lo hace bajo los Términos y Condiciones publicados en `/legal`, que no conceden derechos sobre el software.
- **Los componentes de terceros conservan sus licencias.** La licencia propia no se extiende a ellos; sus avisos están en [`THIRD-PARTY-NOTICES.txt`](../../frontend/public/THIRD-PARTY-NOTICES.txt).

## Dónde está el aviso de derechos de autor

| Lugar | Aviso |
| --- | --- |
| [`LICENSE`](../../LICENSE) | Texto completo en español e inglés. |
| `package.json` de la raíz, `frontend` y `backend` | `"license": "UNLICENSED"`, la convención de npm para software sin licencia de uso. |
| [`README.md`](../../README.md), sección «Licencia» | Resumen y enlaces. |
| Pie de página de la aplicación | «© {año} Kontrol. Todos los derechos reservados.» (ya existía). |
| [`THIRD-PARTY-NOTICES.txt`](../../frontend/public/THIRD-PARTY-NOTICES.txt) | Encabezado que distingue el software propio de los componentes de terceros. |

No se agregan encabezados de copyright a cada archivo fuente: el aviso del repositorio cubre todo su contenido.

## Consecuencias y pendientes

1. **Nombres de los titulares.** `LICENSE` dice «los integrantes del equipo de desarrollo de Kontrol». Conviene sustituirlo por los nombres completos de cada integrante para que el aviso identifique a los titulares.
2. **Acuerdo entre integrantes.** Hay varios titulares. Hace falta un acuerdo escrito que defina la proporción de cada uno, quién puede autorizar licencias o vender el producto y qué pasa si alguien deja el equipo. Sin ese acuerdo no está escrito quién puede firmar en nombre de los demás.
3. **Contribuciones externas.** Una persona ajena al equipo que aporte código conserva sus derechos sobre ese aporte salvo que los ceda por escrito. Antes de aceptar contribuciones externas, hay que pedir esa cesión.
4. **Visibilidad del repositorio.** Si el repositorio de GitHub es público, los Términos de Servicio de GitHub permiten a otros usuarios verlo y hacer *fork* dentro de GitHub. Eso no les da derecho a usar el código, pero lo expone. Para un producto comercial conviene que el repositorio sea privado.
5. **Revisión profesional.** La redacción de `LICENSE` y la titularidad deben revisarse con un profesional en Guatemala antes de explotar comercialmente el producto.
