import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import es from '@/locales/es.json'
import en from '@/locales/en.json'

vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ token: 't', idEmpresaActual: 1 }) }))

import TeamsView from '@/views/TeamsView.vue'

const respuesta = (data) => ({ ok: true, json: async () => ({ data }) })

describe('TeamsView.vue', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('monta el formulario y crea un equipo con POST /api/teams', async () => {
    const fetchMock = vi.fn((url, options = {}) => {
      if (url === '/api/teams/context') {
        return Promise.resolve(respuesta({ members: [{ id_usuario: 3, nombre: 'Ana', apellido: 'López' }], projects: [] }))
      }
      if (url === '/api/teams' && options.method === 'POST') return Promise.resolve(respuesta({ id_equipo: 5 }))
      return Promise.resolve(respuesta([]))
    })
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = mount(TeamsView, {
      global: {
        plugins: [createI18n({ legacy: false, locale: 'es', fallbackLocale: 'en', messages: { es, en } })],
        stubs: { AppNavbar: true },
      },
    })
    await flushPromises()

    expect(wrapper.find('.team-form input').exists()).toBe(true)
    expect(wrapper.find('.team-form select').exists()).toBe(true)
    expect(wrapper.find('.team-form textarea').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)

    await wrapper.find('.team-form input').setValue('Ventas')
    await wrapper.find('.team-form select').findAll('option')[1].setSelected()
    await wrapper.find('.team-form').trigger('submit')
    await flushPromises()

    const post = fetchMock.mock.calls.find(([url, options]) => url === '/api/teams' && options?.method === 'POST')
    expect(JSON.parse(post[1].body)).toEqual({ nombre: 'Ventas', descripcion: '', id_lider: 3 })
  })
})
