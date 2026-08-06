# Kontrol Design System v2.0 (HU-32)

**Project:** Kontrol - Management for Micro-businesses  
**Visual Identity:** Luxury Dark Mode (Gold & Black)  
**Status:** Fully synchronized with `globals.css`

---

## 1. Identity & Goal
The Kontrol Design System is built to transform fragmented, informal business management into a high-end, centralized digital experience. By using a **"Luxury Dark"** aesthetic, we provide a focused environment that emphasizes financial health and professional growth.

## 2. Color Palette (Tokens & Variables)
Our color system is divided into functional groups to ensure consistency between design and code.

### Core Colors
| Figma Token | CSS Variable | Hex/Value | Usage |
| :--- | :--- | :--- | :--- |
| `color/primary` | `--Primary` | `#caa860` | Main brand gold. |
| `color/primary2` | `--Primary2` | `#b27f2a` | Secondary gold / Active states. |
| `color/Background` | `--Background` | `rgba(0,0,0,0.92)` | Base layer background. |
| `color/Background2` | `--Background2` | `#120f07` | Main surface / Card background. |
| `color/Text` | `--Text` | `#faf8f5` | Primary high-contrast text. |

### Text & Semantic Ramp
*   **Text Hierarchy:** 
    *   `--TextSoft`: `#cfc9bf` (Secondary high)
    *   `--TextMuted`: `#989083` (Secondary)
    *   `--TextDim`: `#6e6558` (Tertiary / Meta)
    *   `--TextFaint`: `#565045` (Disabled)
    *   `--TextPlaceholder`: `#4a4030`
*   **Status Colors:** 
    *   `--Success`: `rgb(15, 77, 15)`
    *   `--Error`: `rgb(128, 13, 13)`
    *   `--Warning`: `rgb(120, 80, 10)`
*   **Form Elements:** 
    *   `--InputBg`: `rgba(255, 255, 255, 0.04)`
    *   `--InputFocusBg`: `rgba(202, 168, 96, 0.05)`
    *   `--BtnText`: `#0e0c08`

## 3. Typography System
We use a dual-font strategy to balance elegance with readability.

*   **Titles (Display):** `Playfair Display` (Serif) - Assigned to `--font-display`.
*   **UI & Data:** `Manrope` (Sans-Serif) - Assigned to `--font-sans`.
*   **Technical:** `JetBrains Mono` - Assigned to `--font-mono`.

### Typographic Scale
| Token | Size (px) | Size (rem) | Usage |
| :--- | :--- | :--- | :--- |
| `text-3xl` | 42px | 2.625rem | Main Dashboard titles. |
| `text-xl` | 24px | 1.5rem | Section headers and card titles. |
| `text-base` | 14px | 0.875rem | Default UI body text. |
| `text-2xs` | 11px | 0.6875rem | Captions, pills, and metadata. |

## 4. Spacing System (8pt Grid)
We use a fixed scale to ensure mathematical harmony in the layout.

*   **space-1:** 4px
*   **space-2:** 8px
*   **space-3:** 12px
*   **space-4:** 16px
*   **space-5:** 24px
*   **space-6:** 32px
*   **space-8:** 48px

## 5. Corner Radii
Subtle rounded corners maintain the "Luxury" feel without appearing too informal.

*   **radius-sm:** 4px (Buttons, Inputs).
*   **radius-md:** 8px (Standard Cards).
*   **radius-lg:** 12px (Modals & Overlays).
*   **radius-pill:** 9999px (Status Badges / Avatars).

## 6. Elevation & Shadows
Designed specifically for dark backgrounds using "Glow" effects to provide depth.

*   **Shadow/Card:** `0, 4, 20, 0, rgba(0,0,0, 0.5)` - Depth for surface elements.
*   **Shadow/Glow:** `0, 0, 15, 5, #caa860 (50% Opacity)` - Used for gold interactive elements (Hover).
*   **Shadow/Modal:** `0, 10, 40, 0, rgba(0,0,0, 0.8)` - Focus for top-layer components.

## 7. Interaction States
*   **Hover:** 115% brightness increase + `shadow/glow`.
*   **Active (Pressed):** 0.98 scale transform for tactile feedback.
*   **Disabled:** 30% opacity + `cursor: not-allowed`.
*   **Focus:** 2px solid `--Primary` with 2px offset for keyboard navigation.

## 8. Iconography
*   **Library:** Lucide Icons / Heroicons.
*   **Stroke Weight:** 1.5px (Fine/Modern).
*   **Sizing:** 24x24px bounding box for touch targets.

## 9. Accessibility (WCAG 2.1 Compliance)
*   **Primary Contrast:** `--Text` (#faf8f5) on `--Background` (black) is **14.2:1** (Passes AAA).
*   **Interactive Contrast:** `--Primary` (#caa860) on `--Background2` (#120f07) is **6.8:1** (Passes AA).
*   **Target Size:** All interactive elements maintain a minimum height of 40px for mobile accessibility.

## Visual Reference
> Transcripción literal de estas láminas (nombres de token tal como están en Figma): [`design-tokens-figma.md`](./design-tokens-figma.md)

![Paleta de Colores](./assets/Colores.png)
![Tipografía](./assets/Tipografía.png)
![Sistema de Espaciado](./assets/Espaciado.png)
![Radios de Borde](./assets/Radios.png)
![Sombras y Elevación](./assets/Sombras_Elevación.png)
![Criterio de Iconografía](./assets/Iconografía.png)
![Estados de Interacción](./assets/Interacción.png)
![Verificación de Contraste](./assets/Contraste.png)