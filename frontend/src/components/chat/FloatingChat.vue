<template>
  <Teleport to="body">
    <Transition name="float">
      <div v-if="isOpen" class="float-panel" :class="{ 'in-chat': activeChat }">
        <div v-if="!activeChat" class="fp-header">
          <div class="fp-header-top">
            <span class="fp-title">Mensajes</span>
            <div class="fp-header-actions">
              <span v-if="totalUnread" class="fp-total-unread">{{ totalUnread }}</span>

              <button class="fp-icon-btn" title="Nuevo chat" @click="openNewChat">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                </svg>
              </button>

              <RouterLink to="/chat" class="fp-icon-btn" title="Ver pantalla completa" @click="isOpen = false">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </RouterLink>

              <button class="fp-icon-btn" @click="isOpen = false">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                </svg>
              </button>
            </div>
          </div>

          <div class="fp-search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="#555" stroke-width="1.8" />
              <path d="M21 21l-4.35-4.35" stroke="#555" stroke-width="1.8" stroke-linecap="round" />
            </svg>
            <input v-model="searchQuery" type="text" placeholder="Buscar..." />
          </div>
        </div>

        <div v-else class="fp-chat-header">
          <button class="fp-back-btn" @click="activeChat = null">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>

          <div class="fp-chat-info">
            <div class="fp-chat-avatar at-dm">{{ activeChat.avatar }}</div>
            <div class="fp-chat-text">
              <span class="fp-chat-name">{{ activeChat.name }}</span>
              <span class="fp-chat-sub">
                <span v-if="isTyping">escribiendo...</span>
                <span v-else>{{ activeChat.email || 'Mensaje directo' }}</span>
              </span>
            </div>
          </div>

          <button class="fp-icon-btn" title="Videollamada" @click="startVideoCallFromFloatingChat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M15 10l5-3v10l-5-3v-4Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
              <rect x="3" y="6" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.8" />
            </svg>
          </button>

          <RouterLink to="/chat" class="fp-icon-btn" title="Abrir en pantalla completa" @click="isOpen = false">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </RouterLink>
        </div>

        <div v-if="!activeChat" class="fp-list">
          <div v-if="panelError" class="fp-error">{{ panelError }}</div>

          <div v-if="filteredConvs.length === 0" class="fp-empty">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#333" stroke-width="1.5" stroke-linejoin="round" />
            </svg>
            <span>Sin conversaciones</span>
          </div>

          <div
            v-for="conversation in filteredConvs"
            :key="conversation._id"
            class="fp-conv-item"
            @click="openChat(conversation)"
          >
            <div class="fp-av-wrap">
              <div class="fp-avatar at-dm">{{ conversation.avatar }}</div>
            </div>

            <div class="fp-conv-body">
              <div class="fp-conv-top">
                <span class="fp-conv-name">{{ conversation.name }}</span>
                <span class="fp-conv-time">{{ fmtTime(conversation.lastMessage?.createdAt) }}</span>
              </div>

              <div class="fp-conv-btm">
                <span class="fp-conv-preview">{{ conversation.lastMessage?.text || 'Sin mensajes aún' }}</span>
                <span v-if="conversation.unread" class="fp-unread">{{ conversation.unread }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="fp-mini-chat">
          <div class="fp-messages" ref="miniMsgEl">
            <div v-if="activeMiniMessages.length === 0" class="fp-chat-placeholder">
              <span>No hay mensajes en esta conversación.</span>
            </div>

            <div
              v-else
              v-for="message in activeMiniMessages"
              :key="message._id"
              class="fp-msg"
              :class="{ own: message.senderId === myId }"
            >
              <div v-if="message.senderId !== myId" class="fp-msg-av">{{ activeChat.avatar }}</div>

              <div class="fp-msg-wrap">
                <div v-if="message.text" class="fp-msg-bubble">{{ message.text }}</div>

                <template
                  v-for="(attachment, attachmentIndex) in message.attachments"
                  :key="attachmentKey(message._id, attachment, attachmentIndex)"
                >
                  <a
                    v-if="attachment.type === 'file'"
                    class="fp-attach-file"
                    :href="attachment.url"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
                      <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
                    </svg>
                    <span>{{ attachment.filename }}</span>
                  </a>

                  <a
                    v-else-if="attachment.type === 'image'"
                    class="fp-attach-img"
                    :href="attachment.url"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img :src="attachment.url" :alt="attachment.filename" loading="lazy" />
                  </a>

                  <div v-else-if="attachment.type === 'audio'" class="fp-attach-audio">
                    <audio controls :src="attachment.url" preload="metadata" />
                  </div>

                  <div v-else-if="attachment.type === 'video'" class="fp-attach-video">
                    <video controls :src="attachment.url" preload="metadata" />
                  </div>
                </template>

                <span class="fp-msg-time">{{ fmtTime(message.createdAt) }}</span>
              </div>
            </div>

            <div v-if="isTyping" class="fp-typing">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>

          <div class="fp-input-area">
            <div class="fp-attach-row">
              <button class="fp-att-btn" title="Adjuntar archivo" @click="triggerMiniUpload()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>

              <button class="fp-att-btn" title="Imagen" @click="triggerMiniUpload('image/*')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.6" />
                  <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="1.6" />
                  <path d="M21 15l-5-5L5 21" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>

              <button class="fp-att-btn" title="Audio o video" @click="triggerMiniUpload('audio/*,video/*')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M14 3v18l7-4V7l-7-4Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
                  <path d="M3 8h7v8H3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
                </svg>
              </button>

              <span v-if="miniStatus" class="fp-status">{{ miniStatus }}</span>
            </div>

            <div class="fp-input-row">
              <textarea
                ref="miniTextarea"
                v-model="miniInput"
                placeholder="Escribe un mensaje..."
                rows="1"
                @keydown.enter.exact.prevent="sendMini"
                @input="autoResize"
              ></textarea>

              <button
                class="fp-send-btn"
                :class="{ active: miniInput.trim() }"
                :disabled="uploadingMini"
                @click="sendMini"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>

            <p v-if="panelError" class="fp-error fp-error--inline">{{ panelError }}</p>
            <input ref="miniFileInput" type="file" multiple hidden @change="onMiniFilesSelected" />
          </div>
        </div>
      </div>
    </Transition>

    <div v-if="showNewChat" class="fp-modal-overlay" @click.self="showNewChat = false">
      <div class="fp-modal">
        <div class="fp-modal-header">
          <span class="fp-modal-title">Nuevo mensaje directo</span>
          <button class="fp-icon-btn" @click="showNewChat = false">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          </button>
        </div>

        <div class="fp-search fp-search--modal">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="#555" stroke-width="1.8" />
            <path d="M21 21l-4.35-4.35" stroke="#555" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          <input v-model="userSearch" type="text" placeholder="Buscar usuario..." autofocus />
        </div>

        <div class="fp-modal-list">
          <button
            v-for="user in filteredCompanyUsers"
            :key="user.id"
            class="fp-modal-user"
            @click="startDM(user)"
          >
            <div class="fp-avatar at-dm">{{ user.avatar }}</div>
            <div class="fp-modal-user-copy">
              <span class="fp-modal-user-name">{{ user.nombre }} {{ user.apellido }}</span>
              <span class="fp-modal-user-email">{{ user.email }}</span>
            </div>
          </button>

          <div v-if="!filteredCompanyUsers.length" class="fp-empty fp-empty--modal">
            <span>Sin usuarios disponibles</span>
          </div>
        </div>
      </div>
    </div>

    <button class="chat-fab" @click="togglePanel" :class="{ active: isOpen }">
      <svg v-if="!isOpen" width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      </svg>
      <span v-if="!isOpen && totalUnread" class="fab-badge">{{ totalUnread > 9 ? '9+' : totalUnread }}</span>
    </button>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useChatStore } from '../../stores/chat.js'
import { useAuthStore } from '../../stores/auth.js'

const chatStore = useChatStore()
const authStore = useAuthStore()
const myId = computed(() => authStore.user?.id_usuario)

const isOpen = ref(false)
const activeChat = ref(null)
const searchQuery = ref('')
const miniInput = ref('')
const miniMsgEl = ref(null)
const miniTextarea = ref(null)
const miniFileInput = ref(null)
const showNewChat = ref(false)
const userSearch = ref('')
const miniTypingTimeout = ref(null)
const uploadingMini = ref(false)
const miniStatus = ref('')
const panelError = ref('')

const filteredConvs = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return chatStore.conversations

  return chatStore.conversations.filter((conversation) =>
    conversation.name.toLowerCase().includes(query) ||
    (conversation.lastMessage?.text ?? '').toLowerCase().includes(query)
  )
})

const totalUnread = computed(() => chatStore.totalUnread)

const activeMiniMessages = computed(() => {
  if (!activeChat.value) return []
  return chatStore.messages[activeChat.value._id] ?? []
})

const filteredCompanyUsers = computed(() => {
  const query = userSearch.value.trim().toLowerCase()
  return chatStore.companyUsers.filter((user) => (
    !query ||
    `${user.nombre} ${user.apellido}`.toLowerCase().includes(query) ||
    user.email.toLowerCase().includes(query)
  ))
})

const isTyping = computed(() => {
  if (!activeChat.value) return false
  const users = chatStore.typingUsers[activeChat.value._id]
  return users && [...users].some((id) => id !== myId.value)
})

function fmtTime(date) {
  if (!date) return ''
  return new Date(date).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

function attachmentKey(messageId, attachment, index) {
  return `${messageId}:${attachment.publicId || attachment.url || index}`
}

function togglePanel() {
  isOpen.value = !isOpen.value
  if (!isOpen.value) activeChat.value = null
}

async function openChat(conversation) {
  activeChat.value = conversation
  panelError.value = ''
  chatStore.markRead(conversation._id)

  const cachedMessages = chatStore.messages[conversation._id]
  if (!cachedMessages || cachedMessages.length === 0) {
    const response = await chatStore.loadMessages(conversation._id)
    if (!response.success) {
      panelError.value = response.message || 'No se pudo cargar la conversación.'
    }
  }

  nextTick(scrollToBottom)
}

function scrollToBottom() {
  if (miniMsgEl.value) {
    miniMsgEl.value.scrollTop = miniMsgEl.value.scrollHeight
  }
}

function resetMiniComposer() {
  miniInput.value = ''
  if (miniTextarea.value) {
    miniTextarea.value.style.height = 'auto'
  }
}

function sendMini() {
  if (!activeChat.value || uploadingMini.value) return

  const sent = chatStore.sendMessage({
    conversationId: activeChat.value._id,
    text: miniInput.value,
  })

  if (!sent) return

  panelError.value = ''
  resetMiniComposer()
  chatStore.emitStopTyping(activeChat.value._id)
  nextTick(scrollToBottom)
}

function autoResize(event) {
  event.target.style.height = 'auto'
  event.target.style.height = `${Math.min(event.target.scrollHeight, 96)}px`

  if (activeChat.value?._id) {
    chatStore.emitTyping(activeChat.value._id)
    clearTimeout(miniTypingTimeout.value)
    miniTypingTimeout.value = window.setTimeout(() => {
      chatStore.emitStopTyping(activeChat.value._id)
    }, 2000)
  }
}

async function openNewChat() {
  showNewChat.value = true
  panelError.value = ''

  if (!chatStore.companyUsers.length) {
    const response = await chatStore.loadCompanyUsers()
    if (!response.success) {
      panelError.value = response.message || 'No se pudieron cargar los usuarios.'
    }
  }
}

async function startDM(user) {
  try {
    const conversation = await chatStore.startDM(user.id)
    showNewChat.value = false
    if (conversation) {
      await openChat(conversation)
    }
  } catch (error) {
    panelError.value = error.message || 'No se pudo iniciar el chat.'
  }
}

async function startVideoCallFromFloatingChat() {
  if (!activeChat.value) return

  const response = await chatStore.startVideoCall(activeChat.value)
  if (!response.success) {
    panelError.value = response.message || 'No se pudo iniciar la videollamada.'
  }
}

function triggerMiniUpload(accept = '') {
  if (!miniFileInput.value) return
  miniFileInput.value.accept = accept
  miniFileInput.value.click()
}

async function onMiniFilesSelected(event) {
  const files = Array.from(event.target.files ?? [])
  event.target.value = ''

  if (!files.length || !activeChat.value) return

  uploadingMini.value = true
  miniStatus.value = files.length === 1 ? 'Subiendo archivo...' : `Subiendo ${files.length} archivos...`
  panelError.value = ''

  const response = await chatStore.uploadFiles(files)

  uploadingMini.value = false
  miniStatus.value = ''

  if (!response.success) {
    panelError.value = response.message || 'No se pudieron subir los archivos.'
    return
  }

  const sent = chatStore.sendMessage({
    conversationId: activeChat.value._id,
    text: miniInput.value,
    attachments: response.data,
  })

  if (!sent) {
    panelError.value = 'No se pudo enviar el mensaje con adjuntos.'
    return
  }

  resetMiniComposer()
  chatStore.emitStopTyping(activeChat.value._id)
  nextTick(scrollToBottom)
}

watch(activeChat, () => {
  searchQuery.value = ''
  miniInput.value = ''
  panelError.value = ''
  nextTick(scrollToBottom)
})

watch(activeMiniMessages, () => {
  if (activeChat.value?._id) {
    chatStore.markRead(activeChat.value._id)
  }
  nextTick(scrollToBottom)
})

watch(() => chatStore.conversations, () => {
  if (!activeChat.value) return
  const latest = chatStore.conversations.find((conversation) => conversation._id === activeChat.value._id)
  if (latest) activeChat.value = latest
}, { deep: true })

watch(() => chatStore.lastError, (message) => {
  panelError.value = message || ''
})
</script>

<style scoped>
.chat-fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 500;
  width: 52px;
  height: 52px;
  border: none;
  border-radius: 50%;
  background: #caa860;
  color: var(--BtnText);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(202, 168, 96, 0.3);
  transition: transform 0.15s, filter 0.15s;
}

.chat-fab:hover {
  filter: brightness(1.08);
  transform: scale(1.04);
}

.chat-fab.active {
  background: #1a1a1a;
  color: var(--TextMuted);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

.fab-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  background: #fb7185;
  color: var(--Text);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border: 2px solid #0a0a0a;
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  font-weight: 700;
}

.float-panel {
  position: fixed;
  right: 24px;
  bottom: 86px;
  z-index: 499;
  width: 340px;
  height: 500px;
  background: #0d0d0d;
  border: 1px solid #1f1f1f;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.7);
}

.float-panel.in-chat {
  height: 540px;
}

.fp-header,
.fp-chat-header {
  flex-shrink: 0;
  border-bottom: 1px solid #1a1a1a;
}

.fp-header-top,
.fp-chat-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
}

.fp-header-top {
  justify-content: space-between;
}

.fp-title,
.fp-modal-title {
  font-family: 'Playfair Display', serif;
  font-size: 16px;
  color: var(--Text);
}

.fp-header-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .fp-total-unread {
    font-family: 'Manrope', sans-serif;
    font-size: 11px;
    font-weight: 700;
    background: #232017;
    color: var(--Primary);
    border: 1px solid #3e3926;
    padding: 1px 7px;
    border-radius: 10px;
  }

  .fp-icon-btn,
  .fp-back-btn,
  .fp-att-btn {
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 4px;
    background: #121212;
    color: var(--TextDim);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    transition: background 0.12s, color 0.12s;
  }

  .fp-icon-btn:hover,
  .fp-back-btn:hover,
  .fp-att-btn:hover {
    background: #161616;
    color: var(--TextSoft);
  }

  .fp-search {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 12px 12px;
    padding: 0 10px;
    background: #121212;
    border: 1px solid #1a1a1a;
  }

  .fp-search input {
    flex: 1;
    background: #121212;
    border: none;
    outline: none;
    color: var(--Text);
    font-family: 'Manrope', sans-serif;
    font-size: 12px;
    padding: 8px 0;
  }

  .fp-search input::placeholder {
    color: var(--TextFaint);
  }

  .fp-chat-info {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
  }

  .fp-chat-avatar,
  .fp-avatar {
    width: 34px;
    height: 34px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Manrope', sans-serif;
    font-size: 11px;
    font-weight: 700;
  }

  .fp-chat-text,
  .fp-conv-body,
  .fp-modal-user-copy {
    min-width: 0;
  }

  .fp-chat-name,
  .fp-conv-name,
  .fp-modal-user-name {
    display: block;
    color: var(--Text);
    font-family: 'Manrope', sans-serif;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .fp-chat-sub,
  .fp-conv-preview,
  .fp-modal-user-email {
    display: block;
    color: var(--TextDim);
    font-family: 'Manrope', sans-serif;
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .fp-list,
  .fp-modal-list,
  .fp-messages {
    flex: 1;
    overflow-y: auto;
  }

  .fp-chat-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 14px 12px;
    min-height: 120px;
    color: var(--TextSoft);
    font-family: 'Manrope', sans-serif;
    font-size: 13px;
    text-align: center;
    background: #111111;
    border-radius: 8px;
  }

  .fp-modal-list::-webkit-scrollbar-thumb,
  .fp-messages::-webkit-scrollbar-thumb {
    background: #1f1f1f;
  }

  .fp-conv-item,
  .fp-modal-user {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: #0d0d0d;
    border: none;
    text-align: left;
    cursor: pointer;
    transition: background 0.1s;
  }

  .fp-conv-item:hover,
  .fp-modal-user:hover {
    background: #131313;
  }

  .fp-conv-top,
  .fp-conv-btm {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  .fp-conv-time {
    flex-shrink: 0;
    color: var(--TextFaint);
    font-family: 'Manrope', sans-serif;
    font-size: 11px;
  }

  .fp-msg-av {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    border-radius: 50%;
    background: #2d281a;
    border: 1px solid #3d351f;
    color: var(--Primary);
    font-family: 'Manrope', sans-serif;
    font-size: 8px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .fp-msg-wrap {
    max-width: 220px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .fp-msg.own .fp-msg-wrap {
    align-items: flex-end;
  }

  .fp-msg-bubble {
    padding: 7px 10px;
    border-radius: 2px 10px 10px 10px;
    background: #161616;
    border: 1px solid #222222;
    color: #e0dcd5;
    font-family: 'Manrope', sans-serif;
    font-size: 12px;
    line-height: 1.45;
    word-break: break-word;
  }

  .fp-msg.own .fp-msg-bubble {
    background: #2f2914;
    border-color: #3f361e;
    color: var(--Text);
    border-radius: 10px 2px 10px 10px;
  }

  .fp-attach-file,
  .fp-attach-img,
  .fp-attach-audio,
  .fp-attach-video {
    max-width: 200px;
    border: 1px solid #232323;
    background: #141414;
    color: var(--TextMuted);
    text-decoration: none;
  }

  .fp-attach-file {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    font-family: 'Manrope', sans-serif;
    font-size: 11px;
  }

  .fp-attach-file span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .fp-attach-img,
  .fp-attach-video {
    display: block;
    overflow: hidden;
  }

  .fp-attach-img img,
  .fp-attach-video video,
  .fp-attach-audio audio {
    display: block;
    width: 100%;
    max-width: 200px;
  }

  .fp-attach-audio {
    padding: 6px;
  }

  .fp-msg-time,
  .fp-status {
    color: var(--TextFaint);
    font-family: 'Manrope', sans-serif;
    font-size: 11px;
  }

  .fp-input-area {
    flex-shrink: 0;
    border-top: 1px solid #1a1a1a;
    padding: 8px 10px;
    background: #0d0d0d;
  }

  .fp-attach-row {
    display: flex;
    align-items: center;
    gap: 2px;
    margin-bottom: 6px;
  }

  .fp-input-row {
    display: flex;
    align-items: flex-end;
    gap: 6px;
  }

  .fp-input-row textarea {
    flex: 1;
    min-height: 32px;
    max-height: 96px;
    resize: none;
    outline: none;
    border: 1px solid #1f1f1f;
    background: #141414;
    color: var(--Text);
    padding: 7px 10px;
    font-family: 'Manrope', sans-serif;
    font-size: 12px;
    line-height: 1.4;
    transition: border-color 0.15s;
  }

  .fp-input-row textarea:focus {
    border-color: #caa860;
  }

  .fp-input-row textarea::placeholder {
    color: #333;
  }

  .fp-send-btn {
    width: 32px;
    height: 32px;
    border: 1px solid #1f1f1f;
    background: #121212;
    color: var(--TextFaint);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .fp-send-btn.active {
    background: #caa860;
    border-color: #caa860;
    color: var(--BtnText);
  }

  .fp-send-btn:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .fp-error--inline {
    margin: 8px 0 0;
    padding: 0;
    text-align: left;
  }

  .fp-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 700;
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .fp-modal {
    width: 320px;
    max-height: 420px;
    background: #0d0d0d;
    border: 1px solid #1f1f1f;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .fp-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border-bottom: 1px solid #1a1a1a;
  }

  .fp-search--modal {
    margin-top: 12px;
  }

  .at-dm {
    background: #2d2618;
    border: 1px solid #3f351f;
    color: var(--Primary);
  }
.fp-unread {
  flex-shrink: 0;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  background: #caa860;
  color: var(--BtnText);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  font-weight: 700;
}

.fp-empty,
.fp-error {
  padding: 18px 14px;
  text-align: center;
  color: var(--TextFaint);
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
}

.fp-error {
  color: #fb7185;
}

.fp-empty--modal {
  padding: 24px 14px;
}

.fp-mini-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.fp-messages {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fp-msg {
  display: flex;
  align-items: flex-end;
  gap: 6px;
}

.fp-msg.own {
  flex-direction: row-reverse;
}

.fp-msg-av {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #2d281a;
  border: 1px solid #3d351f;
  color: var(--Primary);
  font-family: 'Manrope', sans-serif;
  font-size: 8px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fp-msg-wrap {
  max-width: 220px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fp-msg.own .fp-msg-wrap {
  align-items: flex-end;
}

.fp-msg-bubble {
  padding: 7px 10px;
  border-radius: 2px 10px 10px 10px;
  background: #161616;
  border: 1px solid #222222;
  color: #e0dcd5;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  line-height: 1.45;
  word-break: break-word;
}

.fp-msg.own .fp-msg-bubble {
  background: #2f2914;
  border-color: #3f361e;
  color: var(--Text);
  border-radius: 10px 2px 10px 10px;
}

.fp-attach-file,
.fp-attach-img,
.fp-attach-audio,
.fp-attach-video {
  max-width: 200px;
  border: 1px solid #232323;
  background: #141414;
  color: var(--TextMuted);
  text-decoration: none;
}

.fp-attach-file {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
}

.fp-attach-file span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fp-attach-img,
.fp-attach-video {
  display: block;
  overflow: hidden;
}

.fp-attach-img img,
.fp-attach-video video,
.fp-attach-audio audio {
  display: block;
  width: 100%;
  max-width: 200px;
}

.fp-attach-audio {
  padding: 6px;
}

.fp-msg-time,
.fp-status {
  color: var(--TextFaint);
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
}

.fp-typing {
  display: flex;
  gap: 4px;
  padding-left: 30px;
}

.fp-typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #444;
  animation: blink 1.2s infinite;
}

.fp-typing span:nth-child(2) { animation-delay: 0.2s; }
.fp-typing span:nth-child(3) { animation-delay: 0.4s; }

.fp-input-area {
  flex-shrink: 0;
  border-top: 1px solid #1a1a1a;
  padding: 8px 10px;
  background: #0d0d0d;
}

.fp-attach-row {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-bottom: 6px;
}

.fp-input-row {
  display: flex;
  align-items: flex-end;
  gap: 6px;
}

.fp-input-row textarea {
    flex: 1;
    min-height: 32px;
    max-height: 96px;
    resize: none;
    outline: none;
    border: 1px solid #1f1f1f;
    background: #141414;
    color: var(--Text);
    padding: 7px 10px;
    font-family: 'Manrope', sans-serif;
    font-size: 12px;
    line-height: 1.4;
    transition: border-color 0.15s;
  }

  .fp-input-row textarea:focus {
    border-color: #caa860;
  }

  .fp-input-row textarea::placeholder {
    color: #333;
  }

  .fp-send-btn {
    width: 32px;
    height: 32px;
    border: 1px solid #1f1f1f;
    background: #121212;
    color: var(--TextFaint);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .fp-send-btn.active {
    background: #caa860;
    border-color: #caa860;
    color: var(--BtnText);
  }

  .fp-send-btn:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .fp-error--inline {
    margin: 8px 0 0;
    padding: 0;
    text-align: left;
  }
.fp-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 700;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fp-modal {
  width: 320px;
  max-height: 420px;
  background: #0d0d0d;
  border: 1px solid #1f1f1f;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.fp-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid #1a1a1a;
}

.fp-search--modal {
  margin-top: 12px;
}

.at-dm {
    background: #2d2618;
    border: 1px solid #3f351f;
}

.float-enter-active,
.float-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.float-enter-from,
.float-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.97);
}

@keyframes blink {
  0%, 80%, 100% { opacity: 0.2; }
  40% { opacity: 1; }
}
</style>
