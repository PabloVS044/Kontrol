import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import es from '@/locales/es.json'
import en from '@/locales/en.json'

// Node 25 expone un localStorage propio que tapa el de happy-dom y no
// implementa getItem/clear. Con Node 22 (.nvmrc) el shim es inofensivo.
const almacen = new Map()
globalThis.localStorage = {
  getItem: (clave) => almacen.get(clave) ?? null,
  setItem: (clave, valor) => almacen.set(clave, String(valor)),
  removeItem: (clave) => almacen.delete(clave),
  clear: () => almacen.clear(),
}

// useTheme guarda el tema en un ref de módulo: cada prueba parte de cero.
async function montar() {
  vi.resetModules()
  const { useTheme } = await import('@/composables/useTheme.js')
  useTheme().initTheme()
  const { default: ThemeSelector } = await import('@/components/common/ThemeSelector.vue')
  return mount(ThemeSelector, {
    global: { plugins: [createI18n({ legacy: false, locale: 'es', messages: { es, en } })] },
  })
}

describe('ThemeSelector', () => {
  const sistema = (claro) => vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: claro })))

  beforeEach(() => {
    almacen.clear()
    document.documentElement.removeAttribute('data-theme')
    sistema(false)
  })

  afterEach(() => vi.unstubAllGlobals())

  const botones = (w) => Object.fromEntries(w.findAll('button').map((b) => [b.text(), b]))

  it('muestra Sistema, Oscuro y Claro, con Sistema marcado por defecto', async () => {
    const wrapper = await montar()
    expect(wrapper.findAll('button').map((b) => b.text())).toEqual(['Sistema', 'Oscuro', 'Claro'])
    expect(botones(wrapper).Sistema.attributes('aria-pressed')).toBe('true')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('en Sistema sigue la preferencia del dispositivo', async () => {
    sistema(true)
    const wrapper = await montar()
    expect(botones(wrapper).Sistema.attributes('aria-pressed')).toBe('true')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('al elegir Claro aplica el tema y lo recuerda', async () => {
    const wrapper = await montar()
    await botones(wrapper).Claro.trigger('click')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(localStorage.getItem('kontrol:theme')).toBe('light')
    expect(botones(wrapper).Claro.attributes('aria-pressed')).toBe('true')
  })

  it('volver a Sistema olvida la elección y sigue al dispositivo', async () => {
    localStorage.setItem('kontrol:theme', 'light')
    const wrapper = await montar()
    expect(botones(wrapper).Claro.attributes('aria-pressed')).toBe('true')
    await botones(wrapper).Sistema.trigger('click')
    expect(localStorage.getItem('kontrol:theme')).toBeNull()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(botones(wrapper).Sistema.attributes('aria-pressed')).toBe('true')
  })
})
