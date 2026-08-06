/**
 * Kontrol — PostCSS (SCRUM-13 / HU-32)
 *
 * `postcss-import` debe ir antes que Tailwind para que el `@import` de
 * `src/styles/theme.css` en `globals.css` se resuelva en build time.
 * Viene incluido con Tailwind, no requiere dependencia adicional.
 */
export default {
  plugins: {
    'postcss-import': {},
    tailwindcss: {},
    autoprefixer: {},
  },
}
