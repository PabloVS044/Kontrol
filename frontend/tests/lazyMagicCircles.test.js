import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { h } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

// MagicCircles real necesita WebGL, que happy-dom no tiene.
vi.mock('@/components/UI/Backgrounds/MagicCircles/MagicCircles.vue', () => ({
  __esModule: true,
  default: {
    name: 'MagicCircles',
    props: ['background', 'ringCount'],
    render: () => h('div', { class: 'magic-mock' }),
  },
}))

import LazyMagicCircles from '@/components/UI/Backgrounds/MagicCircles/LazyMagicCircles.vue'

let observadores = []

class FakeIntersectionObserver {
  constructor(callback) {
    this.callback = callback
    this.disconnect = vi.fn()
    observadores.push(this)
  }
  observe() {}
  entrar() {
    this.callback([{ isIntersecting: true }])
  }
}

const originalIO = globalThis.IntersectionObserver
const fondo = 'linear-gradient(red, blue)'

beforeEach(() => {
  observadores = []
  globalThis.IntersectionObserver = FakeIntersectionObserver
})

afterEach(() => {
  globalThis.IntersectionObserver = originalIO
})

const circulos = (wrapper) => wrapper.findComponent({ name: 'MagicCircles' })

describe('LazyMagicCircles — carga diferida (DT-17)', () => {
  it('antes de ser visible pinta el fondo de MagicCircles sin cargarlo', () => {
    const wrapper = mount(LazyMagicCircles, { attrs: { background: fondo } })

    expect(wrapper.classes()).toContain('magic-rings-placeholder')
    expect(wrapper.attributes('style')).toContain('linear-gradient(red, blue)')
    expect(circulos(wrapper).exists()).toBe(false)
  })

  it('al ser visible monta MagicCircles con las mismas props y suelta su fondo', async () => {
    const wrapper = mount(LazyMagicCircles, { attrs: { background: fondo, 'ring-count': 6 } })
    observadores[0].entrar()
    await flushPromises()

    expect(circulos(wrapper).exists()).toBe(true)
    expect(circulos(wrapper).props('background')).toBe(fondo)
    expect(circulos(wrapper).props('ringCount')).toBe(6)
    // El fondo lo pinta ahora MagicCircles: dos capas semitransparentes
    // oscurecerían el degradado.
    expect(wrapper.attributes('style')).toBeUndefined()
  })
})

describe('LazyMagicCircles — fallo al cargar', () => {
  it('conserva el fondo y registra el error', async () => {
    vi.resetModules()
    vi.doMock('@/components/UI/Backgrounds/MagicCircles/MagicCircles.vue', () => {
      throw new Error('chunk no disponible')
    })
    const { logger } = await import('@/utils/logger.js')
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})
    const { default: Lazy } = await import(
      '@/components/UI/Backgrounds/MagicCircles/LazyMagicCircles.vue'
    )

    const wrapper = mount(Lazy, { attrs: { background: fondo } })
    observadores[0].entrar()
    await flushPromises()
    await new Promise((r) => setTimeout(r, 0))
    await flushPromises()

    expect(wrapper.attributes('style')).toContain('linear-gradient(red, blue)')
    expect(errorSpy).toHaveBeenCalled()
    vi.doUnmock('@/components/UI/Backgrounds/MagicCircles/MagicCircles.vue')
  })
})
