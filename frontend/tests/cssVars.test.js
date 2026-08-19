import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, relative } from 'node:path'

/**
 * Integridad de las CSS custom properties (Fase 0 del saneamiento de estilos).
 *
 * Por qué existe: el PR #86 migró 13 componentes a un juego de variables
 * (`--space-*`, `--text-*`, `--radius-*`, `--shadow-*`, `--z-*`…) y su último
 * commit borró las declaraciones, dejando ~260 referencias `var()` colgadas.
 * Nada lo detectó: `vite build` compila sin error y los 62 tests pasaban. Una
 * declaración con un `var()` sin resolver no es un error de sintaxis — el
 * navegador simplemente descarta esa declaración, así que el fallo es
 * puramente visual y solo se ve abriendo la app.
 *
 * Este test cierra ese hueco. Se lee CSS como texto (igual que `theme.test.js`)
 * porque happy-dom no resuelve cadenas de `var()` anidadas.
 *
 * Semántica aplicada:
 *  - `var(--x)` sin fallback y sin declaración en ningún ámbito → ROMPE.
 *  - `var(--x, algo)` → no rompe: degrada al fallback. No se reporta.
 *  - Una variable se considera declarada si está en `theme.css`, en
 *    `globals.css`, o en cualquier archivo del MISMO directorio — incluidas las
 *    que los componentes Vue inyectan por `:style="{ '--back': … }"`, que se
 *    declaran en el `.vue` y se consumen en el `.css` hermano.
 */

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

/**
 * Quita comentarios CSS, HTML y de línea JS: un `var(--k-*)` citado en prosa no
 * es una referencia. El guardia `[^:]` antes de `//` evita comerse la parte de
 * esquema de una URL (`https://…`) dentro de un bloque `<script>`.
 */
const strip = (s) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')

const read = (p) => strip(readFileSync(resolve(root, p), 'utf8'))

/** `--x: valor` — declaración en una hoja o en un bloque `<style>`. */
const declarations = (s) => [...s.matchAll(/(?:^|[;{\s])(--[\w-]+)\s*:/gm)].map((m) => m[1])

/** `'--x':` — inyección desde un binding `:style` de Vue. */
const bindings = (s) => [...s.matchAll(/['"](--[\w-]+)['"]\s*:/g)].map((m) => m[1])

/**
 * Referencias que rompen si no resuelven. El segundo grupo distingue
 * `var(--x)` de `var(--x, fallback)`; solo el primero se reporta.
 */
const hardReferences = (s) =>
  [...s.matchAll(/var\(\s*(-{2,}[\w-]+)\s*([,)])/g)].filter((m) => m[2] === ')').map((m) => m[1])

const sourceFiles = execFileSync(
  'find',
  ['src', '-type', 'f', '(', '-name', '*.css', '-o', '-name', '*.vue', ')'],
  { cwd: root, encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .sort()

const globalScope = new Set([...declarations(read('src/styles/theme.css')), ...declarations(read('globals.css'))])

const scopeByDir = new Map()
for (const file of sourceFiles) {
  const src = read(file)
  const dir = dirname(file)
  if (!scopeByDir.has(dir)) scopeByDir.set(dir, new Set())
  for (const name of [...declarations(src), ...bindings(src)]) scopeByDir.get(dir).add(name)
}

/** `{ 'ruta/archivo': ['--var', …] }` con lo que hoy no resuelve. */
function scanDangling() {
  const found = {}
  for (const file of sourceFiles) {
    const src = read(file)
    const local = scopeByDir.get(dirname(file))
    const bad = [...new Set(hardReferences(src).filter((v) => !globalScope.has(v) && !local.has(v)))].sort()
    if (bad.length) found[file] = bad
  }
  return found
}

/**
 * DEUDA CONOCIDA — vacía.
 *
 * El PR #86 dejó 13 archivos con 42 variables sin declarar. Todas están
 * reconectadas a los tokens `--k-*`, así que la lista queda a cero y los tests
 * de abajo pasan a ser un guardia puro: cualquier `var()` que no resuelva
 * rompe la build, sin excepciones que negociar.
 *
 * Si alguna vez hay que volver a poblar esto, que sea con fecha y motivo. El
 * criterio es el mismo que el de la política de cobertura: solo encoge.
 */
const KNOWN_DEBT = {}

describe('CSS custom properties — integridad de referencias', () => {
  const dangling = scanDangling()

  it('no introduce referencias colgadas fuera de la deuda conocida', () => {
    const nuevas = {}
    for (const [file, vars] of Object.entries(dangling)) {
      const permitidas = new Set(KNOWN_DEBT[file] ?? [])
      const extra = vars.filter((v) => !permitidas.has(v))
      if (extra.length) nuevas[file] = extra
    }
    // Si esto falla: el `var()` no resuelve en ningún ámbito. Declara el token
    // en theme.css (con prefijo --k-) o usa el que ya existe. No lo añadas a
    // KNOWN_DEBT: esa lista está congelada y solo encoge.
    expect(nuevas).toEqual({})
  })

  it('no deja entradas obsoletas en la deuda conocida', () => {
    const obsoletas = {}
    for (const [file, vars] of Object.entries(KNOWN_DEBT)) {
      const siguenRotas = new Set(dangling[file] ?? [])
      const yaArregladas = vars.filter((v) => !siguenRotas.has(v))
      if (yaArregladas.length) obsoletas[file] = yaArregladas
    }
    // Si esto falla: arreglaste algo — bórralo de KNOWN_DEBT. Es lo que hace
    // que el trinquete baje.
    expect(obsoletas).toEqual({})
  })

  it('no extiende la deuda a archivos nuevos', () => {
    expect(Object.keys(dangling).sort()).toEqual(Object.keys(KNOWN_DEBT).sort())
  })

  it('no usa var() con guiones de más', () => {
    const typos = []
    for (const file of sourceFiles) {
      const src = read(file)
      for (const m of src.matchAll(/var\(\s*-{3,}[\w-]+/g)) {
        typos.push(`${relative('.', file)}: ${m[0]}`)
      }
    }
    // `var(----x)` es un nombre distinto de `var(--x)` y nunca resuelve.
    expect(typos).toEqual([])
  })

  it('no referencia el prefijo desnudo --k- (token a medio escribir)', () => {
    const parciales = []
    for (const file of sourceFiles) {
      const src = read(file)
      for (const m of src.matchAll(/var\(\s*--k-\s*[,)]/g)) parciales.push(relative('.', file))
    }
    expect(parciales).toEqual([])
  })
})

describe('LoginView — estética restaurada (0547bbb)', () => {
  const login = readFileSync(resolve(root, 'src/views/LoginView.css'), 'utf8')
  const theme = readFileSync(resolve(root, 'src/styles/theme.css'), 'utf8')

  /** `--k-x` → su valor declarado en theme.css. */
  const tokenValue = Object.fromEntries(
    [...strip(theme).matchAll(/(--k-[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
  )

  /** Resuelve los `var(--k-*)` de una declaración a su valor final. */
  const resolver = (v) =>
    v.replace(/var\((--[\w-]+)\)/g, (raw, t) => tokenValue[t] ?? raw).trim()

  /** Valor final de `prop` dentro del primer bloque que casa con `selector`. */
  function valorDe(selector, prop) {
    const m = login.match(new RegExp(`${selector}\\s*\\{[^}]*?${prop}:\\s*([^;]+);`))
    return m ? resolver(m[1]) : null
  }

  /**
   * Se comprueba el VALOR RESUELTO, no cómo esté escrito. Así el test sobrevive
   * a que un literal pase a token —que es justo lo que se quiere fomentar— pero
   * sigue fallando si el valor cambia, que es lo que degradó la pantalla.
   */
  const invariantes = [
    ['título a 32px', '\\.login-title', 'font-size', /^32px$/],
    ['CTA con texto blanco', '\\.login-btn-primary', 'color', /^(#ffffff|rgb\(\s*255,\s*255,\s*255\s*\))$/i],
    ['CTA con radio de 8px', '\\.login-btn-primary', 'border-radius', /^8px$/],
    ['input con radio de 6px', '\\.login-input', 'border-radius', /^6px$/],
    ['disabled legible al 0.55', '\\.login-btn-primary:disabled', 'opacity', /^0?\.55$/],
  ]

  it.each(invariantes)('conserva: %s', (_n, sel, prop, esperado) => {
    const valor = valorDe(sel, prop)
    expect(valor, `no se encontró ${prop} en ${sel}`).not.toBeNull()
    expect(valor).toMatch(esperado)
  })

  it('conserva el text-shadow y la elevación del CTA', () => {
    expect(login).toMatch(/\.login-btn-primary\s*\{[^}]*text-shadow:/)
    expect(login).toMatch(/\.login-btn-primary:hover:not\(:disabled\)\s*\{[^}]*translateY\(-1px\)/)
  })

  it('conserva el radio de 22px del panel', () => {
    expect(login).toMatch(/border-radius:\s*22px 0 0 22px/)
  })

  it('escala el título en cada breakpoint en vez de dejarlo fijo', () => {
    // SCRUM-13 borró estos overrides asumiendo que la escala de tokens los
    // cubría; el título quedó a 24px desde 1440px hasta 320px.
    for (const size of ['1.7rem', '1.6rem', '1.45rem', '1.4rem', '1.3rem']) {
      expect(login).toContain(`font-size: ${size}`)
    }
  })
})
