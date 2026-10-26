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

// Tokens por tema: el claro es el oscuro más sus overrides.
const themeCode = themeCss.replace(/\/\*[\s\S]*?\*\//g, '')
const declMap = (body) => new Map([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]))
const darkTokens = declMap(themeCode.match(/:root,\s*\[data-theme='dark'\]\s*\{([\s\S]*?)\n\}/)[1])
const lightOverrides = declMap(themeCode.match(/\n\[data-theme='light'\]\s*\{([\s\S]*?)\n\}/)[1])
const mediaOverrides = declMap(themeCode.match(/:root:not\(\[data-theme\]\)\s*\{([\s\S]*?)\n {2}\}/)[1])
const tokensOf = (theme) => (theme === 'light' ? new Map([...darkTokens, ...lightOverrides]) : darkTokens)

const resolveIn = (tokens, v) => {
  let s = v.trim()
  while (s.startsWith('var(')) s = tokens.get(s.match(/var\((--[\w-]+)\)/)[1]).trim()
  return s
}
const hexRgb = (h) => {
  const x = h.replace('#', '')
  const f = x.length === 3 ? x.split('').map((c) => c + c).join('') : x
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16))
}
const luminance = (c) =>
  c
    .slice(0, 3)
    .map((v) => {
      const x = v / 255
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
    })
    .reduce((a, v, i) => a + [0.2126, 0.7152, 0.0722][i] * v, 0)
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// El último valor es el pico del fondo animado (en claro, estimado).
const THEMES = {
  dark: {
    surfaces: ['#000000', '--k-shade-1', '--k-shade-3', '--k-color-bg-2', '--k-shade-4', '--k-surface-warm', '--k-surface-warm-2', '--k-surface-floating-3', '#272727'],
    ground: '#111111',
  },
  light: {
    surfaces: ['#ffffff', '--k-shade-1', '--k-shade-3', '--k-color-bg-2', '--k-shade-4', '--k-surface-warm', '--k-surface-warm-2', '--k-surface-floating-3', '--k-surface-panel', '--k-surface-section', '#c9c9c9'],
    ground: '--k-shade-3',
  },
}

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
      '--k-z-background',
      '--k-z-base',
      '--k-z-raised',
      '--k-z-top',
      '--k-z-sticky',
      '--k-z-elevated',
      '--k-z-popover',
      '--k-z-nav',
      '--k-z-dropdown',
      '--k-z-floating',
      '--k-z-modal-overlay',
      '--k-z-modal',
      '--k-z-overlay',
      '--k-z-overlay-top',
      '--k-z-system',
    ],
    superficies: [
      '--k-surface-primary-tint',
      '--k-surface-primary-tint-2',
      '--k-surface-hover-subtle',
      '--k-surface-scrim',
      '--k-surface-panel',
      '--k-overlay-backdrop',
      '--k-surface-panel-border',
      '--k-surface-section',
      '--k-surface-code',
      '--k-surface-warm',
      '--k-surface-warm-2',
      '--k-surface-floating',
      '--k-surface-floating-2',
      '--k-surface-floating-3',
    ],
    rampaNeutra: [
      '--k-shade-0', '--k-shade-1', '--k-shade-2', '--k-shade-3', '--k-shade-3b',
      '--k-shade-4', '--k-shade-5', '--k-shade-6', '--k-shade-6b',
      '--k-shade-7', '--k-shade-8',
      '--k-gray-1', '--k-gray-2', '--k-gray-3',
      '--k-gray-4', '--k-gray-5', '--k-gray-6',
    ],
    tinta: ['--k-ink-rgb', '--k-canvas-rgb'],
    tonalidades: ['rose', 'blue', 'emerald', 'green', 'violet', 'orange', 'amber'].flatMap((h) => [
      `--k-hue-${h}`,
      `--k-hue-${h}-rgb`,
    ]),
    controlesNativos: ['--k-color-scheme'],
    tipografiaIntermedia: [
      '--k-font-size-heading-2',
      '--k-font-size-body-small',
      '--k-font-size-caption-lg',
      '--k-font-size-display-2',
    ],
    radiosExtra: ['--k-radius-xs', '--k-radius-field'],
    estados: ['--k-text-disabled', '--k-state-selected-indicator', '--k-state-disabled-outline'],
    fondoAnimado: ['--k-bg-wave-line', '--k-bg-wave-filter'],
    alertas: [
      '--k-alert-watching-bg',
      '--k-alert-watching-border',
      '--k-alert-watching-text',
      '--k-alert-warning-bg',
      '--k-alert-warning-border',
      '--k-alert-warning-text',
      '--k-alert-critical-bg',
      '--k-alert-critical-border',
      '--k-alert-critical-text',
      '--k-alert-ok-bg',
      '--k-alert-ok-border',
      '--k-alert-ok-text',
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
    const orden = ['negative', 'background', 'base', 'raised', 'top', 'sticky', 'elevated', 'popover', 'nav', 'dropdown', 'floating', 'modal-overlay', 'modal', 'overlay', 'overlay-top', 'system']
    const valores = orden.map((n) => {
      const m = themeCss.match(new RegExp(`--k-z-${n}:\\s*(-?\\d+);`))
      expect(m, `falta --k-z-${n}`).not.toBeNull()
      return Number(m[1])
    })
    // Estrictamente creciente: una capa nunca debe empatar con la de al lado.
    for (let i = 1; i < valores.length; i++) expect(valores[i]).toBeGreaterThan(valores[i - 1])
    // El overlay del modal queda por debajo de su propio diálogo.
    expect(valores[orden.indexOf('modal')]).toBeGreaterThan(valores[orden.indexOf('modal-overlay')])
  })

  it('mantiene la rampa neutra realmente neutra (R=G=B)', () => {
    for (const [, name, hex] of themeCss.matchAll(/(--k-(?:shade|gray)-\d+b?):\s*(#[0-9a-f]{6});/gi)) {
      const [r, g, b] = [1, 3, 5].map((i) => hex.slice(i, i + 2))
      expect(r === g && g === b, `${name} = ${hex} no es un gris neutro`).toBe(true)
    }
  })

  it('deriva las alertas de la paleta, sin colores de Tailwind', () => {
    // El PR #86 traía #facc15 / #f97316 / #fb7185 (ámbar, naranja y rosa por
    // defecto de Tailwind). Ningún token de alerta puede llevar un hex: todos
    // salen de --k-color-warning / --k-color-error / --k-color-success.
    const alerta = /--k-alert-[\w-]+:\s*([^;]+);/g
    for (const [, valor] of themeCss.matchAll(alerta)) {
      expect(valor, `token de alerta con literal de color: ${valor}`).not.toMatch(/#[0-9a-f]{3,8}/i)
      expect(valor).toMatch(/var\(--k-/)
    }
  })

  /**
   * Contraste real de cada nivel de alerta.
   *
   * No basta con que fondo y texto sean distintos: `critical` cumplía esa
   * condición y aun así se quedaba en 4.39:1 con el tinte al 12 %, por debajo
   * del 4.5:1 que WCAG AA pide para texto normal —y estas píldoras van a 9-12px.
   * Se compone el tinte sobre el fondo de tarjeta y se mide.
   */
  for (const theme of Object.keys(THEMES)) {
    it(`cada nivel de alerta supera 4.5:1 de contraste (tema ${theme})`, () => {
      const tokens = tokensOf(theme)
      const rgba = (v) => {
        const s = resolveIn(tokens, v)
        if (s.startsWith('#')) return [...hexRgb(s), 1]
        const m = s.match(/rgba?\(\s*var\((--[\w-]+)\)\s*,\s*([\d.]+)\)/)
        if (m) return [...tokens.get(m[1]).split(',').map(Number), Number(m[2])]
        const p = s.match(/rgba?\(([^)]+)\)/)[1].split(',').map(Number)
        return [p[0], p[1], p[2], p[3] ?? 1]
      }
      const g = THEMES[theme].ground
      const GROUND = hexRgb(g.startsWith('#') ? g : resolveIn(tokens, `var(${g})`))
      for (const nivel of ['watching', 'warning', 'critical', 'ok']) {
        const t = rgba(`var(--k-alert-${nivel}-text)`)
        const b = rgba(`var(--k-alert-${nivel}-bg)`)
        const comp = [0, 1, 2].map((i) => Math.round(b[i] * b[3] + GROUND[i] * (1 - b[3])))
        const ratio = contrast(t, comp)
        expect(ratio, `alerta ${nivel}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
      }
    })
  }

  it('nunca pinta la cabecera de una alerta del mismo color que su fondo', () => {
    // watching usaba el mismo amarillo para fondo y cabecera: texto invisible.
    for (const nivel of ['watching', 'warning', 'critical', 'ok']) {
      const bg = themeCss.match(new RegExp(`--k-alert-${nivel}-bg:\\s*([^;]+);`))[1].trim()
      const text = themeCss.match(new RegExp(`--k-alert-${nivel}-text:\\s*([^;]+);`))[1].trim()
      expect(text, `alerta ${nivel}: cabecera y fondo iguales`).not.toBe(bg)
    }
  })

  it('deriva las superficies de tinte del dorado, sin introducir color nuevo', () => {
    // Si alguien mete un hex aquí, es un color de marca sin aprobar.
    expect(themeCss).toMatch(/--k-surface-primary-tint:\s*rgba\(var\(--k-color-primary-rgb\)/)
    expect(themeCss).toMatch(/--k-surface-primary-tint-2:\s*rgba\(var\(--k-color-primary-rgb\)/)
    expect(themeCss).toMatch(/--k-surface-hover-subtle:\s*rgba\(var\(--k-ink-rgb\)/)
    expect(themeCss).toMatch(/--k-surface-scrim:\s*rgba\(var\(--k-canvas-rgb\)/)
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

  it('[data-theme="light"] y el bloque @media declaran exactamente lo mismo', () => {
    const sorted = (m) => [...m].sort(([a], [b]) => a.localeCompare(b))
    expect(lightOverrides.size).toBeGreaterThan(0)
    expect(sorted(mediaOverrides)).toEqual(sorted(lightOverrides))
  })

  it('el tema claro no inventa tokens que el oscuro no tenga', () => {
    const extra = [...lightOverrides.keys()].filter((t) => !darkTokens.has(t))
    expect(extra).toEqual([])
  })

  it('todo token con color literal en oscuro tiene valor claro', () => {
    const exentos = ['--k-color-black-rgb', '--k-color-white-rgb', '--k-bg-wave-line']
    const literal = /#[0-9a-f]{3,8}\b|rgba?\(\s*\d|^\d+,\s*\d+,\s*\d+$/i
    const missing = [...darkTokens]
      .filter(([t, v]) => literal.test(v) && !exentos.includes(t) && !lightOverrides.has(t))
      .map(([t]) => t)
    expect(missing).toEqual([])
  })

  it('el tema claro es claro: superficies claras, texto oscuro', () => {
    const light = tokensOf('light')
    const lum = (t) => luminance(hexRgb(resolveIn(light, `var(${t})`)))
    for (const t of ['--k-shade-1', '--k-shade-3', '--k-color-bg-2', '--k-color-bg-3']) {
      expect(lum(t), t).toBeGreaterThan(0.6)
    }
    expect(lum('--k-color-text')).toBeLessThan(0.05)
    expect(lightOverrides.get('--k-color-scheme')).toBe('light')
    expect(lightOverrides.get('--k-bg-wave-filter')).toBe('invert(1)')
  })

  it('los tokens nuevos conservan en oscuro el literal que sustituyen', () => {
    const pinned = {
      '--k-ink-rgb': '255, 255, 255',
      '--k-canvas-rgb': '0, 0, 0',
      '--k-shade-0': '#050505',
      '--k-shade-3b': '#151515',
      '--k-shade-6b': '#252525',
      '--k-hue-rose': '#fb7185',
      '--k-hue-blue': '#60a5fa',
      '--k-hue-emerald': '#34d399',
      '--k-hue-green': '#4ade80',
      '--k-hue-violet': '#a78bfa',
      '--k-hue-orange': '#fb923c',
      '--k-hue-amber': '#f59e0b',
      '--k-color-scheme': 'dark',
      '--k-bg-wave-filter': 'none',
    }
    for (const [t, v] of Object.entries(pinned)) expect(darkTokens.get(t), t).toBe(v)
  })

  it('cada tonalidad declara su triplet RGB con el mismo color, en ambos temas', () => {
    for (const theme of Object.keys(THEMES)) {
      const tokens = tokensOf(theme)
      for (const [t, v] of tokens) {
        if (!/^--k-hue-[a-z]+$/.test(t)) continue
        expect(tokens.get(`${t}-rgb`).split(',').map(Number), `${t} (${theme})`).toEqual(hexRgb(v))
      }
    }
  })
})

describe('globals.css — capa de compatibilidad legacy', () => {
  // Las 21 variables que existían antes de SCRUM-13, más las 5 que la rama de
  // inventario móvil introdujo en paralelo (~215 usos en sus pantallas). Si
  // alguna desaparece, rompen las pantallas todavía sin migrar.
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
    '--TextSoft',
    '--TextMuted',
    '--TextDim',
    '--TextFaint',
    '--TextPlaceholder',
    '--ErrorText',
    '--SuccessText',
    '--InputBg',
    '--InputFocusBg',
    '--BtnText',
    '--font-display',
    '--font-sans',
    '--font-mono',
  ]

  const pairs = aliasPairs(globalsCss)
  const aliased = new Map(pairs.map((p) => [p.alias, p.target]))

  it('conserva las 26 variables legacy', () => {
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

  it('importa theme.css antes que los imports de Tailwind', () => {
    const importIdx = globalsCss.indexOf("@import './src/styles/theme.css'")
    const tailwindIdx = globalsCss.indexOf("@import 'tailwindcss/")
    expect(importIdx).toBeGreaterThanOrEqual(0)
    expect(tailwindIdx).toBeGreaterThan(importIdx)
  })

  it('no importa el preflight de Tailwind y deja las utilidades sin capa', () => {
    expect(globalsCss).not.toMatch(/@import\s+['"]tailwindcss['"]/)
    expect(globalsCss).not.toContain('tailwindcss/preflight.css')
    expect(globalsCss).toMatch(/@import 'tailwindcss\/utilities\.css'(?! layer\()/)
  })
})

/**
 * Contraste WCAG 2.1 de los tokens de texto.
 *
 * Las pruebas de usabilidad registraron texto secundario ilegible con brillo
 * bajo, a distancia y sin lentes: la rampa llegaba a 1.5:1. Aquí se fija el
 * piso de 4.5:1 (AA, texto normal) con la fórmula de luminancia relativa de
 * WCAG 2.1, para que un ajuste de paleta no lo vuelva a bajar sin que nadie
 * se entere.
 */
describe.each(Object.keys(THEMES))('theme.css — contraste del texto (WCAG AA), tema %s', (theme) => {
  const tokens = tokensOf(theme)
  const value = (name) => resolveIn(tokens, `var(${name})`)
  const ratio = (a, b) => contrast(hexRgb(a), hexRgb(b))
  const hexOf = (s) => (s.startsWith('#') ? s : value(s))

  const TEXT_SURFACES = THEMES[theme].surfaces
  const EXTREME = '--k-color-bg-3'

  const RAMP = [
    '--k-text-soft',
    '--k-text-muted',
    '--k-text-dim',
    '--k-text-faint',
    '--k-text-placeholder',
    '--k-gray-1',
    '--k-gray-2',
    '--k-gray-3',
    '--k-gray-4',
  ]
  const OTHER_TEXT = [
    '--k-color-text',
    '--k-color-primary',
    '--k-gray-5',
    '--k-gray-6',
    '--k-state-error-text',
    '--k-state-success-text',
    ...['rose', 'blue', 'emerald', 'green', 'violet', 'orange', 'amber'].map((h) => `--k-hue-${h}`),
  ]

  for (const token of RAMP) {
    it(`${token} supera 4.5:1 incluso sobre bg-3`, () => {
      for (const s of [...TEXT_SURFACES, EXTREME]) {
        const r = ratio(value(token), hexOf(s))
        expect(r, `${token} sobre ${s}: ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
      }
    })
  }

  for (const token of OTHER_TEXT) {
    it(`${token} supera 4.5:1 sobre las superficies de texto`, () => {
      for (const s of TEXT_SURFACES) {
        const r = ratio(value(token), hexOf(s))
        expect(r, `${token} sobre ${s}: ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
      }
    })
  }

  it('el texto de botón supera 4.5:1 sobre el dorado de marca', () => {
    for (const bg of ['--k-color-primary', '--k-color-primary-2']) {
      const r = ratio(value('--k-form-btn-text'), value(bg))
      expect(r, `btn-text sobre ${bg}: ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('el texto deshabilitado se distingue del de una opción no seleccionada', () => {
    // Una opción no seleccionada usa la rampa (AA); la deshabilitada queda
    // por debajo a propósito (WCAG 1.4.3 la exime). Si se igualan, vuelve el
    // problema de que lo inactivo parezca deshabilitado.
    const ground = hexOf(THEMES[theme].ground)
    const disabled = value('--k-text-disabled')
    for (const token of ['--k-text-muted', '--k-text-faint']) {
      expect(ratio(value(token), ground)).toBeGreaterThan(ratio(disabled, ground) + 2)
    }
  })
})
