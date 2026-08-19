import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

/**
 * Contrato de los design tokens (SCRUM-13 / HU-32).
 *
 * Se leen los archivos como texto en vez de montarlos en el DOM: happy-dom no
 * resuelve cadenas de `var()` anidadas, que es justo lo que hay que verificar.
 * Estas pruebas fallan si alguien borra un token o rompe la capa de
 * compatibilidad legacy, que es de lo que dependen SCRUM-14..17.
 */

const here = dirname(fileURLToPath(import.meta.url))
const themeCss = readFileSync(resolve(here, '../src/styles/theme.css'), 'utf8')
const globalsCss = readFileSync(resolve(here, '../globals.css'), 'utf8')

/** Nombres de variable declarados (`--x: valor`) en una hoja. */
function declaredVars(css) {
  return new Set([...css.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((m) => m[1]))
}

/** Pares alias → token referenciado, para declaraciones del tipo `--A: var(--B);` */
function aliasPairs(css) {
  return [...css.matchAll(/^\s*(--[\w-]+)\s*:\s*var\((--[\w-]+)\)\s*;/gm)].map((m) => ({
    alias: m[1],
    target: m[2],
  }))
}

const themeVars = declaredVars(themeCss)

describe('theme.css — catálogo de tokens', () => {
  // Cada grupo corresponde a una lámina de Figma (docs/design-tokens-figma.md).
  const expected = {
    color: [
      '--k-color-primary',
      '--k-color-primary-2',
      '--k-color-secondary',
      '--k-color-tertiary',
      '--k-color-border',
      '--k-color-pill-back',
      '--k-color-bg',
      '--k-color-bg-2',
      '--k-color-bg-3',
      '--k-color-text',
      '--k-color-success',
      '--k-color-error',
      '--k-color-warning',
    ],
    text: [
      '--k-text-soft',
      '--k-text-muted',
      '--k-text-dim',
      '--k-text-faint',
      '--k-text-placeholder',
    ],
    visualStates: ['--k-state-error-text', '--k-state-success-text'],
    forms: ['--k-form-input-bg', '--k-form-input-focus-bg', '--k-form-btn-text'],
    font: [
      '--k-font-display',
      '--k-font-sans',
      '--k-font-mono',
      '--k-font-size-display',
      '--k-font-size-heading-1',
      '--k-font-size-body-large',
      '--k-font-size-body-main',
      '--k-font-size-caption',
    ],
    spacing: [
      '--k-space-1',
      '--k-space-2',
      '--k-space-3',
      '--k-space-4',
      '--k-space-5',
      '--k-space-6',
      '--k-space-7',
    ],
    radius: [
      '--k-radius-sm',
      '--k-radius-md',
      '--k-radius-lg',
      '--k-radius-xl',
      '--k-radius-pill',
    ],
    shadow: ['--k-shadow-card', '--k-shadow-glow', '--k-shadow-modal'],
    interaction: [
      '--k-state-hover-brightness',
      '--k-state-active-scale',
      '--k-state-disabled-opacity',
      '--k-focus-ring',
    ],
  }

  /**
   * Tokens de implementación: no salen de ninguna lámina de Figma. Se validan
   * aparte para que la separación quede explícita en el propio test — si
   * Diseño publica una lámina para alguna de estas familias, el grupo sube al
   * bloque de arriba y sus valores dejan de ser negociables aquí.
   */
  const implementation = {
    leading: [
      '--k-leading-tight',
      '--k-leading-snug',
      '--k-leading-normal',
      '--k-leading-relaxed',
    ],
    tracking: ['--k-tracking-caps', '--k-tracking-tight'],
    borde: ['--k-border-width'],
    transicion: ['--k-transition-ui'],
    capas: [
      '--k-z-negative',
      '--k-z-base',
      '--k-z-nav',
      '--k-z-dropdown',
      '--k-z-modal-overlay',
      '--k-z-modal',
      '--k-z-tooltip',
    ],
    superficies: [
      '--k-surface-primary-tint',
      '--k-surface-primary-tint-2',
      '--k-surface-hover-subtle',
    ],
  }

  for (const [group, tokens] of Object.entries(expected)) {
    it(`declara todos los tokens del grupo ${group}/`, () => {
      const missing = tokens.filter((t) => !themeVars.has(t))
      expect(missing).toEqual([])
    })
  }

  for (const [group, tokens] of Object.entries(implementation)) {
    it(`declara todos los tokens de implementación de ${group}/`, () => {
      const missing = tokens.filter((t) => !themeVars.has(t))
      expect(missing).toEqual([])
    })
  }

  it('mantiene la escalera de capas ordenada y con hueco entre niveles', () => {
    const orden = ['base', 'nav', 'dropdown', 'modal-overlay', 'modal', 'tooltip']
    const valores = orden.map((n) => {
      const m = themeCss.match(new RegExp(`--k-z-${n}:\\s*(-?\\d+);`))
      expect(m, `falta --k-z-${n}`).not.toBeNull()
      return Number(m[1])
    })
    // Estrictamente creciente: una capa nunca debe empatar con la de al lado.
    for (let i = 1; i < valores.length; i++) expect(valores[i]).toBeGreaterThan(valores[i - 1])
    // El overlay del modal queda por debajo de su propio diálogo.
    expect(valores[4]).toBeGreaterThan(valores[3])
  })

  it('deriva las superficies de tinte del dorado, sin introducir color nuevo', () => {
    // Si alguien mete un hex aquí, es un color de marca sin aprobar.
    expect(themeCss).toMatch(/--k-surface-primary-tint:\s*rgba\(var\(--k-color-primary-rgb\)/)
    expect(themeCss).toMatch(/--k-surface-primary-tint-2:\s*rgba\(var\(--k-color-primary-rgb\)/)
    expect(themeCss).toMatch(/--k-surface-hover-subtle:\s*rgba\(var\(--k-color-white-rgb\)/)
  })

  it('respeta la rejilla de 8pt de Figma (space-7 = 48px)', () => {
    const scale = { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '24px', 6: '32px', 7: '48px' }
    for (const [step, px] of Object.entries(scale)) {
      expect(themeCss).toMatch(new RegExp(`--k-space-${step}:\\s*${px};`))
    }
  })

  it('usa los valores de radio de la guía, incluido radius-xl', () => {
    const radii = { sm: '4px', md: '8px', lg: '12px', xl: '24px', pill: '999px' }
    for (const [name, px] of Object.entries(radii)) {
      expect(themeCss).toMatch(new RegExp(`--k-radius-${name}:\\s*${px};`))
    }
  })

  it('mantiene el dorado de marca y el texto primario de la guía', () => {
    expect(themeCss).toMatch(/--k-color-primary:\s*#caa860;/)
    expect(themeCss).toMatch(/--k-color-text:\s*#faf8f5;/)
  })
})

describe('theme.css — mecanismo de temas', () => {
  it('aplica los tokens tanto en :root como en [data-theme="dark"]', () => {
    expect(themeCss).toMatch(/:root,\s*\[data-theme='dark'\]\s*\{/)
  })

  it('declara el selector del tema claro', () => {
    expect(themeCss).toMatch(/\[data-theme='light'\]\s*\{/)
  })

  it('respeta prefers-color-scheme cuando no hay preferencia explícita', () => {
    expect(themeCss).toMatch(/@media \(prefers-color-scheme: light\)/)
    expect(themeCss).toMatch(/:root:not\(\[data-theme\]\)/)
  })
})

describe('globals.css — capa de compatibilidad legacy', () => {
  // Las 21 variables que existían antes de SCRUM-13. Si alguna desaparece,
  // rompen las pantallas todavía sin migrar.
  const legacy = [
    '--Primary',
    '--Primary2',
    '--Secondary',
    '--Tertiary',
    '--Border',
    '--PillBack',
    '--Text',
    '--Background',
    '--Background2',
    '--Background3',
    '--Success',
    '--Error',
    '--Warning',
    '--TextMuted',
    '--TextDim',
    '--TextPlaceholder',
    '--ErrorText',
    '--SuccessText',
    '--InputBg',
    '--InputFocusBg',
    '--BtnText',
  ]

  const pairs = aliasPairs(globalsCss)
  const aliased = new Map(pairs.map((p) => [p.alias, p.target]))

  it('conserva las 21 variables legacy', () => {
    const missing = legacy.filter((v) => !aliased.has(v))
    expect(missing).toEqual([])
  })

  it('resuelve cada alias legacy a un token existente en theme.css', () => {
    const broken = pairs.filter((p) => !themeVars.has(p.target))
    expect(broken).toEqual([])
  })

  it('no deja alias legacy fuera de la lista congelada', () => {
    const extra = [...aliased.keys()].filter((v) => !legacy.includes(v))
    expect(extra).toEqual([])
  })

  it('no vuelve a declarar valores de marca: los alias solo apuntan a tokens', () => {
    const rootBlock = globalsCss.match(/:root\s*\{[\s\S]*?\}/)?.[0] ?? ''
    // Ningún literal de color dentro del bloque de alias.
    expect(rootBlock).not.toMatch(/#[0-9a-f]{3,8}/i)
    expect(rootBlock).not.toMatch(/\brgba?\(/i)
  })

  it('importa theme.css antes que las directivas de Tailwind', () => {
    const importIdx = globalsCss.indexOf("@import './src/styles/theme.css'")
    const tailwindIdx = globalsCss.indexOf('@tailwind')
    expect(importIdx).toBeGreaterThanOrEqual(0)
    expect(tailwindIdx).toBeGreaterThan(importIdx)
  })
})
