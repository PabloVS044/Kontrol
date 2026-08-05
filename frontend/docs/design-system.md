# Kontrol Design System v2.0 
**Project:** Kontrol - Management for Micro-businesses (Librería Ana González)  
**Theme:** Luxury Dark Mode (Black & Gold)

## 1. Business Identity & Goal
The goal of this design system is to provide a consistent, high-end experience that transforms informal management into a professional digital environment. The "Luxury" aesthetic builds trust and clarity for owners and collaborators.

## 2. Color Palette
Our colors are optimized for high contrast on OLED screens and professional readability.

| Token | Hex | Opacity | Usage |
| :--- | :--- | :--- | :--- |
| `color/primary` | #CAA860 | 100% | Brand gold, primary actions, titles. |
| `color/primary-dark`| #B27F2A | 100% | Borders for active states and secondary buttons. |
| `color/bg-base` | #000000 | 100% | Main background (Pure black). |
| `color/bg-surface` | #0A0A0A | 100% | Cards, modals, and internal panels. |
| `color/text-main` | #FAF8F5 | 100% | Primary reading text (Off-white). |
| `color/text-muted` | #808080 | 100% | Captions, dates, and placeholders. |

## 3. Typography Scale
We use a combination of Serif for elegance and Sans-Serif for operational data.
- **Titles:** `Playfair Display` (Serif)
- **Body & Data:** `DM Sans` (Sans-Serif)

| Token | Font | Size | Weight | Usage |
| :--- | :--- | :--- | :--- | :--- |
| `font/display` | Playfair | 48px | Bold | Page Main Titles |
| `font/heading-1` | Playfair | 24px | SemiBold| Section Headers / Cards |
| `font/body-large` | DM Sans | 16px | Medium | Important Labels |
| `font/body-main` | DM Sans | 14px | Regular | General Reading |
| `font/caption` | DM Sans | 11px | Bold | Pills / Badges (All Caps) |

## 4. Spacing System (8pt Grid)
Ensures visual rhythm and mathematical consistency across layouts.
- `spacing/xs`: 4px
- `spacing/small`: 8px
- `spacing/md`: 16px
- `spacing/lg`: 24px
- `spacing/xl`: 32px
- `spacing/xxl`: 48px

## 5. Corner Radii
Subtle curves to maintain an elegant and modern look.
- `radius/small`: 4px (UI Controls, Inputs, Buttons)
- `radius/medium`: 8px (Standard Cards)
- `radius/large`: 12px (Modals & Overlays)
- `radius/full`: 999px (Status Badges / Pills)

## 6. Elevation & Shadows
Specifically designed to provide depth in dark interfaces without losing elegance.
- **Shadow/Card:** `0, 4, 20, 0, rgba(0,0,0, 0.5)` - Provides depth for surfaces.
- **Shadow/Glow:** `0, 0, 15, 5, #CAA860 (50% Opacity)` - Used for Hover states to represent gold illumination.
- **Shadow/Modal:** `0, 10, 40, 0, rgba(0,0,0, 0.8)` - Top layer focus for pop-ups.

## 7. Iconography
- **Library:** Lucide Icons / Heroicons.
- **Grid Size:** 24x24px bounding box.
- **Stroke Weight:** 1.5px for a clean, modern aesthetic.
- **Color Logic:** Gold for active states; Muted Gray for inactive elements.

## 8. Interaction States
- **Normal:** 100% color, no elevation.
- **Hover:** 115% brightness increase + `shadow/glow` effect.
- **Active (Click):** 0.98 scale transform (press feedback).
- **Disabled:** 30% opacity + `cursor: not-allowed`.

## 9. Accessibility & Contrast (WCAG 2.1)
We prioritize legibility for users with diverse visual conditions.
- **Text Contrast:** Main body text (#FAF8F5) on base black (#000000) yields a **14.2:1 contrast ratio**, exceeding the AAA standard.
- **UI Elements:** Gold highlights (#CAA860) on surface black (#0A0A0A) yield a **6.8:1 contrast ratio**, meeting the AA standard.
- **Interactive Targets:** All buttons maintain a minimum height of 44px to comply with touch-target guidelines.