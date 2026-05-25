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
                :class="{ active: showSideChat }" 
                title="Alternar chat" 
                @click="showSideChat = !showSideChat">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="1.8" />
                </svg>                
              </button>
            </div>
          </div>
        </div>
        
        <aside v-if="showSideChat" class="call-side-chat">
          <div class="side-chat-header">
            <span>Chat de la reunión</span>
            <button @click="showSideChat = false" class="close-side-btn">×</button>
          </div>
          <div class="side-chat-body">
            <p class="muted">El chat completo está disponible en este panel lateral.</p>
          </div>
        </aside>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useChatStore } from '../../stores/chat.js'

const chatStore = useChatStore()
const localVideoEl = ref(null)
const remoteVideoEl = ref(null)

const showIncomingPrompt = computed(() => Boolean(chatStore.incomingCall) && !chatStore.activeCall)
const hasRemoteVideo = computed(() => chatStore.activeCall?.status === 'connected')
const incomingPeerName = computed(() => chatStore.incomingCall?.peerName || 'Usuario')
const incomingPeerAvatar = computed(() => chatStore.incomingCall?.peerAvatar || '??')
const activePeerName = computed(() => chatStore.activeCall?.peerName || 'Usuario')
const activePeerAvatar = computed(() => chatStore.activeCall?.peerAvatar || '??')

const showSideChat = ref(false) // Estado local para mostrar el chat durante la llamada

const statusLabel = computed(() => {
  const status = chatStore.activeCall?.status

  if (status === 'ringing') return 'Llamando...'
  if (status === 'connecting') return 'Conectando video...'
  if (status === 'connected') return 'Videollamada en curso'
  if (status === 'ended') return chatStore.callError || 'Videollamada finalizada'
  return 'Preparando videollamada...'
})

function bindVideoStream(videoEl, stream) {
  if (!videoEl) return
  if (videoEl.srcObject === stream) return
  videoEl.srcObject = stream || null
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
  background: rgba(0, 0, 0, 0.58);
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
  color: #faf8f5;
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
  overflow: hidden;
  display: flex;
  transition: all 0.3s ease;
}

.call-shell.has-side-chat {
  width: min(100%, 1400px);
}

.call-main-area {
  flex: 1;
  display: flex;
  flex-direction: column; 
}

.call-side-chat {
  width: 350px;
  background: #0a0a0a;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  animation: slideIn 0.3s ease-out;
}

.call-stage {
  position: relative;
  min-height: 62vh;
  background: linear-gradient(180deg, #050505, #0d0d0d);
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
}

.call-local-preview {
  position: absolute;
  right: 20px;
  bottom: 20px;
  width: min(26vw, 240px);
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
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(8, 8, 8, 0.94);
  z-index: 100;
}

.call-toolbar-copy {
  min-width: 0;
}

.call-circle-btn {
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
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

@media (max-width: 900px) {
  .call-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .call-toolbar-actions {
    justify-content: center;
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
    min-height: 56vh;
  }

  .call-stage-title {
    font-size: 28px;
  }
}

@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.side-chat-header {
  padding: 16px;
  font-family: 'Playfair Display', serif;
  border-bottom: 1px solid #1a1a1a;
  color: #c9a962;
}

/* Ajuste Mobile */
@media (max-width: 900px) {
  .call-shell.has-side-chat {
    flex-direction: column;
  }
  .call-side-chat {
    width: 100%;
    height: 300px;
  }
}
</style>