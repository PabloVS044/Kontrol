# Kontrol Design System v2.0

**Project:** Kontrol - Management for Micro-businesses  
**Visual Identity:** Luxury Dark Mode (Gold & Black), with a light theme proposal  
**Status:** Fully synchronized with `src/styles/theme.css` + `globals.css`
**Sync Date:** 2026-10-25 (light theme, surface tokens and z-index scale — SCRUM-93)

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
| text/TextMuted | `--k-text-muted` | `#a0998d` | Secondary labels; text of unselected options. |
| text/TextDim | `--k-text-dim` | `#9e9485` | Tertiary labels, metadata. |
| text/TextFaint | `--k-text-faint` | `#988f7e` | Lowest-emphasis readable text (hints, captions). |
| text/TextPlaceholder | `--k-text-placeholder` | `#a18d6d` | Input placeholders (warmer, so it never reads as a typed value). |
| — (implementation) | `--k-text-disabled` | `#565045` | **Only** for disabled controls. Exempt from WCAG 1.4.3; never for informative text. |

**Note:** every token in this ramp reaches **at least 4.5:1** (WCAG AA) on the lightest surface in use, `--k-color-bg-3` (#282825). Previous values (muted `#989083`, dim `#6e6558`, faint `#565045`, placeholder `#4a4030`) went down to 1.5:1 and were reported illegible in usability tests at low brightness, at distance and without glasses. Only lightness changed; hue and saturation are the Figma ones. Hierarchy between levels comes from size and weight, not from an unreadable gray.

The neutral implementation ramp follows the same rule: `--k-gray-1`/`-2` `#909090`, `--k-gray-3` `#929292`, `--k-gray-4` `#939393`, `--k-gray-5`/`-6` `#8f8f8f`. Hover borders that used to borrow `--k-gray-1` now use `--k-shade-8` (`#333333`).

### Status & Semantic Colors
| Token Name | CSS Variable | Value | Usage |
| :--- | :--- | :--- | :--- |
| visualStates/SuccessText | `--k-state-success-text` | `#48c774` | Text for success messages. |
| visualStates/ErrorText | `--k-state-error-text` | `#e46868` | Text for error messages (was `#e05252`; lightened to stay ≥ 4.5:1 over the animated background). |
| color/success | `--k-color-success` | `rgb(15, 77, 15)` | Success badge/background. |
| color/error | `--k-color-error` | `rgb(128, 13, 13)` | Error badge/background. |
| color/warning | `--k-color-warning` | `rgb(120, 80, 10)` | Warning badge/background. |

### Form Elements
| Token Name | CSS Variable | Value | Usage |
| :--- | :--- | :--- | :--- |
| forms/InputBg | `--k-form-input-bg` | `rgba(var(--k-ink-rgb), 0.04)` | Input/textarea default background. |
| forms/InputFocusBg | `--k-form-input-focus-bg` | `rgba(var(--k-color-primary-rgb), 0.05)` | Input/textarea focused background. |
| forms/BtnText | `--k-form-btn-text` | `#0e0c08` | Text on primary buttons. |

### RGB Triplets (for rgba compositions)
Used for dynamic overlays, glows, and transparency effects:
- `--k-color-primary-rgb`: `202, 168, 96` (Gold)
- `--k-color-error-rgb`: `224, 82, 82`
- `--k-color-success-rgb`: `72, 199, 116`
- `--k-color-black-rgb`: `0, 0, 0`
- `--k-color-white-rgb`: `255, 255, 255`

`black-rgb` and `white-rgb` are literal and never change with the theme. For tints that must follow the theme use:
- `--k-ink-rgb`: tint of the text color (`255, 255, 255` in dark, `0, 0, 0` in light) — subtle hovers and borders.
- `--k-canvas-rgb`: tint of the background (`0, 0, 0` in dark, the page tone in light) — veils and translucent panels.

### Categorical Hues
Status, priority and chart colors. In dark they keep the values the screens already used; in light the same hue is darkened to WCAG AA. Each one has a `-rgb` triplet for transparencies (`rgba(var(--k-hue-blue-rgb), 0.1)`).

| CSS Variable | Dark | Light |
| :--- | :--- | :--- |
| `--k-hue-rose` | `#fb7185` | `#a8041d` |
| `--k-hue-blue` | `#60a5fa` | `#0550ac` |
| `--k-hue-emerald` | `#34d399` | `#155f44` |
| `--k-hue-green` | `#4ade80` | `#115f2e` |
| `--k-hue-violet` | `#a78bfa` | `#4c14f5` |
| `--k-hue-orange` | `#fb923c` | `#873e03` |
| `--k-hue-amber` | `#f59e0b` | `#744b05` |

Chart lines use `--k-chart-planned` and `--k-chart-actual` (gold and green): same as `--k-color-primary` / `--k-state-success-text` in dark, brighter in light (≥ 3:1 for graphics).

### Neutral Ramp Additions
`--k-shade-0` (`#050505`), `--k-shade-3b` (`#151515`) and `--k-shade-6b` (`#252525`) cover grays the screens used as literals; their dark value is exactly that literal.

### Surfaces
| CSS Variable | Dark | Light | Usage |
| :--- | :--- | :--- | :--- |
| `--k-surface-scrim` | `rgba(var(--k-canvas-rgb), 0.6)` | `rgba(var(--k-canvas-rgb), 0.6)` | Veil of `<AppSurface>` over the animated background. |
| `--k-surface-panel` | `rgba(var(--k-canvas-rgb), 0.6)` | `#d2cec6` | `<AppSurface block>`: text blocks on public screens (onboarding, 404). |
| `--k-surface-panel-border` | `transparent` | `#b5ae9f` | Border of the block surface (`box-shadow: inset`). |
| `--k-surface-section` | `rgba(var(--k-color-black-rgb), 0.94)` | `#d2cec6` | Large section panels (Teams). |
| `--k-surface-card` | `var(--k-color-bg-2)` | `#d2cec6` | Container cards (Dashboard members, Admin panels). |
| `--k-surface-chart` | `var(--k-color-bg)` | `var(--k-color-tertiary)` | Chart and summary cards (Dashboard). |
| `--k-surface-warm` | `#161310` | `#efebe3` | Warm floating surfaces (Birdie bubble, agent input). |
| `--k-surface-warm-2` | `#1f1a13` | `#e7e1d6` | Second warm step. |
| `--k-surface-floating` | `#0f0f0f` | `#e2ddd3` | Floating chat panel. |
| `--k-surface-floating-2` | `#111111` | `#d9d3c7` | Floating chat controls. |
| `--k-surface-floating-3` | `#1a1a1a` | `#d0c9bc` | Floating chat received bubbles. |
| `--k-surface-code` | `#000000` | `rgba(0, 0, 0, 0.07)` | Inline code chips and code blocks. |
| `--k-surface-track` | `#111111` | `#c2c2c2` | Empty track of progress bars. |
| `--k-overlay-backdrop` | `rgba(var(--k-color-black-rgb), 0.78)` | `rgba(var(--k-color-black-rgb), 0.4)` | Translucent backdrop behind every modal. |

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
| — (implementation) | `--k-shadow-dropdown` | `0 8px 32px rgba(0,0,0,0.6)` | Dropdown menus (company selector). |

The light theme redeclares shadows with lower opacity (card `0.08`, modal `0.18`, dropdown `0.15`).

## 7. Interaction States (SCRUM-13)

### State Modifiers
| State | Token | Value | Application |
| :--- | :--- | :--- | :--- |
| Hover | `--k-state-hover-brightness` | 1.15 | `filter: brightness(1.15)` on buttons. |
| Active/Pressed | `--k-state-active-scale` | 0.98 | `transform: scale(0.98)` for tactile feedback. |
| Disabled | `--k-state-disabled-opacity` | 0.3 | `opacity: 0.3` + `cursor: not-allowed`. |
| Selected indicator | `--k-state-selected-indicator` | `inset 0 -2px 0 var(--k-color-primary)` | `box-shadow` on the selected option of a tab/filter group. |
| Disabled outline | `--k-state-disabled-outline` | `1px dashed var(--k-text-disabled)` | `outline` on disabled borderless controls. |
| Focus Ring Width | `--k-focus-ring-width` | 2px | Outline width for keyboard navigation. |
| Focus Ring Offset | `--k-focus-ring-offset` | 2px | Space between element and outline. |
| Focus Ring | `--k-focus-ring` | `2px solid var(--k-color-primary)` | Complete focus style (used in :focus-visible). |

### Button States (Example)
- **Default:** `background: var(--k-color-primary)`
- **Hover:** `filter: brightness(var(--k-state-hover-brightness))` + `box-shadow: var(--k-shadow-glow)`
- **Active:** `transform: scale(var(--k-state-active-scale))`
- **Disabled:** `opacity: var(--k-state-disabled-opacity)`, `cursor: not-allowed`
- **Focus:** `outline: var(--k-focus-ring)`, `outline-offset: var(--k-focus-ring-offset)`

### Option States (tabs, filters, segmented controls)
Selected, unselected and disabled must differ by more than color: in usability tests unselected options read as disabled.

| State | Text | Non-color cue |
| :--- | :--- | :--- |
| Unselected | `--k-text-muted` (AA) | Normal border; hover active. |
| Selected | `--k-color-primary` | Tinted background + `--k-state-selected-indicator` (pills: doubled ring) + `aria-pressed="true"`. |
| Disabled | `--k-text-disabled` | `--k-state-disabled-outline` (dashed), `cursor: not-allowed`, no hover, `disabled` attribute. |

### Form Element States
- **Default:** `border: 1px solid var(--k-color-border)`, `background: var(--k-form-input-bg)`
- **Focus:** `border-color: var(--k-color-primary)`, `background: var(--k-form-input-focus-bg)`
- **Error:** `border-color: var(--k-state-error-text)`

## 8. Layers (z-index)

Every `z-index` in the app uses this scale; there are no loose numbers. Two neighbouring layers in the same stacking context are separated with `calc(var(--k-z-x) ± n)`, `n ≤ 2`. The only exception is `CardsSwap`, whose order is computed by gsap.

| CSS Variable | Value |
| :--- | :--- |
| `--k-z-negative` | -1 |
| `--k-z-background` | 0 |
| `--k-z-base` | 1 |
| `--k-z-raised` | 2 |
| `--k-z-top` | 3 |
| `--k-z-sticky` | 10 |
| `--k-z-elevated` | 20 |
| `--k-z-popover` | 40 |
| `--k-z-nav` | 100 |
| `--k-z-dropdown` | 200 |
| `--k-z-floating` | 500 |
| `--k-z-modal-overlay` | 1000 |
| `--k-z-modal` | 1001 |
| `--k-z-overlay` | 1400 |
| `--k-z-overlay-top` | 2000 |
| `--k-z-system` | 10000 |

## 9. Iconography

| Aspect | Value | Usage |
| :--- | :--- | :--- |
| **Library** | Lucide Icons, Heroicons | Consistent modern icon set. |
| **Stroke Weight** | `--k-icon-stroke: 1.5px` | Fine, modern appearance. |
| **Default Size** | `--k-icon-size: 24px` | Standard 24×24px bounding box. |
| **Sizing Rule** | 24px, 32px, 40px | Maintain 8px grid increments. |
| **Color** | Inherit from `currentColor` | Follows text color context. |

## 10. Accessibility & Contrast (WCAG 2.1)

### Verified Contrast Ratios
| Text Color | Background Color | Ratio | Level |
| :--- | :--- | :--- | :--- |
Computed with the WCAG 2.1 relative-luminance formula and enforced by `tests/theme.test.js`. Columns: card surface `#111111`, lightest surface `--k-color-bg-3` (#282825), and the brightest pixel of the animated background behind text (`#272727`, measured in the browser).

| Text Color | on #111111 | on bg-3 | on bg peak | Level |
| :--- | :--- | :--- | :--- | :--- |
| `--k-color-text` (#faf8f5) | **17.81:1** | 13.95:1 | 14.09:1 | ✅ AAA |
| `--k-color-primary` (#caa860) | **8.35:1** | 6.53:1 | 6.60:1 | ✅ AA |
| `--k-text-soft` (#cfc9bf) | **11.47:1** | 8.98:1 | 9.08:1 | ✅ AAA |
| `--k-text-muted` (#a0998d) | **6.69:1** | 5.23:1 | 5.29:1 | ✅ AA |
| `--k-text-dim` (#9e9485) | **6.32:1** | 4.95:1 | 5.00:1 | ✅ AA |
| `--k-text-faint` (#988f7e) | **5.90:1** | 4.62:1 | 4.67:1 | ✅ AA |
| `--k-text-placeholder` (#a18d6d) | **5.89:1** | 4.61:1 | 4.66:1 | ✅ AA |
| `--k-gray-1..4` (#909090–#939393) | **5.91–6.15:1** | 4.63–4.81:1 | 4.68–4.86:1 | ✅ AA |
| `--k-gray-5`/`-6` (#8f8f8f) | **5.84:1** | — | 4.62:1 | ✅ AA |
| `--k-state-error-text` (#e46868) | **5.83:1** | — | 4.61:1 | ✅ AA |
| `--k-state-success-text` (#48c774) | **8.72:1** | — | 6.90:1 | ✅ AA |
| `--k-form-btn-text` (#0e0c08) on `--k-color-primary` | **8.64:1** | | | ✅ AA |
| `--k-text-disabled` (#565045) | 2.36:1 | | | Exempt (disabled controls only, WCAG 1.4.3) |

### Animated Background
The app background (`Waves`, mounted in `App.vue`) reads its own token, `--k-bg-wave-line` (`#faf8f5`), not the text token, and is capped with `maxIntensity="0.11"` so its glare never sits behind text: measured peak `#272727` instead of `#ffffff`. In the light theme the whole layer is inverted with `--k-bg-wave-filter: invert(1)`. Native controls (`input`, `select`, `textarea`, `option`) use `color-scheme: var(--k-color-scheme)` so their popups follow the theme.

### Accessibility Requirements
- **Target Size:** All interactive elements ≥ 40px height for mobile touch targets
- **Focus Visible:** Keyboard navigation uses `outline: 2px solid var(--k-color-primary)`
- **Color Blindness:** Avoid relying on color alone; use icons, text, or patterns for status
- **Motion:** Respect `prefers-reduced-motion`; transitions use `all 0.2s ease-in-out`


## 11. Light Theme

**Status:** proposal derived from Luxury Dark, pending Design validation.

### How it is selected
- `useTheme` resolves the theme on startup: the choice made in **Settings → Your preferences → Theme**, otherwise the system preference (`prefers-color-scheme`), otherwise dark.
- The selector offers **System | Dark | Light**. Dark and Light are remembered in the browser (`localStorage['kontrol:theme']`); System clears that choice.
- The theme is written as `data-theme` on `<html>`. `theme.css` declares the light values in `[data-theme='light']` and, identically, in `@media (prefers-color-scheme: light) :root:not([data-theme])` for the first paint without JS.
- Landing, login and register are always dark (`data-theme="dark"` on their root).

### Derivation
- Surfaces and neutral ramp: HSL lightness inverted, same hue and saturation, then toned down to a stone gray so the interface is not white (page `#dbd8d3`, cards `#e4e4e4`–`#eaeaea`, panels `#d2cec6`).
- Text, gold, states and hues: same hue, darkened until they pass 4.5:1 on every light surface.
- Tokens built on `--k-ink-rgb`, `--k-canvas-rgb` or `--k-color-primary-rgb` (veil, hovers, inputs, alerts) are not redeclared: they follow the theme on their own.

### Verified Contrast — Light Theme
Enforced by `tests/theme.test.js` and checked on screen with the browser's contrast inspector. Columns: card `--k-shade-3` (`#e4e4e4`), `--k-color-bg-3` (`#cfcdc8`), block panel (`#d2cec6`) and the animated background peak (`#c9c9c9`).

| Text Color | Value | on shade-3 | on bg-3 | on panel | on bg peak |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `--k-color-text` | `#1a1712` | 14.05:1 | 11.25:1 | 11.39:1 | 10.79:1 |
| `--k-color-primary` | `#5e4a1f` | 6.67:1 | 5.34:1 | 5.41:1 | 5.12:1 |
| `--k-text-soft` | `#403a30` | 8.85:1 | 7.08:1 | 7.17:1 | 6.8:1 |
| `--k-text-muted` | `#575249` | 6.1:1 | 4.88:1 | 4.94:1 | 4.68:1 |
| `--k-text-dim` | `#5a5247` | 6.04:1 | 4.84:1 | 4.9:1 | 4.64:1 |
| `--k-text-faint` | `#595347` | 6.0:1 | 4.8:1 | 4.86:1 | 4.61:1 |
| `--k-text-placeholder` | `#5e503c` | 6.14:1 | 4.92:1 | 4.98:1 | 4.72:1 |
| `--k-gray-3` | `#535353` | 6.05:1 | 4.84:1 | 4.9:1 | 4.65:1 |
| `--k-state-error-text` | `#961a1a` | 6.72:1 | 5.37:1 | 5.44:1 | 5.16:1 |
| `--k-state-success-text` | `#1c5e34` | 6.12:1 | 4.9:1 | 4.96:1 | 4.7:1 |
| `--k-hue-blue` | `#0550ac` | 6.01:1 | 4.81:1 | 4.87:1 | 4.61:1 |
| `--k-hue-emerald` | `#155f44` | 6.0:1 | 4.8:1 | 4.86:1 | 4.61:1 |
| `--k-hue-green` | `#115f2e` | 6.12:1 | 4.9:1 | 4.96:1 | 4.7:1 |
| `--k-hue-violet` | `#4c14f5` | 6.06:1 | 4.85:1 | 4.91:1 | 4.65:1 |
| `--k-hue-orange` | `#873e03` | 6.07:1 | 4.86:1 | 4.92:1 | 4.66:1 |
| `--k-hue-amber` | `#744b05` | 6.0:1 | 4.81:1 | 4.86:1 | 4.61:1 |
| `--k-hue-rose` | `#a8041d` | 6.12:1 | 4.9:1 | 4.96:1 | 4.7:1 |

`--k-form-btn-text` (`#faf8f5`) on `--k-color-primary`: **8.0:1**.

## 12. Publishing to Figma (SCRUM-13)

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
  muted: #a0998d
  dim: #9e9485
  faint: #988f7e
  placeholder: #a18d6d

visualStates/
  success-text: #48c774
  error-text: #e46868

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

## 13. Implementation Guide

### For Developers (SCRUM-13..17)
- **Always consume `--k-*` tokens** from `src/styles/theme.css`
- **Legacy alias vars** (`--Primary`, `--Background2`, etc.) are frozen for backward compatibility
- **No hardcoded colors:** If you need a color, it goes in `theme.css` first, then alias in `globals.css`
- **State interaction:** Use CSS custom properties: `filter: brightness(var(--k-state-hover-brightness))`

### For Future Designers
- The **light theme** is a proposal (section 11); once Design validates it, its values replace the ones in `[data-theme='light']`
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

**Current Version:** 2.1.0
**Repository:** `/frontend/docs/design-system.md`  
**Figma File:** [Kontrol Design System v2.0](https://www.figma.com/design/qDDZC8ZvzDhXHRzDl6bbHi/Kontrol---Identidad-visual-v2?node-id=35-26&t=AQIBKGoAGr8AsFS7-1)

**Changelog:**
- **v2.1.0** (2026-10-25): SCRUM-93 / DT-09. Light theme proposal, theme selector in Settings, surface and hue tokens, z-index scale, legacy aliases retired from every screen in use.
- **v2.0.0** (2026-08-16): SCRUM-13 / HU-32 migration complete. Tokens defined, CSS variables frozen, legacy layer operational.
- **v1.0.0** (pre-2026): Initial branding.

> This file is the executable source of truth for the design system. The token documentation for the Figma board remains in [`design-tokens-figma.md`](./design-tokens-figma.md).
