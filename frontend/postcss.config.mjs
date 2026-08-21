/**
 * Kontrol — PostCSS (SCRUM-13 / HU-32)
 *
 * `postcss-import` debe ir antes que Tailwind para que el `@import` de
 * `src/styles/theme.css` en `globals.css` se resuelva en build time.
 * Se declara como devDependency explícita en package.json. Antes se apoyaba
 * en que Tailwind 3 lo arrastra como transitiva y npm lo hoistea a la raíz;
 * esa resolución no está garantizada (npm puede no hoistearlo, un
 * `node_modules` cacheado en Docker lo deja fuera y con Tailwind 4 desaparece),
 * y el fallo sería silencioso: el @import de theme.css dejaría de resolverse
 * y toda la app se quedaría sin tokens.
 */
export default {
  plugins: {
    'postcss-import': {},
    tailwindcss: {},
    autoprefixer: {},
  },
}
