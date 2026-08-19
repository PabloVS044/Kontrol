/**
 * Kontrol — PostCSS (SCRUM-13 / HU-32)
 *
 * `postcss-import` debe ir antes que Tailwind para que el `@import` de
 * `src/styles/theme.css` en `globals.css` se resuelva en build time.
 * Se declara como devDependency explícita en package.json. Antes se apoyaba
 * en que Tailwind 3 lo arrastra como transitiva y npm lo hoistea a la raíz;
 * eso resuelve hoy pero desaparece con Tailwind 4 o con otro layout de
 * node_modules, y el fallo sería silencioso: el @import de theme.css dejaría
 * de resolverse y toda la app se quedaría sin tokens.
 */
export default {
  plugins: {
    'postcss-import': {},
    tailwindcss: {},
    autoprefixer: {},
  },
}
