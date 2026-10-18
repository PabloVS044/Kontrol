/**
 * Kontrol — PostCSS (SCRUM-13 / HU-32, migrado a Tailwind 4 en DT-08)
 *
 * Tailwind 4 resuelve los `@import` de CSS por su cuenta (incluido el de
 * `src/styles/theme.css` en `globals.css`) y añade los prefijos de
 * navegador con Lightning CSS, así que `postcss-import` y `autoprefixer`
 * ya no hacen falta.
 */
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
