/**
 * Kontrol — configuración de Tailwind (SCRUM-13 / HU-32)
 *
 * Tailwind NO define valores propios: cada escala apunta a los tokens de
 * `src/styles/theme.css`. Así las clases utilitarias y el CSS plano leen la
 * misma fuente de verdad y no pueden divergir. Para cambiar un color se edita
 * el token, nunca este archivo.
 *
 * `preflight: false` es deliberado: el reset global de Tailwind alteraría
 * márgenes y tipografía en las 19 hojas CSS que todavía no se han migrado
 * (SCRUM-14..17). Reactivarlo solo cuando no quede CSS legacy.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  corePlugins: {
    preflight: false,
  },
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      // Los nombres evitan duplicar el prefijo de la utilidad: `surface` en vez
      // de `bg` produce `bg-surface-2` y no `bg-bg-2`. Equivalencia con Figma
      // a la derecha de cada línea.
      colors: {
        primary: {
          DEFAULT: 'var(--k-color-primary)', //  color/primary
          2: 'var(--k-color-primary-2)', //      color/primary2
        },
        secondary: 'var(--k-color-secondary)', //   color/Secondary
        tertiary: 'var(--k-color-tertiary)', //     color/Tertiary
        border: 'var(--k-color-border)', //         color/Border
        'pill-back': 'var(--k-color-pill-back)', // color/PillBack
        surface: {
          DEFAULT: 'var(--k-color-bg)', //  color/Background
          2: 'var(--k-color-bg-2)', //      color/Background2
          3: 'var(--k-color-bg-3)', //      color/Background3
        },
        foreground: 'var(--k-color-text)', //     color/Text
        soft: 'var(--k-text-soft)', //            text/TextSoft
        muted: 'var(--k-text-muted)', //          text/TextMuted
        dim: 'var(--k-text-dim)', //              text/TextDim
        faint: 'var(--k-text-faint)', //          text/TextFaint
        placeholder: 'var(--k-text-placeholder)', // text/TextPlaceholder
        success: 'var(--k-color-success)', //     color/Success
        'success-fg': 'var(--k-state-success-text)', // visualStates/SuccessText
        error: 'var(--k-color-error)', //         color/Error
        'error-fg': 'var(--k-state-error-text)', //   visualStates/ErrorText
        warning: 'var(--k-color-warning)', //     color/Warning
        'input-bg': 'var(--k-form-input-bg)', //       forms/InputBg
        'input-focus-bg': 'var(--k-form-input-focus-bg)', // forms/InputFocusBg
        'btn-text': 'var(--k-form-btn-text)', //       forms/BtnText
      },

      fontFamily: {
        display: 'var(--k-font-display)',
        sans: 'var(--k-font-sans)',
        mono: 'var(--k-font-mono)',
      },

      fontSize: {
        display: 'var(--k-font-size-display)',
        'heading-1': 'var(--k-font-size-heading-1)',
        'body-large': 'var(--k-font-size-body-large)',
        'body-main': 'var(--k-font-size-body-main)',
        caption: 'var(--k-font-size-caption)',
      },

      // Nomenclatura de Figma: space-1..space-7 (space-7 = 48px).
      // ⚠️ Sobrescribe la escala por defecto de Tailwind en 5, 6 y 7:
      // aquí `p-5` = 24px (no 20px), `p-6` = 32px (no 24px), `p-7` = 48px
      // (no 28px). Manda la rejilla de Figma, no la de Tailwind.
      spacing: {
        1: 'var(--k-space-1)',
        2: 'var(--k-space-2)',
        3: 'var(--k-space-3)',
        4: 'var(--k-space-4)',
        5: 'var(--k-space-5)',
        6: 'var(--k-space-6)',
        7: 'var(--k-space-7)',
      },

      borderRadius: {
        sm: 'var(--k-radius-sm)',
        md: 'var(--k-radius-md)',
        lg: 'var(--k-radius-lg)',
        xl: 'var(--k-radius-xl)',
        pill: 'var(--k-radius-pill)',
      },

      boxShadow: {
        card: 'var(--k-shadow-card)',
        glow: 'var(--k-shadow-glow)',
        modal: 'var(--k-shadow-modal)',
      },

      opacity: {
        disabled: 'var(--k-state-disabled-opacity)',
      },

      scale: {
        pressed: 'var(--k-state-active-scale)',
      },

      strokeWidth: {
        icon: 'var(--k-icon-stroke)',
      },

      // ── Tokens de implementación (ver theme.css) ──
      // No provienen de Figma; se exponen igual para que las utilidades y el
      // CSS plano sigan leyendo la misma fuente y no puedan divergir.

      lineHeight: {
        tight: 'var(--k-leading-tight)',
        snug: 'var(--k-leading-snug)',
        normal: 'var(--k-leading-normal)',
        relaxed: 'var(--k-leading-relaxed)',
      },

      letterSpacing: {
        caps: 'var(--k-tracking-caps)',
        tight: 'var(--k-tracking-tight)',
      },

      borderWidth: {
        DEFAULT: 'var(--k-border-width)',
      },

      transitionProperty: {
        ui: 'all',
      },

      zIndex: {
        negative: 'var(--k-z-negative)',
        base: 'var(--k-z-base)',
        nav: 'var(--k-z-nav)',
        dropdown: 'var(--k-z-dropdown)',
        'modal-overlay': 'var(--k-z-modal-overlay)',
        modal: 'var(--k-z-modal)',
        tooltip: 'var(--k-z-tooltip)',
      },

      backgroundColor: {
        'primary-tint': 'var(--k-surface-primary-tint)',
        'primary-tint-2': 'var(--k-surface-primary-tint-2)',
        'hover-subtle': 'var(--k-surface-hover-subtle)',
      },
    },
  },
  plugins: [],
}
