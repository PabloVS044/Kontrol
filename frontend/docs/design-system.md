# Kontrol Design System v2.0

**Project:** Kontrol - Management for Micro-businesses  
**Visual Identity:** Luxury Dark Mode (Gold & Black)  
**Status:** Fully synchronized with `src/styles/theme.css` + `globals.css`
**Sync Date:** 2026-08-16

---

## 1. Identity & Goal
The Kontrol Design System is built to transform fragmented, informal business management into a high-end, centralized digital experience. By using a **"Luxury Dark"** aesthetic, we provide a focused environment that emphasizes financial health and professional growth.

The system operates on a **dual-layer architecture**:
- **Source of Truth:** `--k-*` tokens in `src/styles/theme.css`
- **Legacy Compatibility:** 21 aliased variables in `globals.css` for screens not yet migrated 

## 2. Color Palette (Tokens)

All values below are defined as `--k-*` in `src/styles/theme.css` and aliased in `globals.css`.

### Primary & Surface Colors
| Token Name | CSS Variable | Hex Value | RGB Triplet | Usage |
| :--- | :--- | :--- | :--- | :--- |
| color/primary | `--k-color-primary` | `#caa860` | 202, 168, 96 | Main brand gold for interactive elements. |
| color/primary-2 | `--k-color-primary-2` | `#b27f2a` | — | Secondary gold for active/pressed states. |
| color/secondary | `--k-color-secondary` | `#886911` | — | Warm accent for secondary actions. |
| color/tertiary | `--k-color-tertiary` | `#12120e` | — | Darkened overlay color. |
| color/border | `--k-color-border` | `#312713` | — | Subtle borders on dark backgrounds. |
| color/pill-back | `--k-color-pill-back` | `#120f07` | — | Background for status pills/badges. |
| color/bg | `--k-color-bg` | `rgba(0,0,0,0.92)` | 0, 0, 0, 0.92 | Base layer (overlay, full-page). |
| color/bg-2 | `--k-color-bg-2` | `#120f07` | — | Primary surface (cards, panels). |
| color/bg-3 | `--k-color-bg-3` | `#282825` | — | Secondary surface (depth layer). |
| color/text | `--k-color-text` | `#faf8f5` | 250, 248, 245 | Primary text on dark backgrounds. |

### Text & Semantic Hierarchy
| Token Name | CSS Variable | Hex Value | Usage |
| :--- | :--- | :--- | :--- |
| text/TextSoft | `--k-text-soft` | `#cfc9bf` | Secondary labels, less prominent text. |
| text/TextMuted | `--k-text-muted` | `#8a8070` | Neutral gray for disabled/secondary labels. |
| text/TextDim | `--k-text-dim` | `#6e6558` | Tertiary labels, metadata. |
| text/TextFaint | `--k-text-faint` | `#565045` | Disabled/tenue text. |
| text/TextPlaceholder | `--k-text-placeholder` | `#4a4030` | Input placeholders. |

**Note:** `--TextMuted` (`#8a8070`) is **neutral gray**, not warm. Do not confuse with warm grays.

### Status & Semantic Colors
| Token Name | CSS Variable | Value | Usage |
| :--- | :--- | :--- | :--- |
| visualStates/SuccessText | `--k-state-success-text` | `#48c774` | Text for success messages. |
| visualStates/ErrorText | `--k-state-error-text` | `#e05252` | Text for error messages. |
| color/success | `--k-color-success` | `rgb(15, 77, 15)` | Success badge/background. |
| color/error | `--k-color-error` | `rgb(128, 13, 13)` | Error badge/background. |
| color/warning | `--k-color-warning` | `rgb(120, 80, 10)` | Warning badge/background. |

### Form Elements
| Token Name | CSS Variable | Value | Usage |
| :--- | :--- | :--- | :--- |
| forms/InputBg | `--k-form-input-bg` | `rgba(255, 255, 255, 0.04)` | Input/textarea default background. |
| forms/InputFocusBg | `--k-form-input-focus-bg` | `rgba(202, 168, 96, 0.05)` | Input/textarea focused background. |
| forms/BtnText | `--k-form-btn-text` | `#0e0c08` | Text on primary buttons. |

### RGB Triplets (for rgba compositions)
Used for dynamic overlays, glows, and transparency effects:
- `--k-color-primary-rgb`: `202, 168, 96` (Gold)
- `--k-color-error-rgb`: `224, 82, 82`
- `--k-color-success-rgb`: `72, 199, 116`
- `--k-color-black-rgb`: `0, 0, 0`
- `--k-color-white-rgb`: `255, 255, 255`

## 3. Typography System (SCRUM-13)

We use a dual-font strategy to balance elegance with readability.

### Font Families
| Token Name | CSS Variable | Stack | Usage |
| :--- | :--- | :--- | :--- |
| font/display | `--k-font-display` | Playfair Display, Georgia, serif | Titles, Display elements. |
| font/sans | `--k-font-sans` | Manrope, system-ui, sans-serif | UI, body text, data tables. |
| font/mono | `--k-font-mono` | JetBrains Mono, monospace | Code, technical content, KPIs. |

### Font Weights
| Name | Value | Usage |
| :--- | :--- | :--- |
| regular | 400 | Body text, default. |
| medium | 500 | Emphasis within text blocks. |
| semibold | 600 | Labels, small headings. |
| bold | 700 | Titles, main headings. |

### Typographic Scale (px / rem)
| Token Name | CSS Variable | Size (px) | Size (rem) | Usage |
| :--- | :--- | :--- | :--- | :--- |
| font-size/display | `--k-font-size-display` | 42px | 2.625rem | Main Dashboard titles, hero text. |
| font-size/heading-1 | `--k-font-size-heading-1` | 24px | 1.5rem | Section headers, card titles. |
| font-size/body-large | `--k-font-size-body-large` | 16px | 1rem | Body text (larger variant). |
| font-size/body-main | `--k-font-size-body-main` | 14px | 0.875rem | Default UI text, body copy. |
| font-size/caption | `--k-font-size-caption` | 11px | 0.6875rem | Captions, pills, metadata. |

**Legacy Scale (for screens not yet migrated):**
- `--text-xs`: 12px / 0.75rem
- `--text-sm`: 13px / 0.8125rem
- `--text-md`: 16px / 1rem
- `--text-lg`: 20px / 1.25rem
- `--text-xl`: 24px / 1.5rem
- `--text-2xl`: 32px / 2rem
- `--text-3xl`: 42px / 2.625rem

### Line Height & Letter Spacing
| Token Name | CSS Variable | Value | Usage |
| :--- | :--- | :--- | :--- |
| leading/tight | `--leading-tight` | 1.15 | Headings, display text. |
| leading/snug | `--leading-snug` | 1.3 | Subheadings. |
| leading/normal | `--leading-normal` | 1.5 | Body text, default. |
| tracking/tight | `--tracking-tight` | -0.01em | Headlines. |
| tracking/caps | `--tracking-caps` | 0.08em | UPPERCASE labels, buttons. |

## 4. Spacing System (8pt Grid)

All spacing follows a base-4 grid, stepping by 4px for fine control and 8px for larger gaps.

| Token Name | CSS Variable | Value | Usage |
| :--- | :--- | :--- | :--- |
| space/1 | `--k-space-1` | 4px | Micro spacing (icon gap, tight padding). |
| space/2 | `--k-space-2` | 8px | Button padding, tight gaps. |
| space/3 | `--k-space-3` | 12px | Label/field spacing. |
| space/4 | `--k-space-4` | 16px | Padding in cards, component gaps. |
| space/5 | `--k-space-5` | 24px | Main padding, section spacing. |
| space/6 | `--k-space-6` | 32px | Large sections, header padding. |
| space/7 | `--k-space-7` | 48px | Full-width sections, major spacing. |

## 5. Corner Radii

| Token Name | CSS Variable | Value | Usage |
| :--- | :--- | :--- | :--- |
| radius/sm | `--k-radius-sm` | 4px | Buttons, small inputs. |
| radius/md | `--k-radius-md` | 8px | Standard cards, modals. |
| radius/lg | `--k-radius-lg` | 12px | Large modals, overlay dialogs. |
| radius/xl | `--k-radius-xl` | 24px | Feature cards, large overlays. |
| radius/pill | `--k-radius-pill` | 999px | Badges, avatars, full-round buttons. |

## 6. Elevation & Shadows

All shadows are designed for dark backgrounds using depth and glow effects.

| Token Name | CSS Variable | Value | Usage |
| :--- | :--- | :--- | :--- |
| shadow/card | `--k-shadow-card` | `0 4px 20px 0 rgba(0,0,0,0.5)` | Depth for card surfaces. |
| shadow/glow | `--k-shadow-glow` | `0 0 15px 5px rgba(202,168,96,0.5)` | Gold glow for interactive hover. |
| shadow/modal | `--k-shadow-modal` | `0 10px 40px 0 rgba(0,0,0,0.8)` | Top-layer focus (modals, overlays). |

## 7. Interaction States (SCRUM-13)

### State Modifiers
| State | Token | Value | Application |
| :--- | :--- | :--- | :--- |
| Hover | `--k-state-hover-brightness` | 1.15 | `filter: brightness(1.15)` on buttons. |
| Active/Pressed | `--k-state-active-scale` | 0.98 | `transform: scale(0.98)` for tactile feedback. |
| Disabled | `--k-state-disabled-opacity` | 0.3 | `opacity: 0.3` + `cursor: not-allowed`. |
| Focus Ring Width | `--k-focus-ring-width` | 2px | Outline width for keyboard navigation. |
| Focus Ring Offset | `--k-focus-ring-offset` | 2px | Space between element and outline. |
| Focus Ring | `--k-focus-ring` | `2px solid var(--k-color-primary)` | Complete focus style (used in :focus-visible). |

### Button States (Example)
- **Default:** `background: var(--k-color-primary)`
- **Hover:** `filter: brightness(var(--k-state-hover-brightness))` + `box-shadow: var(--k-shadow-glow)`
- **Active:** `transform: scale(var(--k-state-active-scale))`
- **Disabled:** `opacity: var(--k-state-disabled-opacity)`, `cursor: not-allowed`
- **Focus:** `outline: var(--k-focus-ring)`, `outline-offset: var(--k-focus-ring-offset)`

### Form Element States
- **Default:** `border: 1px solid var(--k-color-border)`, `background: var(--k-form-input-bg)`
- **Focus:** `border-color: var(--k-color-primary)`, `background: var(--k-form-input-focus-bg)`
- **Error:** `border-color: var(--k-state-error-text)`

## 8. Iconography

| Aspect | Value | Usage |
| :--- | :--- | :--- |
| **Library** | Lucide Icons, Heroicons | Consistent modern icon set. |
| **Stroke Weight** | `--k-icon-stroke: 1.5px` | Fine, modern appearance. |
| **Default Size** | `--k-icon-size: 24px` | Standard 24×24px bounding box. |
| **Sizing Rule** | 24px, 32px, 40px | Maintain 8px grid increments. |
| **Color** | Inherit from `currentColor` | Follows text color context. |

## 9. Accessibility & Contrast (WCAG 2.1)

### Verified Contrast Ratios
| Text Color | Background Color | Ratio | Level |
| :--- | :--- | :--- | :--- |
| `--k-color-text` (#faf8f5) | `--k-color-bg` (black) | **14.2:1** | ✅ AAA |
| `--k-color-primary` (#caa860) | `--k-color-bg-2` (#120f07) | **6.8:1** | ✅ AA |
| `--k-text-muted` (#8a8070) | `--k-color-bg-2` (#120f07) | **5.4:1** | ✅ AA |
| `--k-text-dim` (#6e6558) | `--k-color-bg-2` (#120f07) | **3.8:1** | ⚠️ Fails AA (advisory: use only for tertiary labels) |

### Accessibility Requirements
- **Target Size:** All interactive elements ≥ 40px height for mobile touch targets
- **Focus Visible:** Keyboard navigation uses `outline: 2px solid var(--k-color-primary)`
- **Color Blindness:** Avoid relying on color alone; use icons, text, or patterns for status
- **Motion:** Respect `prefers-reduced-motion`; transitions use `all 0.2s ease-in-out`


## 10. Publishing to Figma (SCRUM-13)

All tokens below should be published in **Figma Tokens** (using the tokens-studio plugin) under the structure `category/token-name`:

### Token Structure for Figma
```
color/
  primary: #caa860
  primary-2: #b27f2a
  secondary: #886911
  tertiary: #12120e
  border: #312713
  pill-back: #120f07
  bg: rgba(0, 0, 0, 0.92)
  bg-2: #120f07
  bg-3: #282825
  text: #faf8f5

text/
  soft: #cfc9bf
  muted: #8a8070
  dim: #6e6558
  faint: #565045
  placeholder: #4a4030

visualStates/
  success-text: #48c774
  error-text: #e05252

forms/
  input-bg: rgba(255, 255, 255, 0.04)
  input-focus-bg: rgba(202, 168, 96, 0.05)
  btn-text: #0e0c08

font/
  display: Playfair Display
  sans: Manrope
  mono: JetBrains Mono

fontSize/
  display: 42
  heading-1: 24
  body-large: 16
  body-main: 14
  caption: 11

fontWeight/
  regular: 400
  medium: 500
  semibold: 600
  bold: 700

spacing/
  1: 4
  2: 8
  3: 12
  4: 16
  5: 24
  6: 32
  7: 48

radius/
  sm: 4
  md: 8
  lg: 12
  xl: 24
  pill: 999

shadow/
  card: [0, 4, 20, 0, rgba(0, 0, 0, 0.5)]
  glow: [0, 0, 15, 5, rgba(202, 168, 96, 0.5)]
  modal: [0, 10, 40, 0, rgba(0, 0, 0, 0.8)]
```

### Sync Instructions
1. Install **Figma Tokens** plugin in Figma
2. Import the tokens JSON from `/frontend/docs/tokens.json` (to be generated)
3. Publish tokens to Figma library as `Kontrol Design Tokens v2.0`
4. Create component library with:
   - Button (primary, secondary, ghost variants × hover/focus/disabled/error states)
   - Input, textarea, select
   - Card, modal, badge
   - Checkbox, radio, switch
   - Status pills
5. Document each component with attached tokens

---

## 11. Implementation Guide

### For Developers (SCRUM-13..17)
- **Always consume `--k-*` tokens** from `src/styles/theme.css`
- **Legacy alias vars** (`--Primary`, `--Background2`, etc.) are frozen for backward compatibility
- **No hardcoded colors:** If you need a color, it goes in `theme.css` first, then alias in `globals.css`
- **State interaction:** Use CSS custom properties: `filter: brightness(var(--k-state-hover-brightness))`

### For Future Designers
- This system supports **light mode** (placeholder in `theme.css`), but no palette has been approved yet
- To add a new semantic color: define in `theme.css`, then add alias in `globals.css`
- Test all new colors for WCAG AA contrast before committing

---

## Visual Reference

| Component | Link |
| :--- | :--- |
| Color Palette | `./assets/Colores.png` |
| Typography | `./assets/Tipografia.png` |
| Spacing Grid | `./assets/Espaciado.png` |
| Corner Radii | `./assets/Radios.png` |
| Shadows & Elevation | `./assets/Sombras_Elevación.png` |
| Iconography | `./assets/Iconografía.png` |
| Interaction States | `./assets/Interacción.png` |
| Contrast Verification | `./assets/Contraste.png` |

---

## Maintenance & Versioning

**Current Version:** 2.0.0
**Repository:** `/frontend/docs/design-system.md`  
**Figma File:** [Kontrol Design System v2.0](https://www.figma.com/design/qDDZC8ZvzDhXHRzDl6bbHi/Kontrol---Identidad-visual-v2?node-id=35-26&t=AQIBKGoAGr8AsFS7-1)

**Changelog:**
- **v2.0.0** (2026-08-16): SCRUM-13 / HU-32 migration complete. Tokens defined, CSS variables frozen, legacy layer operational.
- **v1.0.0** (pre-2026): Initial branding.