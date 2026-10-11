import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import es from '@/locales/es.json'
import en from '@/locales/en.json'
import LanguageSelector from '@/components/common/LanguageSelector.vue'

// Node 25 expone un localStorage propio que tapa el de happy-dom y no
// implementa getItem/clear. Con Node 22 (.nvmrc) el shim es inofensivo.
const almacen = new Map()
globalThis.localStorage = {
  getItem: (clave) => almacen.get(clave) ?? null,
  setItem: (clave, valor) => almacen.set(clave, String(valor)),
  removeItem: (clave) => almacen.delete(clave),
  clear: () => almacen.clear(),
}

/**
 * Selector de idioma (pruebas 9 y 10).
 *
 * Era un icono gris sin texto: cinco de cinco participantes pasaron de largo y
 * P22 tardó 2:30 sin conseguir cambiar el idioma. El nombre del idioma activo,
 * escrito, es lo que lo vuelve reconocible.
 */
describe('LanguageSelector', () => {
  let mounted = []

  const montar = (props = {}, locale = 'en') => {
    const wrapper = mount(LanguageSelector, {
      props,
      attachTo: document.body,
      global: {
        plugins: [createI18n({ legacy: false, locale, fallbackLocale: 'en', messages: { es, en } })],
      },
    })
    mounted.push(wrapper)
    return wrapper
  }

  beforeEach(() => almacen.clear())
  afterEach(() => {
    mounted.forEach((w) => w.unmount())
    mounted = []
  })

  it('el control nombra el idioma activo, no solo un icono', () => {
    expect(montar().find('.lang-btn-text').text()).toBe('English')
    expect(montar({}, 'es').find('.lang-btn-text').text()).toBe('Español')
  })

  it('cada idioma se ofrece escrito en su propio idioma', async () => {
    const wrapper = montar()
    await wrapper.find('.lang-btn').trigger('click')

    expect(wrapper.findAll('.lang-opt').map((b) => b.text())).toEqual(['English', 'Español'])
  })

  it('elegir un idioma lo aplica, lo persiste y cierra el menú', async () => {
    const wrapper = montar()
    await wrapper.find('.lang-btn').trigger('click')
    await wrapper.findAll('.lang-opt')[1].trigger('click')

    expect(wrapper.vm.$i18n.locale).toBe('es')
    expect(localStorage.getItem('kontrol:locale')).toBe('es')
    expect(wrapper.find('.lang-dropdown').exists()).toBe(false)
  })

  it('declara que abre un menú y si está abierto', async () => {
    const wrapper = montar()
    const boton = wrapper.find('.lang-btn')

    expect(boton.attributes('aria-haspopup')).toBe('menu')
    expect(boton.attributes('aria-expanded')).toBe('false')

    await boton.trigger('click')
    expect(wrapper.find('.lang-btn').attributes('aria-expanded')).toBe('true')
  })

  it('la variante inline deja los dos idiomas a la vista, sin menú', async () => {
    // Tres de cada cinco participantes buscaron el idioma en Configuración:
    // allí no tiene que haber nada que abrir.
    const wrapper = montar({ variant: 'inline' })

    expect(wrapper.find('.lang-btn').exists()).toBe(false)
    const opciones = wrapper.findAll('.lang-inline-opt')
    expect(opciones.map((b) => b.text())).toEqual(['English', 'Español'])
    expect(opciones[0].attributes('aria-pressed')).toBe('true')

    await opciones[1].trigger('click')
    expect(wrapper.vm.$i18n.locale).toBe('es')
    expect(wrapper.findAll('.lang-inline-opt')[1].attributes('aria-pressed')).toBe('true')
  })

  it('marca el idioma de cada opción para el lector de pantalla', async () => {
    // Sin `lang`, una voz en inglés lee "Español" como si fuera inglés.
    const wrapper = montar({ variant: 'inline' })
    expect(wrapper.findAll('.lang-inline-opt').map((b) => b.attributes('lang'))).toEqual(['en', 'es'])
  })
})
