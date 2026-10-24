import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { h } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

// La escena real necesita WebGL, que happy-dom no tiene. `__esModule` hace que
// defineAsyncComponent tome el `default`, como con el módulo real.
vi.mock('@/components/UI/KontrolLogo3D/KontrolLogo3DScene.vue', () => ({
  __esModule: true,
  default: {
    name: 'KontrolLogo3DScene',
    props: ['intensity', 'width', 'height'],
    emits: ['loaded'],
    render: () => h('div', { class: 'scene-mock' }),
  },
}))

import KontrolLogo3D from '@/components/UI/KontrolLogo3D/KontrolLogo3D.vue'

let observadores = []

class FakeIntersectionObserver {
  constructor(callback, options) {
    this.callback = callback
    this.options = options
    this.disconnect = vi.fn()
    observadores.push(this)
  }
  observe(el) {
    this.el = el
  }
  entrar() {
    this.callback([{ isIntersecting: true, target: this.el }])
  }
}

function reducirMovimiento(activo) {
  window.matchMedia = vi.fn((query) => ({
    matches: activo && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

const originalMatchMedia = window.matchMedia
const originalIO = globalThis.IntersectionObserver

beforeEach(() => {
  observadores = []
  globalThis.IntersectionObserver = FakeIntersectionObserver
  reducirMovimiento(false)
})

afterEach(() => {
  window.matchMedia = originalMatchMedia
  globalThis.IntersectionObserver = originalIO
})

const escena = (wrapper) => wrapper.findComponent({ name: 'KontrolLogo3DScene' })
const marcador = (wrapper) => wrapper.find('.kontrol-logo-3d__fallback img')

describe('KontrolLogo3D — carga diferida (DT-17)', () => {
  it('reserva el tamaño pedido y muestra el marcador antes de cargar el 3D', () => {
    const wrapper = mount(KontrolLogo3D, { props: { width: '460px', height: '460px' } })

    expect(wrapper.attributes('style')).toContain('width: 460px')
    expect(wrapper.attributes('style')).toContain('height: 460px')
    expect(marcador(wrapper).exists()).toBe(true)
    expect(escena(wrapper).exists()).toBe(false)
  })

  it('no carga el 3D hasta que el logo es visible', async () => {
    const wrapper = mount(KontrolLogo3D)
    await flushPromises()
    expect(escena(wrapper).exists()).toBe(false)

    observadores[0].entrar()
    await flushPromises()
    expect(escena(wrapper).exists()).toBe(true)
    expect(observadores[0].disconnect).toHaveBeenCalled()
  })

  it('pasa las props del motor a la escena, pero no el tamaño', async () => {
    const wrapper = mount(KontrolLogo3D, { props: { width: '300px', intensity: 0.6 } })
    observadores[0].entrar()
    await flushPromises()

    expect(escena(wrapper).props('intensity')).toBe(0.6)
    expect(escena(wrapper).props('width')).toBeUndefined()
  })

  it('mantiene el marcador hasta que el modelo termina de cargar', async () => {
    const wrapper = mount(KontrolLogo3D)
    observadores[0].entrar()
    await flushPromises()
    expect(marcador(wrapper).exists()).toBe(true)

    escena(wrapper).vm.$emit('loaded')
    await flushPromises()
    expect(marcador(wrapper).exists()).toBe(false)
  })

  it('con reducir movimiento, solo muestra el marcador y no observa ni carga el 3D', async () => {
    reducirMovimiento(true)
    const wrapper = mount(KontrolLogo3D)
    await flushPromises()

    expect(marcador(wrapper).exists()).toBe(true)
    expect(observadores).toHaveLength(0)
    expect(escena(wrapper).exists()).toBe(false)
  })

  it('sin IntersectionObserver, carga el 3D directamente', async () => {
    delete globalThis.IntersectionObserver
    const wrapper = mount(KontrolLogo3D)
    await flushPromises()

    expect(escena(wrapper).exists()).toBe(true)
  })

  it('deja de observar si se desmonta antes de ser visible', () => {
    const wrapper = mount(KontrolLogo3D)
    wrapper.unmount()

    expect(observadores[0].disconnect).toHaveBeenCalled()
  })
})

describe('KontrolLogo3D — fallo al cargar el 3D', () => {
  it('deja el marcador y registra el error', async () => {
    vi.resetModules()
    vi.doMock('@/components/UI/KontrolLogo3D/KontrolLogo3DScene.vue', () => {
      throw new Error('chunk no disponible')
    })
    const { logger } = await import('@/utils/logger.js')
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})
    const { default: Logo } = await import('@/components/UI/KontrolLogo3D/KontrolLogo3D.vue')

    const wrapper = mount(Logo)
    observadores[0].entrar()
    await flushPromises()
    await new Promise((r) => setTimeout(r, 0))
    await flushPromises()

    expect(marcador(wrapper).exists()).toBe(true)
    expect(errorSpy).toHaveBeenCalled()
    vi.doUnmock('@/components/UI/KontrolLogo3D/KontrolLogo3DScene.vue')
  })
})
