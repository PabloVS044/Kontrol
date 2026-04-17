<template>
  <div class="onboarding-root">
    <div class="onboarding-layout">

      <!-- Left: branding / explanation -->
      <div class="onboarding-left">
        <img src="@/assets/img/kontrol.png" alt="Kontrol" class="ob-logo" />
        <h1 class="ob-headline">Welcome to<br />Kontrol</h1>
        <p class="ob-tagline">
          To get started, create your workspace — a company that holds your
          projects, inventory, and team members.
        </p>
        <ul class="ob-features">
          <li>
            <span class="ob-dot"></span>
            Manage projects and budgets across your organization
          </li>
          <li>
            <span class="ob-dot"></span>
            Invite team members and assign roles
          </li>
          <li>
            <span class="ob-dot"></span>
            Track inventory, suppliers and expenses in one place
          </li>
        </ul>
      </div>

      <!-- Right: create empresa form -->
      <div class="onboarding-right">
        <div class="ob-card">
          <h2 class="ob-card-title">Create your workspace</h2>
          <p class="ob-card-sub">This will be your company on Kontrol.</p>

          <form class="ob-form" @submit.prevent="submit">

            <div class="ob-field">
              <label>Company name <span class="req">*</span></label>
              <input
                v-model="form.nombre"
                type="text"
                placeholder="e.g. Acme Corp"
                required
                :disabled="loading"
              />
            </div>

            <div class="ob-field">
              <label>Industry</label>
              <input
                v-model="form.industria"
                type="text"
                placeholder="e.g. Construction, Retail, Tech…"
                :disabled="loading"
              />
            </div>

            <div class="ob-row">
              <div class="ob-field">
                <label>Phone</label>
                <input
                  v-model="form.telefono"
                  type="tel"
                  placeholder="+1 555 000 0000"
                  :disabled="loading"
                />
              </div>
              <div class="ob-field">
                <label>Address</label>
                <input
                  v-model="form.direccion"
                  type="text"
                  placeholder="City, Country"
                  :disabled="loading"
                />
              </div>
            </div>

            <p v-if="error" class="ob-error">{{ error }}</p>

            <button class="ob-submit" type="submit" :disabled="loading">
              <span v-if="loading" class="ob-spinner" />
              {{ loading ? 'Creating…' : 'Create workspace' }}
            </button>

          </form>

          <p class="ob-footer-note">
            Already part of a team? Ask your administrator to invite you — your
            account is ready.
          </p>
        </div>

        <button class="ob-logout" @click="logout">Sign out</button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router    = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const error   = ref(null)

const form = reactive({
  nombre:   '',
  industria: '',
  telefono:  '',
  direccion: '',
})

async function submit() {
  error.value   = null
  loading.value = true

  try {
    const res = await fetch('/api/empresas', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify({
        nombre:    form.nombre.trim(),
        industria: form.industria.trim() || undefined,
        telefono:  form.telefono.trim()  || undefined,
        direccion: form.direccion.trim() || undefined,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      error.value = data.message || `Error ${res.status}`
      return
    }

    // Reload empresas — the new one will be auto-selected
    await authStore.loadEmpresas()
    router.push({ name: 'dashboard' })
  } catch {
    error.value = 'Network error, try again.'
  } finally {
    loading.value = false
  }
}

function logout() {
  authStore.logout()
  router.push({ name: 'login' })
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Manrope:wght@400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.onboarding-root {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Manrope', sans-serif;
  color: #faf8f5;
  padding: 40px 24px;
}

.onboarding-layout {
  display: flex;
  gap: 80px;
  max-width: 1000px;
  width: 100%;
  align-items: center;
}

/* ── Left ── */
.onboarding-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.ob-logo {
  width: 40px;
  height: 40px;
}

.ob-headline {
  font-family: 'Playfair Display', serif;
  font-size: 52px;
  font-weight: 400;
  line-height: 1.1;
  color: #faf8f5;
}

.ob-tagline {
  font-size: 14px;
  color: #888;
  line-height: 1.7;
  max-width: 380px;
}

.ob-features {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ob-features li {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: #666;
}

.ob-dot {
  width: 6px;
  height: 6px;
  background: #c9a962;
  flex-shrink: 0;
}

/* ── Right ── */
.onboarding-right {
  flex: none;
  width: 420px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ob-card {
  background: rgba(15,15,15,0.9);
  border: 1px solid #1f1f1f;
  padding: 36px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.ob-card-title {
  font-family: 'Playfair Display', serif;
  font-size: 24px;
  font-weight: 400;
  color: #faf8f5;
}

.ob-card-sub {
  font-size: 13px;
  color: #666;
  margin-top: -12px;
}

.ob-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ob-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ob-field label {
  font-size: 11px;
  color: #888;
  letter-spacing: 0.05em;
}

.ob-field input {
  background: #0a0a0a;
  border: 1px solid #1f1f1f;
  color: #faf8f5;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  padding: 10px 12px;
  outline: none;
  transition: border-color 0.15s;
}

.ob-field input:focus {
  border-color: #c9a962;
}

.ob-field input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ob-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.req { color: #c9a962; }

.ob-error {
  font-size: 12px;
  color: #fb7185;
}

.ob-submit {
  background: #c9a962;
  border: none;
  color: #0a0a0a;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 600;
  padding: 12px 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 0.2s;
}

.ob-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ob-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(10,10,10,0.3);
  border-top-color: #0a0a0a;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.ob-footer-note {
  font-size: 11px;
  color: #444;
  line-height: 1.6;
  padding-top: 8px;
  border-top: 1px solid #1a1a1a;
}

.ob-logout {
  background: none;
  border: none;
  color: #444;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  cursor: pointer;
  text-align: center;
  padding: 4px;
  transition: color 0.15s;
}

.ob-logout:hover {
  color: #888;
}

/* ── Responsive ── */
@media (max-width: 820px) {
  .onboarding-layout {
    flex-direction: column;
    gap: 40px;
  }
  .onboarding-right {
    width: 100%;
  }
  .ob-headline {
    font-size: 40px;
  }
}

@media (max-width: 480px) {
  .ob-card { padding: 24px; }
  .ob-row  { grid-template-columns: 1fr; }
}
</style>
