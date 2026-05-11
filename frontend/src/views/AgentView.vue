<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import AppNavbar from '../components/AppNavbar.vue'
import { useAuthStore } from '../stores/auth.js'
import {
  sendAgentMessage,
  fetchAgentStatus,
  listConversations,
  loadConversation,
  deleteConversation as deleteConversationApi,
  editAgentMessage,
  deleteAgentMessage,
} from '../services/agent.js'

const authStore = useAuthStore()

const prompt = ref('')
// Each message: { _id?, role, text, queries?, edited?, isLocal? }
const messages = ref([])
const loading = ref(false)
const errorBanner = ref('')
const agentConfigured = ref(true)
const persistenceAvailable = ref(false)

// Sidebar state
const conversations = ref([])
const conversationId = ref(null)
const sidebarOpen = ref(true)

// Inline edit state
const editingId = ref(null)
const editingDraft = ref('')

// Active fetch controller, used by the Stop button
let activeController = null

onMounted(async () => {
  const status = await fetchAgentStatus()
  agentConfigured.value = status.configured !== false
  persistenceAvailable.value = status.persistence === true

  if (persistenceAvailable.value) {
    await refreshConversations()
    if (conversations.value.length > 0) {
      await openConversation(conversations.value[0]._id)
    }
  }
})

async function refreshConversations() {
  try {
    const list = await listConversations()
    conversations.value = Array.isArray(list) ? list : []
  } catch {
    conversations.value = []
  }
}

async function openConversation(id) {
  if (loading.value) return
  try {
    const { conversation, messages: msgs } = await loadConversation(id)
    conversationId.value = conversation._id
    messages.value = msgs.map((m) => ({
      _id: m._id,
      role: m.role,
      text: m.content,
      queries: m.queries,
      edited: m.edited,
    }))
    errorBanner.value = ''
  } catch (err) {
    errorBanner.value = err.message || 'No se pudo cargar la conversación.'
    conversationId.value = null
    messages.value = []
  }
}

function newConversation() {
  if (loading.value) return
  conversationId.value = null
  messages.value = []
  prompt.value = ''
  errorBanner.value = ''
  cancelEdit()
}

async function removeConversation(conv, event) {
  if (event) event.stopPropagation()
  if (loading.value) return
  if (!window.confirm(`¿Eliminar "${conv.title}"? Esta acción no se puede deshacer.`)) return

  try {
    await deleteConversationApi(conv._id)
    conversations.value = conversations.value.filter((c) => c._id !== conv._id)
    if (conversationId.value === conv._id) {
      newConversation()
    }
  } catch (err) {
    errorBanner.value = err.message || 'No se pudo eliminar la conversación.'
  }
}

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

const firstName = computed(() => {
  const name = authStore.user?.nombre || authStore.user?.email || 'usuario'
  return name.split(' ')[0]
})

const quickActions = [
  {
    label: 'Analizar presupuesto',
    desc: 'Revisa gastos y proyecciones financieras',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    suggestion: 'Analiza el estado actual del presupuesto de mi empresa y dame recomendaciones',
  },
  {
    label: 'Resumen de proyectos',
    desc: 'Estado y avance de tus proyectos activos',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.7"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.7"/><rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.7"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.7"/></svg>`,
    suggestion: 'Dame un resumen del estado de mis proyectos activos y sus avances',
  },
  {
    label: 'Generar reporte',
    desc: 'Crea informes de inventario y actividad',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><polyline points="10 9 9 9 8 9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
    suggestion: 'Genera un reporte ejecutivo de las actividades recientes de mi empresa',
  },
]

function setPrompt(text) {
  prompt.value = text
}

function autoResize(e) {
  e.target.style.height = 'auto'
  e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
}

async function submit() {
  const text = prompt.value.trim()
  if (!text || loading.value) return

  errorBanner.value = ''
  // Track this user message locally — we'll replace it with the server copy
  // (which has an _id) once the response comes back.
  const localUser = { role: 'user', text, isLocal: true }
  messages.value.push(localUser)
  prompt.value = ''
  loading.value = true

  const history = messages.value
    .filter((m) => m.text)
    .map((m) => ({ role: m.role, content: m.text }))

  activeController = new AbortController()
  const wasNewConversation = !conversationId.value

  try {
    const result = await sendAgentMessage(history, {
      conversationId: conversationId.value,
      signal: activeController.signal,
    })

    if (result.conversationId) conversationId.value = result.conversationId

    // Refresh sidebar so the new conversation (or updated lastMessageAt)
    // appears in the right position.
    if (persistenceAvailable.value && (wasNewConversation || result.conversationId)) {
      refreshConversations()
    }

    // Replace the local user echo with the persisted version (so it has _id).
    if (result.userMessage) {
      const idx = messages.value.indexOf(localUser)
      if (idx !== -1) {
        messages.value[idx] = {
          _id: result.userMessage._id,
          role: 'user',
          text: result.userMessage.content,
          edited: result.userMessage.edited,
        }
      }
    }

    messages.value.push({
      _id: result.assistantMessage?._id ?? null,
      role: 'assistant',
      text: result.answer,
      queries: Array.isArray(result.queries) ? result.queries : [],
    })
  } catch (err) {
    if (err.name === 'AbortError') {
      // User clicked Stop. Leave the user message intact, show a placeholder.
      messages.value.push({
        role: 'assistant',
        text: '_Generación detenida._',
        isLocal: true,
      })
    } else {
      errorBanner.value = err.message || 'Error al contactar al agente.'
      messages.value.push({
        role: 'assistant',
        text: 'Lo siento, no pude procesar tu solicitud en este momento.',
        isLocal: true,
      })
    }
  } finally {
    loading.value = false
    activeController = null
  }
}

function stopGeneration() {
  if (activeController) {
    activeController.abort()
  }
}

/* ── Edit (user messages only) ──────────────────────────────────────────── */

function startEdit(msg) {
  if (msg.role !== 'user' || !msg._id) return
  editingId.value = msg._id
  editingDraft.value = msg.text
  nextTick(() => {
    const el = document.querySelector('.msg-edit-textarea')
    if (el) {
      el.focus()
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }
  })
}

function cancelEdit() {
  editingId.value = null
  editingDraft.value = ''
}

async function saveEdit(msg) {
  const newContent = editingDraft.value.trim()
  if (!newContent || newContent === msg.text) {
    cancelEdit()
    return
  }
  try {
    const updated = await editAgentMessage(msg._id, newContent)
    const idx = messages.value.findIndex((m) => m._id === msg._id)
    if (idx !== -1) {
      messages.value[idx] = {
        ...messages.value[idx],
        text: updated.content,
        edited: updated.edited,
      }
    }
    cancelEdit()
  } catch (err) {
    errorBanner.value = err.message || 'No se pudo actualizar el mensaje.'
  }
}

/* ── Remove ─────────────────────────────────────────────────────────────── */

async function removeMessage(msg) {
  // Local-only messages (placeholders, errors) are removed from state only.
  if (!msg._id) {
    const idx = messages.value.indexOf(msg)
    if (idx !== -1) messages.value.splice(idx, 1)
    return
  }
  try {
    await deleteAgentMessage(msg._id)
    messages.value = messages.value.filter((m) => m !== msg)
  } catch (err) {
    errorBanner.value = err.message || 'No se pudo eliminar el mensaje.'
  }
}

function autoResizeEdit(e) {
  e.target.style.height = 'auto'
  e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
}
</script>

<template>
  <div class="agent-page">
    <AppNavbar />

    <div class="agent-shell" :class="{ 'sidebar-collapsed': !sidebarOpen }">
      <!-- Sidebar with conversation list -->
      <aside class="agent-sidebar" v-if="sidebarOpen">
        <div class="sidebar-header">
          <span class="sidebar-title">Conversaciones</span>
          <button
            class="sidebar-icon-btn"
            title="Ocultar"
            @click="toggleSidebar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>

        <button
          class="new-conv-btn"
          :disabled="loading"
          @click="newConversation"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Nueva conversación
        </button>

        <div class="conv-list">
          <p v-if="!conversations.length && persistenceAvailable" class="conv-empty">
            Aún no tienes conversaciones.
          </p>
          <p v-else-if="!persistenceAvailable" class="conv-empty">
            Historial no disponible: MongoDB desconectado.
          </p>
          <button
            v-for="conv in conversations"
            :key="conv._id"
            class="conv-item"
            :class="{ active: conv._id === conversationId }"
            :disabled="loading"
            @click="openConversation(conv._id)"
          >
            <span class="conv-title">{{ conv.title }}</span>
            <span
              class="conv-delete"
              title="Eliminar conversación"
              @click="removeConversation(conv, $event)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
                      stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
          </button>
        </div>
      </aside>

      <!-- Floating toggle when the sidebar is hidden -->
      <button
        v-if="!sidebarOpen"
        class="sidebar-reopen"
        title="Mostrar conversaciones"
        @click="toggleSidebar"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <main class="agent-main">
      <div v-if="!agentConfigured" class="agent-banner warn">
        El agente aún no está configurado. Define <code>AGENT_API_URL</code> en el backend.
      </div>
      <div v-else-if="errorBanner" class="agent-banner error">
        {{ errorBanner }}
      </div>

      <!-- Landing state (no messages) -->
      <template v-if="!messages.length">
        <div class="agent-hero">
          <p class="agent-greeting">Hola, {{ firstName }}</p>
          <h1 class="agent-title">¿En qué puedo<br><span class="title-accent">ayudarte?</span></h1>
        </div>

        <div class="agent-cards">
          <button
            v-for="action in quickActions"
            :key="action.label"
            class="agent-card"
            @click="setPrompt(action.suggestion)"
          >
            <div class="card-icon" v-html="action.icon" />
            <div class="card-body">
              <span class="card-label">{{ action.label }}</span>
              <span class="card-desc">{{ action.desc }}</span>
            </div>
          </button>
        </div>
      </template>

      <!-- Conversation state -->
      <div v-else class="agent-thread">
        <div
          v-for="(msg, i) in messages"
          :key="msg._id || `local-${i}`"
          class="msg-row"
          :class="msg.role"
        >
          <div v-if="msg.role === 'assistant'" class="msg-avatar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
            </svg>
          </div>

          <div class="msg-block">
            <!-- Inline edit mode (user messages) -->
            <div v-if="editingId === msg._id" class="msg-edit">
              <textarea
                class="msg-edit-textarea"
                v-model="editingDraft"
                @input="autoResizeEdit"
                @keydown.enter.exact.prevent="saveEdit(msg)"
                @keydown.escape="cancelEdit"
              />
              <div class="msg-edit-actions">
                <button class="msg-action-btn" @click="cancelEdit">Cancelar</button>
                <button class="msg-action-btn primary" @click="saveEdit(msg)">Guardar</button>
              </div>
            </div>

            <!-- Normal view -->
            <template v-else>
              <div class="msg-bubble">
                {{ msg.text }}
                <span v-if="msg.edited" class="msg-edited-tag">editado</span>
              </div>

              <div class="msg-actions">
                <button
                  v-if="msg.role === 'user' && msg._id"
                  class="msg-action-icon"
                  title="Editar"
                  @click="startEdit(msg)"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M12 20h9M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"
                          stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
                <button
                  class="msg-action-icon"
                  title="Eliminar"
                  @click="removeMessage(msg)"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
                          stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
            </template>
          </div>
        </div>

        <div v-if="loading" class="msg-row assistant">
          <div class="msg-avatar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="msg-bubble thinking">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>

      <!-- Input with animated golden beam border -->
      <div class="input-section">
        <div class="beam-wrap">
          <div class="beam-inner">
            <div class="input-row">
              <div class="sparkle-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" fill="currentColor"/>
                </svg>
              </div>
              <textarea
                v-model="prompt"
                class="agent-textarea"
                placeholder="Pregúntame cualquier cosa..."
                rows="1"
                @keydown.enter.exact.prevent="submit"
                @input="autoResize"
              />
              <button
                v-if="loading"
                class="agent-send stop"
                title="Detener generación"
                @click="stopGeneration"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="1.5"/>
                </svg>
              </button>
              <button
                v-else
                class="agent-send"
                :class="{ active: prompt.trim() }"
                @click="submit"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
        <p class="input-hint">Presiona Enter para enviar · Shift+Enter para nueva línea</p>
      </div>
    </main>
    </div>
  </div>
</template>

<style scoped>
/* ── CSS Houdini property for smooth beam rotation ── */
@property --beam-angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}

@keyframes beam-spin {
  to { --beam-angle: 360deg; }
}

@keyframes thinking-blink {
  0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
}

/* ── Page layout ── */
.agent-page {
  min-height: 100vh;
  background: var(--Background, #0a0a0a);
  display: flex;
  flex-direction: column;
}

.agent-shell {
  display: flex;
  flex: 1;
  min-height: 0;
  --sidebar-width: 260px;
}

.agent-shell.sidebar-collapsed {
  --sidebar-width: 0px;
}

/* ── Sidebar ── */
.agent-sidebar {
  width: var(--sidebar-width);
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.015);
  border-right: 1px solid rgba(202, 168, 96, 0.1);
  display: flex;
  flex-direction: column;
  padding: 16px 12px;
  gap: 12px;
  height: calc(100vh - 56px);
  position: sticky;
  top: 56px;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}

.sidebar-title {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--TextMuted, #8a8070);
}

.sidebar-icon-btn {
  width: 24px;
  height: 24px;
  border-radius: 2px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--TextMuted, #8a8070);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.sidebar-icon-btn:hover {
  background: rgba(202, 168, 96, 0.08);
  color: var(--Primary, #caa860);
  border-color: rgba(202, 168, 96, 0.25);
}

.new-conv-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 9px 12px;
  background: rgba(202, 168, 96, 0.08);
  border: 1px solid rgba(202, 168, 96, 0.28);
  border-radius: 2px;
  color: var(--Primary, #caa860);
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.new-conv-btn:hover:not(:disabled) {
  background: rgba(202, 168, 96, 0.16);
  border-color: rgba(202, 168, 96, 0.5);
}
.new-conv-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.conv-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #252525 transparent;
  padding-right: 2px;
}
.conv-list::-webkit-scrollbar { width: 4px; }
.conv-list::-webkit-scrollbar-thumb { background: #252525; }

.conv-empty {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  color: var(--TextDim, #5a5040);
  padding: 8px 4px;
  margin: 0;
  line-height: 1.5;
}

.conv-item {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px 10px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 2px;
  color: var(--Text, #faf8f5);
  text-align: left;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.conv-item:hover:not(:disabled) {
  background: rgba(202, 168, 96, 0.06);
}
.conv-item.active {
  background: rgba(202, 168, 96, 0.12);
  border-color: rgba(202, 168, 96, 0.3);
}
.conv-item:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.conv-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conv-delete {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--TextMuted, #8a8070);
  border-radius: 2px;
  opacity: 0;
  transition: opacity 0.15s, color 0.15s, background 0.15s;
}
.conv-item:hover .conv-delete,
.conv-item.active .conv-delete {
  opacity: 1;
}
.conv-delete:hover {
  background: rgba(220, 80, 80, 0.18);
  color: #e88080;
}

.sidebar-reopen {
  position: fixed;
  top: 72px;
  left: 12px;
  width: 28px;
  height: 28px;
  border-radius: 2px;
  background: rgba(202, 168, 96, 0.1);
  border: 1px solid rgba(202, 168, 96, 0.3);
  color: var(--Primary, #caa860);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 11;
  transition: background 0.15s;
}
.sidebar-reopen:hover {
  background: rgba(202, 168, 96, 0.2);
}

.agent-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px 120px;
  gap: 40px;
  max-width: 760px;
  margin: 0 auto;
  width: 100%;
}

/* ── Hero ── */
.agent-hero {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.agent-greeting {
  font-family: 'Manrope', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: var(--Primary, #caa860);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin: 0;
}

.agent-title {
  font-family: 'Playfair Display', 'Alfa Slab One', serif;
  font-size: clamp(2rem, 5vw, 3.2rem);
  color: var(--Text, #faf8f5);
  margin: 0;
  line-height: 1.15;
  font-weight: 700;
}

.title-accent {
  color: var(--Primary, #caa860);
}

/* ── Quick action cards ── */
.agent-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  width: 100%;
}

.agent-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: rgba(202, 168, 96, 0.05);
  border: 1px solid rgba(202, 168, 96, 0.14);
  box-shadow: inset 0 1px 0 rgba(202, 168, 96, 0.06);
  padding: 16px;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s, border-color 0.2s, transform 0.15s, box-shadow 0.2s;
  border-radius: 2px;
}

.agent-card:hover {
  background: rgba(202, 168, 96, 0.1);
  border-color: rgba(202, 168, 96, 0.28);
  box-shadow: inset 0 1px 0 rgba(202, 168, 96, 0.1), 0 2px 12px rgba(202, 168, 96, 0.06);
  transform: translateY(-1px);
}

.card-icon {
  color: var(--Primary, #caa860);
  flex-shrink: 0;
  margin-top: 2px;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-label {
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--Text, #faf8f5);
  letter-spacing: 0.02em;
}

.card-desc {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  color: var(--TextMuted, #8a8070);
  line-height: 1.4;
}

/* ── Input section (fixed bottom) ── */
.input-section {
  position: fixed;
  bottom: 0;
  left: var(--sidebar-width, 0px);
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px 24px 20px;
  background: linear-gradient(to top, #0a0a0a 70%, transparent);
  z-index: 10;
  transition: left 0.2s;
}

.input-section .beam-wrap {
  max-width: 760px;
}

/* Golden beam border wrapper */
.beam-wrap {
  width: 100%;
  border-radius: 14px;
  padding: 1.5px;
  background: conic-gradient(
    from var(--beam-angle),
    #1a1409 0%,
    #1a1409 32%,
    #2a1a00 38%,
    #886911 44%,
    #b27f2a 47%,
    #caa860 49.5%,
    #f5e090 50%,
    #caa860 50.5%,
    #b27f2a 53%,
    #886911 57%,
    #2a1a00 62%,
    #1a1409 68%,
    #1a1409 100%
  );
  animation: beam-spin 4s linear infinite;
  transition: filter 0.3s;
}

.beam-wrap:focus-within {
  filter: brightness(1.2);
  animation-duration: 2.5s;
}

.beam-inner {
  background: #111009;
  border-radius: 12.5px;
  padding: 4px 6px;
}

.input-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 10px 14px;
}

.sparkle-icon {
  color: var(--Primary, #caa860);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding-bottom: 2px;
}

.agent-textarea {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--Text, #faf8f5);
  font-family: 'Manrope', sans-serif;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  min-height: 24px;
  max-height: 160px;
  overflow-y: auto;
  scrollbar-width: none;
}

.agent-textarea::-webkit-scrollbar { display: none; }

.agent-textarea::placeholder {
  color: var(--TextPlaceholder, #4a4030);
}

.agent-send {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: #555;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}

.agent-send.active {
  background: var(--Primary, #caa860);
  border-color: var(--Primary, #caa860);
  color: #0a0a0a;
}

.agent-send.stop {
  background: rgba(220, 80, 80, 0.16);
  border-color: rgba(220, 80, 80, 0.5);
  color: #e88080;
}
.agent-send.stop:hover {
  background: rgba(220, 80, 80, 0.26);
  color: #ffb0b0;
}

.agent-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-hint {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  color: var(--TextDim, #5a5040);
  margin: 0;
  letter-spacing: 0.02em;
}

/* ── Conversation thread ── */
.agent-thread {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 45vh;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #252525 transparent;
  padding: 4px 0;
}

.agent-thread::-webkit-scrollbar { width: 4px; }
.agent-thread::-webkit-scrollbar-thumb { background: #252525; }

.msg-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.msg-row.user {
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 28px;
  height: 28px;
  background: rgba(202, 168, 96, 0.1);
  border: 1px solid rgba(202, 168, 96, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--Primary, #caa860);
  flex-shrink: 0;
}

.msg-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 72%;
}

.msg-row.user .msg-block {
  align-items: flex-end;
}

.msg-bubble {
  padding: 10px 14px;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  line-height: 1.55;
  border-radius: 2px;
  white-space: pre-wrap;
  word-break: break-word;
}

.msg-edited-tag {
  display: inline-block;
  margin-left: 6px;
  font-size: 10px;
  font-style: italic;
  color: var(--TextDim, #5a5040);
  vertical-align: middle;
}

/* Hover-revealed per-message actions */
.msg-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.msg-row:hover .msg-actions {
  opacity: 1;
}

.msg-action-icon {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  color: var(--TextMuted, #8a8070);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.msg-action-icon:hover {
  background: rgba(202, 168, 96, 0.1);
  border-color: rgba(202, 168, 96, 0.3);
  color: var(--Primary, #caa860);
}

/* Inline edit */
.msg-edit {
  width: 100%;
  background: rgba(202, 168, 96, 0.06);
  border: 1px solid rgba(202, 168, 96, 0.25);
  border-radius: 2px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.msg-edit-textarea {
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  color: var(--Text, #faf8f5);
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  line-height: 1.55;
  min-height: 24px;
  max-height: 200px;
  overflow-y: auto;
}

.msg-edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.msg-action-btn {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  padding: 4px 10px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--TextMuted, #8a8070);
  border-radius: 2px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.msg-action-btn:hover {
  border-color: rgba(202, 168, 96, 0.4);
  color: var(--Text, #faf8f5);
}

.msg-action-btn.primary {
  background: var(--Primary, #caa860);
  border-color: var(--Primary, #caa860);
  color: #0a0a0a;
}

.msg-action-btn.primary:hover {
  filter: brightness(1.1);
}

.msg-row.user .msg-bubble {
  background: rgba(202, 168, 96, 0.1);
  border: 1px solid rgba(202, 168, 96, 0.15);
  color: var(--Text, #faf8f5);
}

.msg-row.assistant .msg-bubble {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: var(--Text, #faf8f5);
}

.msg-bubble.thinking {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 14px;
}

.msg-bubble.thinking span {
  width: 6px;
  height: 6px;
  background: var(--Primary, #caa860);
  border-radius: 50%;
  animation: thinking-blink 1.2s infinite;
  opacity: 0.3;
}

.msg-bubble.thinking span:nth-child(2) { animation-delay: 0.2s; }
.msg-bubble.thinking span:nth-child(3) { animation-delay: 0.4s; }

/* ── Banners ── */
.agent-banner {
  width: 100%;
  padding: 10px 14px;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  border-radius: 2px;
  border: 1px solid;
}
.agent-banner.warn {
  background: rgba(202, 168, 96, 0.08);
  border-color: rgba(202, 168, 96, 0.32);
  color: #caa860;
}
.agent-banner.error {
  background: rgba(220, 80, 80, 0.08);
  border-color: rgba(220, 80, 80, 0.32);
  color: #e88080;
}
.agent-banner code {
  background: rgba(0, 0, 0, 0.4);
  padding: 1px 6px;
  border-radius: 2px;
  font-size: 11px;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .agent-shell {
    --sidebar-width: 0px;
  }
  .agent-sidebar {
    position: fixed;
    top: 56px;
    left: 0;
    width: 240px;
    z-index: 20;
    box-shadow: 6px 0 24px rgba(0, 0, 0, 0.5);
  }
  .input-section {
    left: 0;
  }
}

@media (max-width: 640px) {
  .agent-main {
    padding: 80px 16px 24px;
    gap: 28px;
  }

  .agent-cards {
    grid-template-columns: 1fr;
  }

  .agent-title {
    font-size: clamp(1.6rem, 7vw, 2.4rem);
  }

  .msg-block {
    max-width: 88%;
  }
}

@media (min-width: 641px) and (max-width: 900px) {
  .agent-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .agent-title {
    font-size: clamp(1.8rem, 4vw, 2.8rem);
  }
}
</style>
