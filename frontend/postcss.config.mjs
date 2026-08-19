/**
 * Kontrol — PostCSS (SCRUM-13 / HU-32)
 *
 * `postcss-import` debe ir antes que Tailwind para que el `@import` de
 * `src/styles/theme.css` en `globals.css` se resuelva en build time.
 * Se declara como devDependency propia: aunque Tailwind 3 lo trae como
 * dependencia transitiva, esa resolución no está garantizada (npm puede no
 * hoistearlo, y un `node_modules` cacheado en Docker lo deja fuera).
 */
export default {
  plugins: {
    'postcss-import': {},
    tailwindcss: {},
    autoprefixer: {},
  },
}
