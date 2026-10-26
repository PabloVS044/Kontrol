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

  it('arranca con Oscuro marcado', async () => {
    const wrapper = await montar()
    const [oscuro, claro] = wrapper.findAll('button')
    expect(oscuro.text()).toBe('Oscuro')
    expect(oscuro.attributes('aria-pressed')).toBe('true')
    expect(claro.attributes('aria-pressed')).toBe('false')
  })

  it('al elegir Claro aplica el tema y lo recuerda', async () => {
    const wrapper = await montar()
    await wrapper.findAll('button')[1].trigger('click')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(localStorage.getItem('kontrol:theme')).toBe('light')
    expect(wrapper.findAll('button')[1].attributes('aria-pressed')).toBe('true')
  })

  it('marca Claro si el sistema lo pide y no hay nada elegido', async () => {
    sistema(true)
    const wrapper = await montar()
    expect(wrapper.findAll('button')[1].attributes('aria-pressed')).toBe('true')
  })

  it('respeta un tema claro guardado antes', async () => {
    localStorage.setItem('kontrol:theme', 'light')
    const wrapper = await montar()
    expect(wrapper.findAll('button')[1].attributes('aria-pressed')).toBe('true')
  })
})
