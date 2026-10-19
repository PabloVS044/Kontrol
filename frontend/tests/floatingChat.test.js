import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { createI18n } from 'vue-i18n'
import es from '@/locales/es.json'
import en from '@/locales/en.json'

const chatStore = reactive({
  conversations: [{ _id: 'c1', name: 'Ana López', avatar: 'AL', unread: 0, lastMessage: null }],
  messages: { c1: [{ _id: 'm1', senderId: 2, text: 'Hola', attachments: [], createdAt: '2026-10-18T10:00:00Z' }] },
  companyUsers: [],
  typingUsers: {},
  totalUnread: 0,
  lastError: '',
  markRead: vi.fn(),
  loadMessages: vi.fn(),
  sendMessage: vi.fn(() => true),
  emitTyping: vi.fn(),
  emitStopTyping: vi.fn(),
})

vi.mock('@/stores/chat.js', () => ({ useChatStore: () => chatStore }))
vi.mock('@/stores/auth.js', () => ({ useAuthStore: () => ({ user: { id_usuario: 1 } }) }))

import FloatingChat from '@/components/chat/FloatingChat.vue'

describe('FloatingChat.vue', () => {
  it('abre el panel, envía un mensaje en la conversación y se cierra', async () => {
    const wrapper = mount(FloatingChat, {
      global: {
        plugins: [createI18n({ legacy: false, locale: 'es', fallbackLocale: 'en', messages: { es, en } })],
        stubs: { RouterLink: true, transition: false, teleport: true },
      },
    })

    expect(wrapper.find('.float-panel').exists()).toBe(false)
    await wrapper.find('.chat-fab').trigger('click')
    expect(wrapper.find('.float-panel').exists()).toBe(true)
    expect(wrapper.find('.fp-search input').exists()).toBe(true)

    await wrapper.find('.fp-conv-item').trigger('click')
    expect(chatStore.markRead).toHaveBeenCalledWith('c1')
    expect(wrapper.find('.fp-msg-bubble').text()).toBe('Hola')

    await wrapper.find('.fp-input-row textarea').setValue('Listo el pedido')
    await wrapper.find('.fp-send-btn').trigger('click')
    expect(chatStore.sendMessage).toHaveBeenCalledWith({ conversationId: 'c1', text: 'Listo el pedido' })

    await wrapper.find('.chat-fab').trigger('click')
    expect(wrapper.find('.float-panel').exists()).toBe(false)
  })
})
