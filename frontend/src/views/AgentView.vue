<script setup>
import { ref, computed } from 'vue'
import AppNavbar from '../components/AppNavbar.vue'
import { useAuthStore } from '../stores/auth.js'

const authStore = useAuthStore()

const prompt = ref('')
const messages = ref([])
const loading = ref(false)

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

function submit() {
  const text = prompt.value.trim()
  if (!text || loading.value) return
  messages.value.push({ role: 'user', text })
  prompt.value = ''
  loading.value = true
  // AI integration placeholder
  setTimeout(() => {
    messages.value.push({
      role: 'assistant',
      text: 'Función de IA próximamente disponible. Tu consulta fue registrada.',
    })
    loading.value = false
  }, 1200)
}
</script>

<template>
  <div class="agent-page">
    <AppNavbar />

    <main class="agent-main">
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
          :key="i"
          class="msg-row"
          :class="msg.role"
        >
          <div v-if="msg.role === 'assistant'" class="msg-avatar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="msg-bubble">{{ msg.text }}</div>
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
                class="agent-send"
                :class="{ active: prompt.trim() }"
                :disabled="loading"
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
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px 24px 20px;
  background: linear-gradient(to top, #0a0a0a 70%, transparent);
  z-index: 10;
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

.msg-bubble {
  max-width: 72%;
  padding: 10px 14px;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  line-height: 1.55;
  border-radius: 2px;
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

/* ── Responsive ── */
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

  .msg-bubble {
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
