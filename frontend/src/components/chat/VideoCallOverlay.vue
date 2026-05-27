<template>
  <Teleport to="body">
    <div v-if="showIncomingPrompt" class="call-backdrop">
      <div class="call-card call-card--incoming">
        <div class="call-avatar">{{ incomingPeerAvatar }}</div>
        <div class="call-copy">
          <p class="call-kicker">Videollamada entrante</p>
          <h3 class="call-name">{{ incomingPeerName }}</h3>
          <p class="call-sub">Quiere iniciar una videollamada directa contigo.</p>
          <p v-if="chatStore.callError" class="call-error">{{ chatStore.callError }}</p>
        </div>

        <div class="call-actions">
          <button class="call-btn call-btn--ghost" @click="declineCall">Rechazar</button>
          <button class="call-btn call-btn--primary" @click="acceptCall">Aceptar</button>
        </div>
      </div>
    </div>

<div v-if="chatStore.activeCall" class="call-backdrop call-backdrop--active">
      <div class="call-shell" :class="{ 'has-side-chat': showSideChat }">


        <!-- área de vídeo (En la izquierda) -->
        <div class="call-main-area">
          <div class="call-stage">
            <video ref="remoteVideoEl" class="call-remote-video" autoplay playsinline></video>

            <div v-if="!hasRemoteVideo" class="call-stage-placeholder">
              <div class="call-stage-avatar">{{ activePeerAvatar }}</div>
              <p class="call-stage-title">{{ activePeerName }}</p>
              <p class="call-stage-status">{{ statusLabel }}</p>
            </div>

            <div class="call-local-preview">
              <video
                ref="localVideoEl"
                class="call-local-video"
                :class="{ 'is-hidden': !chatStore.isCameraEnabled }"
                autoplay
                muted
                playsinline
              ></video>
              <div v-if="!chatStore.isCameraEnabled" class="call-local-off">Camara apagada</div>
            </div>
          </div>
        
          <div class="call-toolbar">
            <div class="call-toolbar-copy">
              <p class="call-kicker">Videollamada</p>
              <h3 class="call-name">{{ activePeerName }}</h3>
              <p class="call-sub">{{ statusLabel }}</p>
              <p v-if="chatStore.callError" class="call-error">{{ chatStore.callError }}</p>
            </div>

            <div class="call-toolbar-actions">
              <button
                class="call-circle-btn"
                :class="{ inactive: !chatStore.isMicrophoneEnabled }"
                :title="chatStore.isMicrophoneEnabled ? 'Silenciar microfono' : 'Activar microfono'"
                @click="chatStore.toggleCallMicrophone()"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 1 1-6 0V6a3 3 0 0 1 3-3Z" stroke="currentColor" stroke-width="1.8" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                </svg>
              </button>

              <button
                class="call-circle-btn"
                :class="{ inactive: !chatStore.isCameraEnabled }"
                :title="chatStore.isCameraEnabled ? 'Apagar camara' : 'Encender camara'"
                @click="chatStore.toggleCallCamera()"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M15 10l5-3v10l-5-3v-4Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                  <rect x="3" y="6" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.8" />
                </svg>
              </button>

              <button 
                class="call-circle-btn call-circle-btn--danger"
                title="Colgar"
                @click="chatStore.endVideoCall()">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <path d="M4 15c1.7-1.4 4.3-2.5 8-2.5s6.3 1.1 8 2.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                  <path d="M8 14l-2 4M16 14l2 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                </svg>
              </button>

              <button 
                class="call-circle-btn" 
                :class="{ active: showSideChat, 'has-unread': unreadCount > 0 && !showSideChat }" 
                @click="showSideChat = !showSideChat" 
                style="position: relative;" >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="1.8" />
                </svg>
                
                <!-- Burbuja de notificación -->
                <span v-if="unreadCount > 0 && !showSideChat" class="unread-badge">
                  {{ unreadCount }}
                </span>
              </button>
            </div>
          </div>
        </div>
        
        <!-- Panel lateral -->
        <aside v-if="showSideChat" class="call-side-chat">
          <div class="side-chat-header">
            <span>Chat de la reunión</span>
            <button @click="showSideChat = false" class="close-side-btn">
              <svg width="14" height="14" view-box="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </button>
          </div>

          <div class="side-chat-body" ref="sideMsgEl">
            <div v-if="sideChatLoading" class="side-chat-placeholder">
              Cargando chat...
            </div>

            <div v-else-if="sideChatError" class="side-chat-placeholder side-chat-placeholder--error">
              {{ sideChatError }}
            </div>

            <div v-else-if="!messages.length" class="side-chat-placeholder">
              No hay mensajes disponibles para esta conversación.
            </div>

            <div v-else>
              <div v-for="(msg, idx) in messages" :key="msg._id">
                <div v-if="newMessagesIndexAtOpen >= 0 && idx === newMessagesIndexAtOpen" ref="newMessagesDividerEl" class="new-messages-divider">
                  <span>Mensajes nuevos ({{ newMessagesCountAtOpen }})</span>
                </div>

                <div class="mini-msg">
                  <span class="mini-msg-name">{{ msg.senderName }}:</span>
                  <p class="mini-msg-text">{{ msg.text }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="side-chat-input-area">
            <input v-model="sideMessageInput" @keydown.enter="sendSideMessage" placeholder="Responder..." />
          </div>
        </aside>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useChatStore } from '../../stores/chat.js'
import { useAuthStore } from '../../stores/auth.js'

const chatStore = useChatStore()
const authStore = useAuthStore()

const localVideoEl = ref(null)
const remoteVideoEl = ref(null)

const showIncomingPrompt = computed(() => Boolean(chatStore.incomingCall) && !chatStore.activeCall)
const hasRemoteVideo = computed(() => chatStore.activeCall?.status === 'connected')
const incomingPeerName = computed(() => chatStore.incomingCall?.peerName || 'Usuario')
const incomingPeerAvatar = computed(() => chatStore.incomingCall?.peerAvatar || '??')
const activePeerName = computed(() => chatStore.activeCall?.peerName || 'Usuario')
const activePeerAvatar = computed(() => chatStore.activeCall?.peerAvatar || '??')

const showSideChat = ref(false)

const sideMsgEl = ref(null)
const sideMessageInput = ref('')
const sideChatLoading = ref(false)
const sideChatError = ref('')

const myId = computed(() => authStore.user?.id_usuario ?? null)

const unreadCount = computed(() => {


  const convId = chatStore.activeCall?.conversationId
  const msgs = (convId && chatStore.messages[convId]) ? chatStore.messages[convId] : []
  const id = myId.value
  if (!id) return 0
  return msgs.filter((m) => Array.isArray(m.readBy) && !m.readBy.includes(id)).length
})
const newMessagesCountAtOpen = ref(0)
const newMessagesIndexAtOpen = ref(-1)

const newMessagesDividerEl = ref(null)

const messages = computed(() => {
  const convId = chatStore.activeCall?.conversationId
  return (convId && chatStore.messages[convId]) ? chatStore.messages[convId] : []
})

const statusLabel = computed(() => {
  const status = chatStore.activeCall?.status

  if (status === 'ringing') return 'Llamando...'
  if (status === 'connecting') return 'Conectando video...'
  if (status === 'connected') return 'Videollamada en curso'
  if (status === 'ended') return chatStore.callError || 'Videollamada finalizada'
  return 'Preparando videollamada...'
})

function sendSideMessage() {
  if (!sideMessageInput.value.trim()) return

  const conversationId = chatStore.activeCall?.conversationId
  if (!conversationId) {
    sideChatError.value = 'No se encontro la conversacion asociada a la llamada.'
    return
  }

  sideChatError.value = ''
  chatStore.sendMessage({
    conversationId,
    text: sideMessageInput.value,
  })
  sideMessageInput.value = '' // Limpieza del campo
}

function bindVideoStream(videoEl, stream) {
  if (!videoEl) return
  if (videoEl.srcObject === stream) return
  videoEl.srcObject = stream || null
}

function getDividerElement() {
  const el = newMessagesDividerEl.value
  return Array.isArray(el) ? el[0] : el
}

function scrollSideChatToBottom() {
  if (sideMsgEl.value) {
    sideMsgEl.value.scrollTop = sideMsgEl.value.scrollHeight
  }
}

async function acceptCall() {
  await chatStore.acceptIncomingCall()
}

function declineCall() {
  chatStore.declineIncomingCall()
}

watch(() => chatStore.localStream, (stream) => {
  bindVideoStream(localVideoEl.value, stream)
}, { immediate: true })

watch(() => chatStore.remoteStream, (stream) => {
  bindVideoStream(remoteVideoEl.value, stream)
}, { immediate: true })

watch(localVideoEl, (videoEl) => {
  bindVideoStream(videoEl, chatStore.localStream)
})

watch(remoteVideoEl, (videoEl) => {
  bindVideoStream(videoEl, chatStore.remoteStream)
})

/* Notificaciones de mensajes nuevos cuando el chat esté cerrado */
watch(() => chatStore.activeCall, async (newCall) => {
  if (!newCall?.conversationId) {
    sideChatError.value = ''
    sideChatLoading.value = false
    return
  }

  sideChatLoading.value = true
  sideChatError.value = ''

  const response = await chatStore.loadMessages(newCall.conversationId)
  sideChatLoading.value = false

  if (!response.success) {
    sideChatError.value = response.message || 'No se pudo cargar el chat de la llamada.'
  }

  newMessagesCountAtOpen.value = 0
  newMessagesIndexAtOpen.value = -1

  nextTick(() => {
    if (sideMsgEl.value) sideMsgEl.value.scrollTop = sideMsgEl.value.scrollHeight
  })
}, { immediate: true });


watch(
  () => chatStore.messages[chatStore.activeCall?.conversationId]?.length,
  async (newLength, oldLength) => {
    const convId = chatStore.activeCall?.conversationId
    if (showSideChat.value && convId && newLength > oldLength) {
      chatStore.markRead(convId)
    }

    // Lógica de scroll
    await nextTick()
    if (sideMsgEl.value) {
      sideMsgEl.value.scrollTop = sideMsgEl.value.scrollHeight
    }
  }
)

watch(showSideChat, async (isOpen) => {
  try {
    const convId = chatStore.activeCall?.conversationId
    
    if (isOpen && convId) {
      sideChatError.value = ''
      sideChatLoading.value = true

      let msgs = (chatStore.messages[convId] || [])
      if (!msgs.length) {
        const loadResponse = await chatStore.loadMessages(convId)
        if (!loadResponse.success) {
          sideChatError.value = loadResponse.message || 'No se pudieron cargar los mensajes de la llamada.'
        }
        msgs = (chatStore.messages[convId] || [])
      }

      // Calculamos el índice del primer mensaje no leído *antes* de marcar como leído
      const id = myId.value
      let firstUnreadIndex = -1
      if (id && Array.isArray(msgs)) {
        firstUnreadIndex = msgs.findIndex((m) => Array.isArray(m.readBy) ? !m.readBy.includes(id) : true)
      }

      newMessagesIndexAtOpen.value = firstUnreadIndex
      newMessagesCountAtOpen.value = firstUnreadIndex >= 0 ? (msgs.length - firstUnreadIndex) : 0

      // Limpiamos en el store (marcar todo como leído)
      try { chatStore.markRead(convId) } catch (err) { console.warn('markRead failed', err) }

      await nextTick()
      sideChatLoading.value = false

      setTimeout(() => {
        try {
          const dividerEl = getDividerElement()
          if (newMessagesIndexAtOpen.value >= 0 && dividerEl?.scrollIntoView) {
            dividerEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          }
          scrollSideChatToBottom()
        } catch (err) { console.warn('scroll error', err) }
      }, 100)
    } else {
      // Al cerrar, reseteamos la referencia de la línea roja
      newMessagesCountAtOpen.value = 0
      newMessagesIndexAtOpen.value = -1
    }
  } catch (err) {
    console.warn('Error handling showSideChat change:', err)
    // Aseguramos que abrir/cerrar no rompa la UI
    newMessagesCountAtOpen.value = 0
    newMessagesIndexAtOpen.value = -1
  }
})

</script>

<style scoped>
.call-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.68);
  backdrop-filter: blur(10px);
}

.call-backdrop--active {
  padding: 18px;
}

.call-card,
.call-shell {
  width: min(100%, 1080px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    radial-gradient(circle at top left, rgba(201, 169, 98, 0.2), transparent 32%),
    linear-gradient(180deg, rgba(10, 10, 10, 0.98), rgba(4, 4, 4, 0.98));
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
}

.call-card--incoming {
  max-width: 420px;
  padding: 28px;
}

.call-avatar,
.call-stage-avatar {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(201, 169, 98, 0.28);
  background: rgba(201, 169, 98, 0.12);
  color: #c9a962;
  font-family: 'Manrope', sans-serif;
  font-size: 18px;
  font-weight: 700;
}

.call-copy {
  margin-top: 18px;
}

.call-kicker {
  margin: 0 0 6px;
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #8d7d55;
}

.call-name {
  margin: 0;
  font-family: 'Playfair Display', serif;
  font-size: 30px;
  color: #ffffff;
}

.call-sub,
.call-stage-status {
  margin: 8px 0 0;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  color: #9d9689;
}

.call-error {
  margin: 12px 0 0;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  color: #fb7185;
}

.call-actions,
.call-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.call-toolbar-actions {
  justify-content: center;
  
}

.call-actions {
  margin-top: 24px;
}

.call-btn {
  border: none;
  padding: 11px 16px;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: filter 0.15s ease, transform 0.15s ease;
}

.call-btn:hover,
.call-circle-btn:hover {
  filter: brightness(1.07);
  transform: translateY(-1px);
}

.call-btn--ghost {
  background: rgba(255, 255, 255, 0.06);
  color: #d6d0c4;
}

.call-btn--primary {
  background: #c9a962;
  color: #0a0a0a;
}

.call-shell {
  display: flex;
  flex-direction: row;
  height: 85vh;
  max-height: 800px;
  width: min(95vw, 1300px);
  overflow: hidden;
  background: #000;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  position: relative;
}

.call-shell.has-side-chat {
  width: min(100%, 1400px);
}

.call-main-area {
  flex: 1;
  display: flex;
  flex-direction: column; 
  min-width: 0;
  min-height: 0;
  height: 100%;
}

.call-side-chat {
  width: 360px;
  flex-shrink: 0;
  background: rgba(12, 12, 12, 0.9);
  backdrop-filter: blur(20px);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  animation: 100%;
  height: 100%;
  z-index: 250;
}

.side-chat-header {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(201, 169, 98, 0.15);
}

.side-chat-header span {
  font-family: 'Playfair Display', serif;
  color: var(--Primary);
  font-weight: 700;
  font-size: 1.1rem;
}

/* Botón X con estilo */
.close-side-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #888;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.close-side-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.side-chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.side-chat-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  padding: 12px;
  color: #ccc;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  text-align: center;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
}

.side-chat-placeholder--error {
  color: #fb7185;
  border: 1px solid rgba(251, 113, 133, 0.25);
}

.unread-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: #fb7185;
  color: white;
  font-size: 10px;
  min-width: 16px;
  height: 16px;
  padding: 2px 6px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #0a0a0a;
  font-weight: bold;
  z-index: 300;
}

.call-circle-btn.has-unread {
  color: #fb7185;
  box-shadow: 0 0 15px rgba(251, 113, 133, 0.3);
}

/* Scrollbar */
.side-chat-body::-webkit-scrollbar { width: 4px; }
.side-chat-body::-webkit-scrollbar-thumb { background: var(--Primary); border-radius: 4px; }

.mini-msg {
  background: rgba(255, 255, 255, 0.06);
  padding: 10px;
  border-radius: 4px;
  border-left: 2px solid transparent;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mini-msg:hover {
  background: rgba(201, 169, 98, 0.05);
  border-left-color: var(--Primary);
}

.mini-msg-name {
  font-size: 11px;
  font-weight: 700;
  color: var(--Primary);
  letter-spacing: 0.5px;
}

.mini-msg-text {
  font-size: 13px;
  color: #faf8f5;
  background: rgba(255, 255, 255, 0.06);
  padding: 8px 12px;
  border-radius: 4px;
  line-height: 1.5;
}

/* área de input */

.side-chat-input-area {
  flex-shrink: 0;
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(10, 10, 10, 0.7);
}

.side-chat-input-area input {
  width: 100%;
  background: rgba(0,0,0,0.6);
  border: 1px solid #1f1f1f;
  color: #fff;
  padding: 12px 16px;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  outline: none;
  transition: border-color 0.3s;
}

.side-chat-input-area input:focus {
  border-color: var(--Primary);
}

.call-stage {
  position: relative;
  flex: 1;
  background: linear-gradient(180deg, #050505, #0d0d0d);
  min-height: 0;
  overflow: hidden;
}

.call-remote-video,
.call-local-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #050505;
}

.call-remote-video {
  display: block;
  min-height: 62vh;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #050505;
}

.call-local-preview {
  position: absolute;
  right: 20px;
  bottom: 20px;
  width: min(22vw, 220px);
  aspect-ratio: 4 / 3;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #050505;
  overflow: hidden;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
}

.call-local-video.is-hidden {
  opacity: 0;
}

.call-local-off {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  color: #d0c8bb;
  background: rgba(5, 5, 5, 0.9);
}

.call-stage-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  text-align: center;
}

.call-stage-title {
  margin: 0;
  font-family: 'Playfair Display', serif;
  font-size: 34px;
  color: #faf8f5;
}

.call-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 18px 22px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(8, 8, 8, 0.98);
  z-index: 200;
  position: relative;
  /* Keep controls visible when scrolling messages or resizing */
  position: sticky;
  bottom: 0;
}

.call-toolbar-copy {
  min-width: 0;
}

.call-circle-btn {
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  color: #f2ede4;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: filter 0.15s ease, transform 0.15s ease, background 0.15s ease;
}

.call-circle-btn.inactive {
  background: rgba(255, 255, 255, 0.04);
  color: #777;
}

.call-circle-btn--danger {
  background: #e11d48;
  color: #fff6f8;
}

.new-messages-divider {
  display: flex;
  align-items: center;
  text-align: center;
  color: #fb7185; /* Rojo Luxury */
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin: 20px 0;
}

.new-messages-divider span {
  padding: 0 10px;
}

.new-messages-divider::before,
.new-messages-divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid rgba(251, 113, 133, 0.4);
}

.new-messages-divider:not(:empty)::before { margin-right: .5em; }
.new-messages-divider:not(:empty)::after { margin-left: .5em; }

@media (max-width: 900px) {
  .call-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .call-local-preview {
    width: 140px;
    right: 12px;
    bottom: 12px;
  }
}

@media (max-width: 640px) {
  .call-backdrop {
    padding: 12px;
  }

  .call-card--incoming {
    padding: 22px 18px;
  }

  .call-stage {
    min-height: 50vh;
  }

  .call-stage-title {
    font-size: 24px;
  }
}

@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.side-msg-text {
  color: #FAF8F5;
  font-size: 13px;
  line-height: 1.4;
}

/* Ajuste Mobile */
@media (max-width: 900px) {
  .call-shell.has-side-chat {
    flex-direction: column;
  }

  .call-main-area {
    height: 60%;
    flex: none;
  }

  .call-side-chat {
    width: 100%;
    height: 40%;
    border-left: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .call-toolbar {
    padding: 10px;
    /* On small screens, toolbar remains visible */
    position: sticky;
    bottom: 0;
  }
}

@media (max-height: 700px) {
  .call-shell {
    height: 95vh;
  }
  .call-stage-title {
    font-size: 24px;
  }
}
</style>