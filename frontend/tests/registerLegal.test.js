import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createRouter, createMemoryHistory } from 'vue-router'
import es from '@/locales/es.json'
import en from '@/locales/en.json'
import { acceptanceVersions } from '@/utils/legal.js'

/**
 * L-6 — casilla de aceptación en el alta de cuenta: nunca premarcada, sin ella
 * no se envía el alta, y con ella se mandan las versiones que vio el usuario.
 */

const mocks = vi.hoisted(() => ({ registerUser: vi.fn(), loginWithGoogle: vi.fn() }))
vi.mock('@/services/auth', () => mocks)

import RegisterView from '@/views/RegisterView.vue'

const Stub = { template: '<div />' }
let wrapper

async function mountRegister() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/register', name: 'register', component: Stub },
      { path: '/login', name: 'login', component: Stub },
      { path: '/legal/:document', name: 'legal-document', component: Stub },
    ],
  })
  await router.push('/register')
  await router.isReady()
  wrapper = mount(RegisterView, {
    global: {
      plugins: [router, createI18n({ legacy: false, locale: 'es', fallbackLocale: 'en', messages: { es, en } })],
      stubs: { SoftParticle: true, KontrolLogo3D: true },
    },
  })
  await flushPromises()
  return wrapper
}

async function fillForm() {
  const inputs = wrapper.findAll('.register-input')
  await inputs[0].setValue('Ana')
  await inputs[1].setValue('Martínez')
  await inputs[2].setValue('ana@kontrol.gt')
  await inputs[3].setValue('Kontrol2026!')
}

const submit = async () => {
  await wrapper.find('.register-btn-primary').trigger('click')
  await flushPromises()
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers({ toFake: ['setTimeout'] })
  setActivePinia(createPinia())
  mocks.registerUser.mockResolvedValue({ success: true, token: 't', data: { id_usuario: 42 } })
})

afterEach(() => {
  wrapper?.unmount()
  vi.useRealTimers()
})

describe('RegisterView — casilla de aceptación de los documentos legales', () => {
  it('la casilla no viene marcada y enlaza a los Términos y a la Privacidad', async () => {
    await mountRegister()
    const box = wrapper.find('.register-legal-checkbox')
    expect(box.element.checked).toBe(false)

    const links = wrapper.findAll('.register-legal a')
    expect(links.map((a) => a.attributes('href'))).toEqual(['/legal/terms', '/legal/privacy'])
    expect(links.every((a) => a.attributes('target') === '_blank')).toBe(true)
  })

  it('sin marcarla no se completa el alta', async () => {
    await mountRegister()
    await fillForm()
    await submit()

    expect(mocks.registerUser).not.toHaveBeenCalled()
    expect(wrapper.find('#register-legal-error').text()).toBe(es.auth.register.errors.legalRequired)
    expect(wrapper.find('.register-legal-checkbox').attributes('aria-invalid')).toBe('true')
  })

  it('marcada, envía la aceptación con las versiones vigentes', async () => {
    await mountRegister()
    await fillForm()
    await wrapper.find('.register-legal-checkbox').setValue(true)
    await submit()

    expect(mocks.registerUser).toHaveBeenCalledOnce()
    const options = mocks.registerUser.mock.calls[0][4]
    expect(options.legal).toEqual({ accepted: true, versions: acceptanceVersions() })
    expect(wrapper.find('#register-legal-error').exists()).toBe(false)
  })

  it('si los documentos cambiaron, pide recargar en vez de un error genérico', async () => {
    mocks.registerUser.mockRejectedValue(
      Object.assign(new Error('changed'), { serverCode: 'legal_version_outdated' }),
    )
    await mountRegister()
    await fillForm()
    await wrapper.find('.register-legal-checkbox').setValue(true)
    await submit()

    expect(wrapper.find('.register-banner--error').text()).toBe(es.auth.register.errors.legalOutdated)
  })
})
