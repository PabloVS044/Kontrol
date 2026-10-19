# Auditoría de licencias de terceros

**Corte: 17 de octubre de 2026**, sobre el `package-lock.json` posterior a DT-08 (actualización de dependencias vulnerables). Requiere revisión profesional antes de un uso comercial real.

**Resultado: ninguna dependencia obliga a publicar el código de Kontrol.** No hay licencias copyleft fuertes (GPL, AGPL, SSPL) en ninguna parte del árbol. La única copyleft débil (MPL-2.0) está solo en herramientas de compilación, y la única licencia no estándar en producción (GSAP) permite el uso comercial de Kontrol. Por eso la [licencia propietaria](../licencia.md) es viable.

## Cómo se generó

| Paso | Herramienta y versión | Salida |
| --- | --- | --- |
| Árbol completo | `@cyclonedx/cyclonedx-npm` 6.0.1 (cyclonedx-library 10.3.0) sobre npm 10.8.2, especificación CycloneDX 1.6 | [`sbom.cdx.json`](sbom.cdx.json) |
| Solo producción | La misma, con `--omit dev` | [`sbom-produccion.cdx.json`](sbom-produccion.cdx.json) |
| Inventario y atribuciones | [`scripts/licenses-report.mjs`](../../../scripts/licenses-report.mjs), que lee los dos SBOM | [`inventario.md`](inventario.md) y [`THIRD-PARTY-NOTICES.txt`](../../../frontend/public/THIRD-PARTY-NOTICES.txt) |

Todo se regenera con `npm run licenses`, con las dependencias instaladas (`npm ci`). Los SBOM se construyen desde el lockfile (`--package-lock-only`), así que incluyen los binarios opcionales de todas las plataformas aunque no estén instalados en la máquina que los genera. La opción `--output-reproducible` hace que dos corridas sobre el mismo lockfile den el mismo archivo, así que cada cambio de dependencias se ve en el diff.

**Por qué no `npm sbom`.** El comando integrado de npm se niega a generar el SBOM porque `mongodb@7.6.0` declara como dependencia par opcional `gcp-metadata@^7.0.1` y en el árbol está la 8.1.2 (`npm ls` reporta `invalid`). CycloneDX lo admite con `--ignore-npm-errors`. Ese desajuste no afecta a las licencias, pero conviene corregirlo dentro de la gestión de dependencias.

## Resumen

539 paquetes de terceros: **244 de producción y 295 de desarrollo**; 47 directos y 492 transitivos. El detalle por paquete está en el [inventario](inventario.md).

| Categoría | Producción | Desarrollo |
| --- | --- | --- |
| Copyleft fuerte (GPL, AGPL, SSPL) | 0 | 0 |
| Copyleft débil (MPL, LGPL, EPL) | 0 | 12 |
| Licencia propia, no estándar | 1 | 0 |
| Sin licencia declarada | 0 | 0 |
| Permisiva por elección (doble licencia) | 2 | 0 |
| Permisiva (MIT, ISC, BSD, Apache-2.0, 0BSD, BlueOak, Unlicense) | 241 | 283 |

El riesgo no es el mismo en los dos ámbitos. El frontend de producción se **distribuye**: su código viaja al navegador de cada usuario, y ahí aplican las obligaciones de aviso. El backend se ejecuta como servicio y no se entrega a nadie. Las dependencias de desarrollo solo corren en las máquinas del equipo y en el CI.

## Licencias con obligaciones: veredicto y plan

| Licencia | Dónde | Qué obliga | Veredicto | Plan |
| --- | --- | --- | --- | --- |
| **GSAP Standard License** (vigente desde el 30-04-2025, modificada el 30-05-2025) | `gsap` 3.15.0, producción, directa (raíz y `frontend`); animaciones de la interfaz | Permite el uso comercial gratuito. Prohíbe usar GSAP en herramientas para crear animaciones visuales sin código o en soluciones que compitan con las capacidades de animación visual de Webflow, y quitar o alterar sus avisos de propiedad. No exige atribución. | **Compatible.** Kontrol es una plataforma de gestión de negocios, no un constructor de animaciones. | **Cumplir:** no quitar los avisos de GSAP. Volver a revisar la licencia si alguna vez Kontrol ofrece a sus usuarios un editor visual de animaciones, y en cada actualización mayor de `gsap`. Fuente: [gsap.com/standard-license](https://gsap.com/standard-license), consulta 17-10-2026. |
| **MPL-2.0** (copyleft débil, por archivo) | `lightningcss` 1.32.0 y sus 11 binarios por plataforma; desarrollo, transitivas, vía `vite` y `@tailwindcss/postcss` | Quien distribuye archivos cubiertos por la MPL, modificados o no, debe ofrecer su código fuente bajo la MPL. No se extiende al código propio que los usa. | **Sin obligación.** Solo se ejecuta al compilar el CSS; no se modifica ni se incluye en lo que se entrega al navegador. | **Aislar** (ya lo está): mantenerla como herramienta de compilación. Si alguna vez se distribuyera, publicar su código fuente, que ya es público. |
| **(MPL-2.0 OR Apache-2.0)** | `dompurify` 3.4.16, producción, directa (`frontend`) | Doble licencia: se elige una. | **Compatible** usándola bajo **Apache-2.0**. | **Cumplir** Apache-2.0: conservar su aviso y licencia (incluidos en las atribuciones). El paquete no trae archivo NOTICE y no se modifica. |
| **(Unlicense OR Apache-2.0)** | `@zxing/text-encoding` 0.9.0, producción, transitiva (escáner de códigos) | Doble licencia: se elige una. | **Compatible** usándola bajo **Unlicense**, que no impone condiciones. | Ninguna acción. |
| **MIT, ISC, BSD-2-Clause, BSD-3-Clause, BlueOak-1.0.0** | 227 paquetes de producción y 267 de desarrollo | Conservar el aviso de copyright y el texto de la licencia en las copias que se distribuyan. | **Compatibles** con uso comercial y código cerrado. | **Cumplir** en producción con [`THIRD-PARTY-NOTICES.txt`](../../../frontend/public/THIRD-PARTY-NOTICES.txt), que se publica junto con la aplicación en `/THIRD-PARTY-NOTICES.txt`. En desarrollo no hay distribución. |
| **Apache-2.0** | 12 paquetes de producción y 15 de desarrollo, más `dompurify` | Conservar avisos y licencia, reproducir el archivo NOTICE si existe e indicar las modificaciones. | **Compatible.** Ninguno de los de producción trae NOTICE y no se modifican. | **Cumplir** con las atribuciones. Si una actualización trae un NOTICE, el generador lo incluye automáticamente. |
| **0BSD, Unlicense** | 1 de desarrollo y 1 de producción | Sin condiciones. | Compatibles. | Ninguna acción. |
| **MIT sin campo moderno** | `xmlhttprequest-ssl` 2.1.2, producción, transitiva (vía `socket.io-client`) | Declara MIT con el campo antiguo `licenses`, que el SBOM no recoge. | **Compatible**, MIT verificada contra su archivo LICENSE. | Registrada a mano en `MANUAL_LICENSES` del generador. Revisar si cambia de versión. |

## Atribuciones de terceros

Aplican, porque MIT, BSD, ISC y Apache-2.0 exigen conservar los avisos en las copias distribuidas, y el bundle del frontend no los conserva por sí solo. [`THIRD-PARTY-NOTICES.txt`](../../../frontend/public/THIRD-PARTY-NOTICES.txt) reúne, para los 244 paquetes de producción, el nombre, la versión, la licencia (y cuál se eligió en las dobles) y el texto de su archivo LICENSE, COPYING o NOTICE. Cuando un paquete no trae ese archivo, se indica su licencia declarada. Como vive en `frontend/public`, Vite lo copia al build y queda accesible en `/THIRD-PARTY-NOTICES.txt`.

## Mantenimiento

Cada cambio en `package-lock.json` puede cambiar el resultado. Después de actualizar dependencias:

1. `npm ci`
2. `npm run licenses`
3. Revisar en el diff del inventario cualquier paquete nuevo en una categoría distinta de «Permisiva». El script también lo imprime en consola con el prefijo «Revisar:».
4. Hacer commit de los SBOM, el inventario y las atribuciones en un commit propio, separado de la actualización de dependencias.
