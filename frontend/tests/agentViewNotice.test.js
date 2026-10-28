import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createRouter, createMemoryHistory } from 'vue-router'
import es from '@/locales/es.json'
import en from '@/locales/en.json'

vi.mock('@/services/agent.js', () => ({
  sendAgentMessage: vi.fn(),
  fetchAgentStatus: vi.fn().mockResolvedValue({ configured: true, persistence: false }),
  listConversations: vi.fn().mockResolvedValue([]),
  loadConversation: vi.fn(),
  deleteConversation: vi.fn(),
  editAgentMessage: vi.fn(),
  deleteAgentMessage: vi.fn(),
}))

import AgentView from '@/views/AgentView.vue'

const Stub = { template: '<div />' }

const montar = async (locale = 'es') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/agent', component: AgentView },
      { path: '/legal', component: Stub },
    ],
  })
  await router.push('/agent')
  await router.isReady()

  const wrapper = mount(AgentView, {
    global: {
      plugins: [router, createI18n({ legacy: false, locale, fallbackLocale: 'en', messages: { es, en } })],
      stubs: { AppNavbar: true },
    },
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  setActivePinia(createPinia())
})

/**
 * L-5: el aviso del asistente tiene que estar a la vista donde se usa, no
 * solo dentro de la página legal.
 */
describe('AgentView — aviso del asistente IA', () => {
  it('muestra la advertencia y enlaza al aviso completo junto al chat', async () => {
    const wrapper = await montar('es')

    const aviso = wrapper.find('[data-testid="agent-ai-notice"]')
    expect(aviso.exists()).toBe(true)
    expect(aviso.text()).toContain(es.agent.notice.text)

    const enlace = aviso.find('a')
    expect(enlace.attributes('href')).toBe('/legal#ai')
    expect(enlace.attributes('target')).toBe('_blank')
    expect(enlace.text()).toBe(es.agent.notice.link)
  })

  it('el aviso queda debajo del campo de texto, también en inglés', async () => {
    const wrapper = await montar('en')

    const seccion = wrapper.find('.input-section')
    expect(seccion.find('textarea').exists()).toBe(true)
    expect(seccion.find('[data-testid="agent-ai-notice"]').text()).toContain(en.agent.notice.text)
  })
})
