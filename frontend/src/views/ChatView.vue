<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import AppNavbar from '../components/AppNavbar.vue'
import { useChatStore } from '../stores/chat.js'
import { useAuthStore } from '../stores/auth.js'
import { formatFileSize } from '../utils/chat.js'
import './ChatView.css'

const chatStore = useChatStore()
const authStore = useAuthStore()
const myId = computed(() => authStore.user?.id_usuario)

const activeChatId = ref(null)
const messageInput = ref('')
const searchQuery = ref('')
const messagesEl = ref(null)
const chatTextarea = ref(null)
const expandedSections = ref({ dm: true })
const showNewDM = ref(false)
const userSearch = ref('')
const typingTimeout = ref(null)
const fileInput = ref(null)
const uploadingFiles = ref(false)
const uploadStatus = ref('')
const panelError = ref('')

const activeChat = computed(() =>
  chatStore.conversations.find((conversation) => conversation._id === activeChatId.value) ?? null
)

const filteredConvs = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return chatStore.conversations

  return chatStore.conversations.filter((conversation) =>
    conversation.name.toLowerCase().includes(query) ||
    (conversation.lastMessage?.text ?? '').toLowerCase().includes(query)
  )
})

const activeMessages = computed(() => chatStore.messages[activeChatId.value] ?? [])

const messageGroups = computed(() => {
  const byDate = {}

  activeMessages.value.forEach((message) => {
    const date = new Date(message.createdAt)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    let label = date.toLocaleDateString('es', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })

    if (date.toDateString() === today.toDateString()) label = 'Hoy'
    else if (date.toDateString() === yesterday.toDateString()) label = 'Ayer'

    if (!byDate[label]) byDate[label] = []
    byDate[label].push(message)
  })

  return Object.entries(byDate).map(([date, items]) => {
    const groups = []
    let currentGroup = null

    items.forEach((message) => {
      if (!currentGroup || currentGroup.senderId !== message.senderId) {
        currentGroup = {
          senderId: message.senderId,
          senderName: message.senderName,
          senderAvatar: message.senderAvatar,
          own: message.senderId === myId.value,
          messages: [],
        }
        groups.push(currentGroup)
      }

      currentGroup.messages.push(message)
    })

    return { date, groups }
  })
})

const isTyping = computed(() => {
  if (!activeChatId.value) return false
  const users = chatStore.typingUsers[activeChatId.value]
  return users && [...users].some((id) => id !== myId.value)
})

const filteredCompanyUsers = computed(() => {
  const query = userSearch.value.trim().toLowerCase()
  return chatStore.companyUsers.filter((user) => (
    !query ||
    `${user.nombre} ${user.apellido}`.toLowerCase().includes(query) ||
    user.email.toLowerCase().includes(query)
  ))
})

function fmtTime(date) {
  return date
    ? new Date(date).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
    : ''
}

function attachmentKey(messageId, attachment, index) {
  return `${messageId}:${attachment.publicId || attachment.url || index}`
}

async function selectChat(conversation) {
  activeChatId.value = conversation._id
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
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  }
}

function resetComposer() {
  messageInput.value = ''
  if (chatTextarea.value) {
    chatTextarea.value.style.height = 'auto'
  }
}

function sendMessage() {
  if (!activeChatId.value || uploadingFiles.value) return

  const sent = chatStore.sendMessage({
    conversationId: activeChatId.value,
    text: messageInput.value,
  })

  if (!sent) return

  panelError.value = ''
  resetComposer()
  chatStore.emitStopTyping(activeChatId.value)
  nextTick(scrollToBottom)
}

function autoResize(event) {
  event.target.style.height = 'auto'
  event.target.style.height = `${Math.min(event.target.scrollHeight, 120)}px`

  if (activeChatId.value) {
    chatStore.emitTyping(activeChatId.value)
    clearTimeout(typingTimeout.value)
    typingTimeout.value = window.setTimeout(() => {
      chatStore.emitStopTyping(activeChatId.value)
    }, 2000)
  }
}

function triggerFileUpload(accept = '') {
  if (!fileInput.value) return
  fileInput.value.accept = accept
  fileInput.value.click()
}

async function onFilesSelected(event) {
  const files = Array.from(event.target.files ?? [])
  event.target.value = ''

  if (!files.length || !activeChatId.value) return

  panelError.value = ''
  uploadingFiles.value = true
  uploadStatus.value = files.length === 1 ? 'Subiendo archivo...' : `Subiendo ${files.length} archivos...`

  const response = await chatStore.uploadFiles(files)

  uploadingFiles.value = false
  uploadStatus.value = ''

  if (!response.success) {
    panelError.value = response.message || 'No se pudieron subir los archivos.'
    return
  }

  const sent = chatStore.sendMessage({
    conversationId: activeChatId.value,
    text: messageInput.value,
    attachments: response.data,
  })

  if (!sent) {
    panelError.value = 'No se pudo enviar el mensaje con adjuntos.'
    return
  }

  resetComposer()
  chatStore.emitStopTyping(activeChatId.value)
  nextTick(scrollToBottom)
}

async function openNewDM() {
  showNewDM.value = true
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
    showNewDM.value = false
    if (conversation) {
      await selectChat(conversation)
    }
  } catch (error) {
    panelError.value = error.message || 'No se pudo iniciar el chat.'
  }
}

async function startVideoCallForActiveChat() {
  if (!activeChat.value) return

  const response = await chatStore.startVideoCall(activeChat.value)
  if (!response.success) {
    panelError.value = response.message || 'No se pudo iniciar la videollamada.'
  }
}

watch(activeMessages, () => {
  nextTick(scrollToBottom)
})

watch(() => chatStore.conversations, () => {
  if (!activeChatId.value) return
  const latest = chatStore.conversations.find((conversation) => conversation._id === activeChatId.value)
  if (!latest) {
    activeChatId.value = null
  }
}, { deep: true })

watch(() => chatStore.lastError, (message) => {
  panelError.value = message || ''
})

onMounted(() => {
  if (authStore.isLoggedIn && authStore.hasEmpresa) {
    chatStore.connect()
  }
})
</script>

<template>
  <div class="chat-page">
    <AppNavbar />

    <div class="chat-body">
      <aside class="chat-sidebar">
        <div class="sidebar-top">
          <h2 class="sidebar-title">Mensajes</h2>
          <div class="sidebar-title-actions">
            <button class="s-icon-btn" title="Nuevo mensaje directo" @click="openNewDM">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div class="sidebar-search">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="#666" stroke-width="1.8" />
            <path d="M21 21l-4.35-4.35" stroke="#666" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          <input v-model="searchQuery" type="text" placeholder="Buscar mensajes..." />
        </div>

        <div class="sidebar-content">
          <div class="sidebar-section">
            <button class="section-header" @click="expandedSections.dm = !expandedSections.dm">
              <span class="section-icon">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
                  <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="1.7" />
                </svg>
              </span>
              <span class="section-label">Mensajes Directos</span>
              <span class="section-count">{{ filteredConvs.length }}</span>
              <svg class="section-chevron" :class="{ open: expandedSections.dm }" width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>

            <Transition name="sect">
              <div v-if="expandedSections.dm">
                <div v-if="!chatStore.conversations.length && chatStore.isConnected" class="conv-empty-hint">
                  Sin conversaciones aún. Inicia un nuevo chat con el botón +
                </div>

                <div
                  v-for="conversation in filteredConvs"
                  :key="conversation._id"
                  class="conv-item"
                  :class="{ active: activeChatId === conversation._id }"
                  @click="selectChat(conversation)"
                >
                  <div class="conv-av-wrap">
                    <div class="conv-avatar at-dm">{{ conversation.avatar }}</div>
                  </div>

                  <div class="conv-body">
                    <div class="conv-top">
                      <span class="conv-name">{{ conversation.name }}</span>
                      <span class="conv-time">{{ fmtTime(conversation.lastMessage?.createdAt) }}</span>
                    </div>

                    <div class="conv-bottom">
                      <span class="conv-preview">{{ conversation.lastMessage?.text || 'Sin mensajes aún' }}</span>
                      <span v-if="conversation.unread" class="conv-unread">{{ conversation.unread }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </aside>

      <main class="chat-main">
        <div v-if="!activeChat" class="chat-empty">
          <div class="empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#444" stroke-width="1.5" stroke-linejoin="round" />
            </svg>
          </div>
          <h3 class="empty-title">Tus mensajes</h3>
          <p class="empty-sub">Selecciona una conversación o inicia un nuevo mensaje directo.</p>
          <p v-if="panelError" class="chat-panel-error">{{ panelError }}</p>
        </div>

        <div v-else class="chat-active">
          <div class="chat-header">
            <div class="chat-header-info">
              <div class="chat-header-avatar at-dm">{{ activeChat.avatar }}</div>
              <div>
                <div class="chat-header-name">{{ activeChat.name }}</div>
                <div class="chat-header-meta">
                  <span class="type-badge badge-dm">Directo</span>
                  <span v-if="isTyping" class="chat-typing-hint">escribiendo...</span>
                  <span v-else-if="activeChat.email" class="chat-header-email">{{ activeChat.email }}</span>
                </div>
              </div>
            </div>

            <div class="chat-header-actions">
              <button class="ch-action-btn" title="Videollamada" @click="startVideoCallForActiveChat">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M15 10l5-3v10l-5-3v-4Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                  <rect x="3" y="6" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.8" />
                </svg>
              </button>

              <button class="ch-action-btn" title="Nuevo mensaje directo" @click="openNewDM">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                </svg>
              </button>
            </div>
          </div>

          <div class="messages-area" ref="messagesEl">
            <div v-if="messageGroups.length === 0" class="chat-empty-messages">
              No hay mensajes en esta conversación.
            </div>

            <template v-else v-for="dateGroup in messageGroups" :key="dateGroup.date">
              <div class="date-divider"><span>{{ dateGroup.date }}</span></div>

              <div
                v-for="(group, groupIndex) in dateGroup.groups"
                :key="`${dateGroup.date}:${groupIndex}`"
                class="msg-group"
                :class="{ own: group.own }"
              >
                <div v-if="!group.own" class="msg-group-avatar">{{ group.senderAvatar }}</div>

                <div class="msg-group-content">
                  <span v-if="!group.own" class="msg-sender-name">{{ group.senderName }}</span>

                  <div v-for="message in group.messages" :key="message._id" class="msg-item">
                    <div v-if="message.text" class="msg-bubble">{{ message.text }}</div>

                    <template
                      v-for="(attachment, attachmentIndex) in message.attachments"
                      :key="attachmentKey(message._id, attachment, attachmentIndex)"
                    >
                      <div v-if="attachment.type === 'file'" class="msg-attach-file">
                        <div class="attach-file-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
                            <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
                          </svg>
                        </div>

                        <div class="attach-file-info">
                          <span class="attach-file-name">{{ attachment.filename }}</span>
                          <span class="attach-file-size">{{ formatFileSize(attachment.size) }}</span>
                        </div>

                        <a :href="attachment.url" target="_blank" rel="noreferrer" class="attach-dl-btn" title="Abrir archivo">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                          </svg>
                        </a>
                      </div>

                      <a
                        v-else-if="attachment.type === 'image'"
                        class="msg-attach-image"
                        :href="attachment.url"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img :src="attachment.url" :alt="attachment.filename" loading="lazy" />
                      </a>

                      <div v-else-if="attachment.type === 'audio'" class="msg-attach-audio">
                        <audio controls :src="attachment.url" preload="metadata" />
                      </div>

                      <div v-else-if="attachment.type === 'video'" class="msg-attach-video">
                        <video controls :src="attachment.url" preload="metadata" />
                      </div>
                    </template>

                    <span class="msg-time">{{ fmtTime(message.createdAt) }}</span>
                  </div>
                </div>
              </div>
            </template>

            <div v-if="isTyping" class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>

          <div class="chat-input-area">
            <div class="attach-toolbar">
              <button class="attach-tool-btn" title="Adjuntar archivo" @click="triggerFileUpload()">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>

              <button class="attach-tool-btn" title="Adjuntar imagen" @click="triggerFileUpload('image/*')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.6" />
                  <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="1.6" />
                  <path d="M21 15l-5-5L5 21" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>

              <button class="attach-tool-btn" title="Adjuntar audio o video" @click="triggerFileUpload('audio/*,video/*')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M14 3v18l7-4V7l-7-4Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
                  <path d="M3 8h7v8H3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
                </svg>
              </button>

              <span v-if="uploadingFiles || uploadStatus" class="upload-hint">{{ uploadStatus }}</span>
              <span v-else-if="panelError" class="upload-error">{{ panelError }}</span>

              <input ref="fileInput" type="file" multiple style="display: none" @change="onFilesSelected" />
            </div>

            <div class="input-row">
              <textarea
                ref="chatTextarea"
                v-model="messageInput"
                class="chat-textarea"
                placeholder="Escribe un mensaje..."
                rows="1"
                @keydown.enter.exact.prevent="sendMessage"
                @input="autoResize"
              ></textarea>

              <button
                class="send-btn"
                :class="{ active: messageInput.trim() }"
                :disabled="uploadingFiles"
                @click="sendMessage"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>

    <Teleport to="body">
      <div v-if="showNewDM" class="ndm-overlay" @click.self="showNewDM = false">
        <div class="ndm-modal">
          <div class="ndm-header">
            <span class="ndm-title">Nuevo mensaje directo</span>
            <button class="ndm-close" @click="showNewDM = false">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              </svg>
            </button>
          </div>

          <div class="ndm-search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="#666" stroke-width="1.8" />
              <path d="M21 21l-4.35-4.35" stroke="#666" stroke-width="1.8" stroke-linecap="round" />
            </svg>
            <input v-model="userSearch" type="text" placeholder="Buscar usuario..." autofocus />
          </div>

          <div class="ndm-list">
            <div v-for="user in filteredCompanyUsers" :key="user.id" class="ndm-user" @click="startDM(user)">
              <div class="conv-avatar at-dm" style="width: 36px; height: 36px; font-size: 11px;">{{ user.avatar }}</div>
              <div>
                <div class="ndm-name">{{ user.nombre }} {{ user.apellido }}</div>
                <div class="ndm-email">{{ user.email }}</div>
              </div>
            </div>

            <div v-if="!filteredCompanyUsers.length" class="ndm-empty">Sin usuarios encontrados</div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.conv-empty-hint {
  padding: 12px 16px;
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  color: var(--TextFaint);
  line-height: 1.5;
}

.chat-header-email {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  color: var(--TextFaint);
}

.chat-panel-error {
  margin-top: 12px;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  color: #fb7185;
}

.chat-typing-hint {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  color: var(--Primary);
  font-style: italic;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 0;
  margin-left: 46px;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  background: #444;
  border-radius: 50%;
  animation: blink 1.2s infinite;
}

.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

@keyframes blink {
  0%, 80%, 100% { opacity: 0.2; }
  40% { opacity: 1; }
}

.upload-hint {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  color: var(--Primary);
  padding-left: 8px;
}

.upload-error {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  color: #fb7185;
  padding-left: 8px;
}

.msg-attach-image img,
.msg-attach-video video,
.msg-attach-audio audio {
  max-width: 280px;
  max-height: 280px;
  display: block;
  object-fit: cover;
}

.msg-attach-audio audio {
  max-width: 260px;
}

.msg-attach-image {
  display: block;
}

.msg-attach-image img {
  width: 100%;
}

.msg-attach-video video {
  max-height: 220px;
}

.ndm-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: #050505;
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.ndm-modal {
  width: 400px;
  max-height: 520px;
  background: #0d0d0d;
  border: 1px solid #1f1f1f;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ndm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid #1a1a1a;
}

.ndm-title {
  font-family: 'Playfair Display', serif;
  font-size: 16px;
  color: var(--Text);
}

.ndm-close {
  width: 26px;
  height: 26px;
  border: none;
  background: none;
  color: var(--TextFaint);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.12s;
}

.ndm-close:hover { color: var(--TextSoft); }

.ndm-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  margin: 10px 12px;
  background: #111111;
  border: 1px solid #1f1f1f;
}

.ndm-search input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: var(--Text);
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  padding: 9px 0;
}

.ndm-search input::placeholder { color: var(--TextFaint); }

.ndm-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.ndm-list::-webkit-scrollbar { width: 4px; }
.ndm-list::-webkit-scrollbar-thumb { background: #252525; }

.ndm-user {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.1s;
}

.ndm-user:hover { background: #151515; }

.ndm-name {
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #e0dcd5;
}

.ndm-email {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  color: var(--TextFaint);
}

.ndm-empty {
  padding: 20px;
  text-align: center;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  color: var(--TextFaint);
}
</style>
