import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import es from '@/locales/es.json'
import en from '@/locales/en.json'
import ChatView from '@/views/ChatView.vue'
import { useChatStore } from '@/stores/chat.js'

// Node 25 expone un localStorage propio que tapa el de happy-dom y no
// implementa getItem/clear. Con Node 22 (.nvmrc) el shim es inofensivo.
const almacen = new Map()
globalThis.localStorage = {
  getItem: (clave) => almacen.get(clave) ?? null,
  setItem: (clave, valor) => almacen.set(clave, String(valor)),
  removeItem: (clave) => almacen.delete(clave),
  clear: () => almacen.clear(),
}

const conversacion = {
  _id: 'c1',
  type: 'dm',
  name: 'María Fernanda López García',
  avatar: 'ML',
  email: 'maria@example.com',
  otherUserId: 8,
  unread: 2,
  lastMessage: null,
  updatedAt: new Date().toISOString(),
}

async function montar() {
  const chat = useChatStore()
  chat.conversations = [conversacion]
  const wrapper = mount(ChatView, {
    global: {
      plugins: [createI18n({ legacy: false, locale: 'es', fallbackLocale: 'en', messages: { es, en } })],
      stubs: { AppNavbar: true, Teleport: true },
    },
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  almacen.clear()
  setActivePinia(createPinia())
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [] }) })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ChatView.vue — lista y conversación en móvil', () => {
  it('sin conversación abierta, el cuerpo no marca ninguna activa', async () => {
    const wrapper = await montar()
    expect(wrapper.find('.chat-body').classes()).not.toContain('has-active')
  })

  it('abrir una conversación la marca activa y el botón de volver la cierra', async () => {
    const wrapper = await montar()
    await wrapper.find('.conv-item').trigger('click')
    await flushPromises()

    expect(wrapper.find('.chat-body').classes()).toContain('has-active')
    const volver = wrapper.find('.chat-back-btn')
    expect(volver.attributes('aria-label')).toBe('Volver a las conversaciones')

    await volver.trigger('click')
    expect(wrapper.find('.chat-body').classes()).not.toContain('has-active')
    expect(wrapper.find('.conv-item').exists()).toBe(true)
  })

  it('el CSS de móvil alterna los paneles con esa clase, no con una que nadie pone', () => {
    // Antes la lista se ocultaba con translateX(-100%) y solo `.mobile-open`
    // la volvía a mostrar, clase que ningún código aplicaba.
    const css = readFileSync(resolve(__dirname, '../src/views/ChatView.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const movil = css.slice(css.indexOf('@media (max-width: 700px)'))
    expect(movil).toMatch(/\.chat-body\.has-active \.chat-sidebar\s*\{\s*display:\s*none/)
    expect(movil).toMatch(/\.chat-body:not\(\.has-active\) \.chat-main\s*\{\s*display:\s*none/)
    expect(css).not.toMatch(/mobile-open/)
  })
})
