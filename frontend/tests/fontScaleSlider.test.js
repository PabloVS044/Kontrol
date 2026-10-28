import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import es from '@/locales/es.json'
import en from '@/locales/en.json'
import FontScaleSlider from '@/components/common/FontScaleSlider.vue'
import { useFontScale } from '@/composables/useFontScale.js'

// Node 25 expone un localStorage propio que tapa el de happy-dom y no
// implementa getItem/clear. Con Node 22 (.nvmrc) el shim es inofensivo.
const almacen = new Map()
globalThis.localStorage = {
  getItem: (clave) => almacen.get(clave) ?? null,
  setItem: (clave, valor) => almacen.set(clave, String(valor)),
  removeItem: (clave) => almacen.delete(clave),
  clear: () => almacen.clear(),
}

const montar = () => mount(FontScaleSlider, {
  props: { id: 'font-scale' },
  global: { plugins: [createI18n({ legacy: false, locale: 'es', fallbackLocale: 'en', messages: { es, en } })] },
})

describe('FontScaleSlider.vue', () => {
  beforeEach(() => {
    almacen.clear()
    useFontScale().setFontScale('default')
  })

  it('un paso del slider por cada tamaño, empezando en el normal', () => {
    const range = montar().find('input[type="range"]')
    expect(range.attributes('id')).toBe('font-scale')
    expect(range.attributes('min')).toBe('0')
    expect(range.attributes('max')).toBe(String(useFontScale().availableScales.length - 1))
    expect(range.element.value).toBe('0')
  })

  it('mover el slider aplica el tamaño al momento y lo anuncia con su nombre', async () => {
    const wrapper = montar()
    const range = wrapper.find('input[type="range"]')
    await range.setValue('2')

    expect(useFontScale().fontScale.value).toBe('larger')
    expect(document.documentElement.getAttribute('data-font-scale')).toBe('larger')
    expect(range.attributes('aria-valuetext')).toBe('Muy grande')
    expect(wrapper.find('output').text()).toBe('Muy grande')
  })

  it('volver al primer paso quita el atributo de <html>', async () => {
    const range = montar().find('input[type="range"]')
    await range.setValue('3')
    await range.setValue('0')
    expect(document.documentElement.getAttribute('data-font-scale')).toBeNull()
  })
})
