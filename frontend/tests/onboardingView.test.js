import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import es from '@/locales/es.json'
import en from '@/locales/en.json'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

const almacen = new Map()
globalThis.localStorage = {
  getItem: (clave) => almacen.get(clave) ?? null,
  setItem: (clave, valor) => almacen.set(clave, String(valor)),
  removeItem: (clave) => almacen.delete(clave),
  clear: () => almacen.clear(),
}

import OnboardingView from '@/views/OnboardingView.vue'
import { useAuthStore } from '@/stores/auth'

describe('OnboardingView.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    push.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('monta el formulario y crea la empresa al enviarlo', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    const auth = useAuthStore()
    auth.loadEmpresas = vi.fn().mockResolvedValue()

    const wrapper = mount(OnboardingView, {
      global: {
        plugins: [createI18n({ legacy: false, locale: 'es', fallbackLocale: 'en', messages: { es, en } })],
      },
    })

    expect(wrapper.findAll('input')).toHaveLength(4)
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
    expect(wrapper.find('.ob-logout').exists()).toBe(true)

    await wrapper.find('input[type="text"]').setValue('  Panadería Sol  ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith('/api/companies', expect.objectContaining({ method: 'POST' }))
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ nombre: 'Panadería Sol' })
    expect(auth.loadEmpresas).toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith({ name: 'dashboard' })
  })
})
