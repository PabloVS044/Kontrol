import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useVisibleOnce } from '@/composables/useVisibleOnce.js'

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
  emitir(isIntersecting) {
    this.callback([{ isIntersecting, target: this.el }])
  }
}

const originalIO = globalThis.IntersectionObserver

beforeEach(() => {
  observadores = []
  globalThis.IntersectionObserver = FakeIntersectionObserver
})

afterEach(() => {
  globalThis.IntersectionObserver = originalIO
})

function montar(opciones) {
  let visible
  const wrapper = mount(
    defineComponent({
      setup() {
        const el = ref(null)
        visible = useVisibleOnce(el, opciones)
        return () => h('div', { ref: el })
      },
    })
  )
  return { wrapper, visible: () => visible.value }
}

describe('useVisibleOnce', () => {
  it('observa el elemento con un margen de 200px por defecto', () => {
    const { wrapper } = montar()
    expect(observadores[0].el).toBe(wrapper.element)
    expect(observadores[0].options.rootMargin).toBe('200px')
  })

  it('pasa a visible al entrar al viewport y deja de observar', () => {
    const { visible } = montar()
    observadores[0].emitir(false)
    expect(visible()).toBe(false)

    observadores[0].emitir(true)
    expect(visible()).toBe(true)
    expect(observadores[0].disconnect).toHaveBeenCalled()
  })

  it('desactivado, no observa y nunca pasa a visible', () => {
    const { visible } = montar({ enabled: false })
    expect(observadores).toHaveLength(0)
    expect(visible()).toBe(false)
  })

  it('sin IntersectionObserver, lo da por visible', () => {
    delete globalThis.IntersectionObserver
    const { visible } = montar()
    expect(visible()).toBe(true)
  })

  it('deja de observar al desmontarse', () => {
    const { wrapper } = montar()
    wrapper.unmount()
    expect(observadores[0].disconnect).toHaveBeenCalled()
  })
})
