# Kontrol — Tokens de Figma (transcripción visual)

**Fuente:** láminas exportadas de Figma en `./assets/`
**Alcance:** este documento es una **transcripción literal** de lo que muestran las imágenes. No añade valores que no aparezcan en ellas.
**Documento complementario:** [`design-system.md`](./design-system.md) — ahí están los hex, las reglas de uso y los criterios de accesibilidad.

> **Cómo usar estos dos documentos**
> - Este archivo → **qué tokens existen** y **cómo se llaman** en Figma.
> - `design-system.md` → **qué valor tiene cada token** y **cuándo aplicarlo**.
>
> Donde los nombres no coinciden entre ambos, se marca con ⚠️.

---

## 1. Paleta de colores

![Paleta de Colores](./assets/Colores.png)

Lámina: *"PALETA DE COLORES LOCALES"* — 24 tokens en 4 grupos por prefijo.

### Grupo `color/`
| Token | Muestra |
| :--- | :--- |
| `color/primary` | Dorado claro |
| `color/primary2` | Dorado oscuro / bronce |
| `color/Background` | Negro |
| `color/Background2` | Negro cálido (marrón muy oscuro) |
| `color/Text` | Blanco roto |
| `color/text-muted` | Gris medio |
| `color/Secondary` | Oliva dorado |
| `color/Tertiary` | Negro verdoso |
| `color/Border` | Marrón oscuro |
| `color/PillBack` | Negro cálido |
| `color/Background3` | Gris muy oscuro |
| `color/Success` | Verde oscuro |
| `color/Error` | Rojo oscuro |
| `color/Warning` | Ámbar oscuro |

### Grupo `text/`
| Token | Muestra |
| :--- | :--- |
| `text/TextSoft` | Beige claro |
| `text/TextMuted` | Gris cálido |
| `text/TextDim` | Marrón grisáceo |
| `text/TextFaint` | Marrón oscuro |
| `text/TextPlaceholder` | Marrón muy oscuro |

### Grupo `visualStates/`
| Token | Muestra |
| :--- | :--- |
| `visualStates/ErrorText` | Rojo claro |
| `visualStates/SuccessText` | Verde claro |

### Grupo `forms/`
| Token | Muestra |
| :--- | :--- |
| `forms/InputBg` | Blanco translúcido |
| `forms/InputFocusBg` | Dorado translúcido |
| `forms/BtnText` | Negro |

> ⚠️ La lámina define **dos tokens distintos de texto atenuado**: `color/text-muted` (gris neutro) y `text/TextMuted` (gris cálido). No son intercambiables.
>
> ⚠️ `design-system.md` §2 no lista `Secondary`, `Tertiary`, `Border`, `PillBack`, `Background3`, `ErrorText` ni `SuccessText`.

---

## 2. Sistema de tipografías

![Tipografía](./assets/Tipografía.png)

Lámina: *"SISTEMA DE TIPOGRAFÍAS"* — 5 niveles, de mayor a menor.

| Token | Familia mostrada | Peso | Escala relativa |
| :--- | :--- | :--- | :--- |
| `font/display` | Serif | Bold | Nivel 1 (mayor) |
| `font/heading-1` | Serif | Bold | Nivel 2 |
| `font/body-large` | Sans-serif | Regular | Nivel 3 |
| `font/body-main` | Sans-serif | Regular | Nivel 4 |
| `font/caption` | Sans-serif | Regular | Nivel 5 (menor) |

Criterio visible: **serif para títulos** (`display`, `heading-1`), **sans-serif para contenido** (`body-large`, `body-main`, `caption`).

> ⚠️ La lámina no indica tamaños en px. `design-system.md` §3 usa una nomenclatura distinta (`text-3xl`, `text-xl`, `text-base`, `text-2xs`) sin equivalencia declarada con estos tokens.

---

## 3. Sistema de espaciado

![Sistema de Espaciado](./assets/Espaciado.png)

Lámina: *"SISTEMA DE ESPACIADO"* — cada token ilustrado con una retícula de esa densidad.

| Token | Valor |
| :--- | :--- |
| `spacing/space-1` | 4px |
| `spacing/space-2` | 8px |
| `spacing/space-3` | 12px |
| `spacing/space-4` | 16px |
| `spacing/space-5` | 24px |
| `spacing/space-6` | 32px |
| `spacing/space-7` | 48px |

> ⚠️ `design-system.md` §4 llama `space-8` al valor de 48px. En Figma es `space-7`.

---

## 4. Radios de borde

![Radios de Borde](./assets/Radios.png)

Lámina: *"RADIOS DE BORDE"* — 5 tokens.

| Token | Valor |
| :--- | :--- |
| `radius/sm` | 4px |
| `radius/md` | 8px |
| `radius/lg` | 12px |
| `radius/xl` | 24px |
| `radius/pill` | 999px |

> ⚠️ `design-system.md` §5 omite `radius/xl` (24px) y declara el pill como `9999px`.

---

## 5. Sombras y elevación

![Sombras y Elevación](./assets/Sombras_Elevación.png)

Lámina: *"SOMBRAS Y ELEVACIÓN"* — 3 tokens sobre superficie oscura.

| Token | Efecto visible |
| :--- | :--- |
| `shadow/card` | Sombra difusa desplazada hacia abajo. Elevación baja. |
| `shadow/glow` | Halo dorado alrededor de toda la forma, sin desplazamiento. |
| `shadow/modal` | Sombra amplia y muy difusa. Elevación alta. |

Coincide con `design-system.md` §6, que aporta los valores numéricos.

---

## 6. Criterio de iconografía

![Criterio de Iconografía](./assets/Iconografía.png)

Lámina: *"CRITERIO DE ICONOGRAFÍA"* — 4 tiles de ejemplo con fondo oscuro, esquinas redondeadas e icono dorado con etiqueta superior.

Iconos mostrados: casa, libro, usuario, campana.

**Especificaciones declaradas en la lámina:**
- Grosor del trazo (Stroke): **1.5px**

> La lámina no indica librería ni caja de 24×24; eso está en `design-system.md` §8.

---

## 7. Estados de interacción

![Estados de Interacción](./assets/Interacción.png)

Lámina: *"ESTADOS DE INTERACCIÓN"* — 4 estados sobre un elemento dorado.

| Estado | Efecto visible |
| :--- | :--- |
| `Default` | Dorado plano con sombra sutil. |
| `Hover` | Halo dorado difuso alrededor (`shadow/glow`). |
| `Active (Pressed)` | Sin halo, elemento desplazado y sombra reducida. |
| `Disabled` | Gris desaturado, sin sombra. |

> ⚠️ La lámina no incluye el estado **Focus**, que sí define `design-system.md` §7 (2px sólido `--Primary`, offset 2px). Para navegación por teclado, rige el documento de sistema.

---

## 8. Verificación de contraste

![Verificación de Contraste](./assets/Contraste.png)

Lámina: *"VERIFICACIÓN DE CONTRASTE"* — 2 pares sobre fondo negro.

| Muestra | Ratio | Resultado |
| :--- | :--- | :--- |
| `Aa` blanco sobre negro | 14.2:1 | Pass AAA |
| `Aa` dorado sobre negro | 6.8:1 | Pass AA |

Coincide con `design-system.md` §9.

---

## Índice de láminas

| Sección | Archivo |
| :--- | :--- |
| Paleta de colores | `assets/Colores.png` |
| Tipografías | `assets/Tipografía.png` |
| Espaciado | `assets/Espaciado.png` |
| Radios | `assets/Radios.png` |
| Sombras y elevación | `assets/Sombras_Elevación.png` |
| Iconografía | `assets/Iconografía.png` |
| Estados de interacción | `assets/Interacción.png` |
| Verificación de contraste | `assets/Contraste.png` |
