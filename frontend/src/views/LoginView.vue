<template>
  <div class="page">
    <!-- Panel izquierdo: logo -->
    <div class="logo-panel">
      <img src="/logo-k.png" alt="Kontrol" class="logo" />
    </div>

    <!-- Panel derecho: formulario -->
    <div class="form-panel">
      <div class="form-card">
        <h1>Login</h1>

        <!-- Error general del servidor -->
        <div v-if="errorMessage" class="error-banner">
          {{ errorMessage }}
        </div>

        <!-- Campo Email -->
        <div class="field">
          <label for="email">Email</label>
          <div class="input-wrapper">
            <input
              id="email"
              v-model="form.email"
              type="email"
              placeholder="Email"
              @blur="validateEmail"
            />
            <span class="icon">✉</span>
          </div>
          <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
        </div>

        <!-- Campo Password -->
        <div class="field">
          <label for="password">Password</label>
          <div class="input-wrapper">
            <input
              id="password"
              v-model="form.password"
              type="password"
              placeholder="Password"
              @blur="validatePassword"
            />
            <span class="icon">🔒</span>
          </div>
          <span v-if="errors.password" class="field-error">{{ errors.password }}</span>
        </div>

        <!-- Remember me + Forgot password -->
        <div class="row-extras">
          <label class="remember">
            <input type="checkbox" v-model="rememberMe" />
            Remember me
          </label>
          <a href="#" class="forgot">Forgot password?</a>
        </div>

        <!-- Botón principal -->
        <button class="btn-primary" @click="handleLogin" :disabled="isLoading">
          {{ isLoading ? 'Signing in...' : 'Sign In' }}
        </button>

        <!-- Divisor -->
        <div class="divider"><span>or</span></div>

        <!-- OAuth buttons -->
        <div class="oauth-row">
          <button class="btn-oauth">
            <img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" alt="GitHub" />
            Sign up with GitHub
          </button>
          <button class="btn-oauth">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
            Sign up with Google
          </button>
        </div>

        <!-- Link a register -->
        <p class="switch">
          Do you have an account?
          <RouterLink to="/register">Sign up now</RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { loginUser } from '@/services/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({ email: '', password: '' })
const errors = reactive({ email: '', password: '' })
const isLoading = ref(false)
const errorMessage = ref('')
const rememberMe = ref(false)

function validateEmail() {
  if (!form.email) {
    errors.email = 'Email is required'
  } else if (!form.email.includes('@')) {
    errors.email = 'Enter a valid email'
  } else {
    errors.email = ''
  }
}

function validatePassword() {
  if (!form.password) {
    errors.password = 'Password is required'
  } else if (form.password.length < 6) {
    errors.password = 'Minimum 6 characters'
  } else {
    errors.password = ''
  }
}

function formIsValid() {
  validateEmail()
  validatePassword()
  return !errors.email && !errors.password
}

async function handleLogin() {
  errorMessage.value = ''
  if (!formIsValid()) return

  isLoading.value = true
  try {
    const data = await loginUser(form.email, form.password)
    authStore.setToken(data.token)
    router.push({ name: 'dashboard' })
  } catch (error) {
    errorMessage.value = error.message || 'Something went wrong. Try again.'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
* { box-sizing: border-box; margin: 0; padding: 0; }

.page {
  min-height: 100vh;
  display: flex;
  background: #1a1612;
  font-family: 'Inter', sans-serif;
}

/* Panel izquierdo (logo) */
.logo-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at center, #2a1f0e 0%, #1a1612 70%);
}

.logo {
  width: 260px;
  opacity: 0.95;
}

/* Panel derecho (formulario) */
.form-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.form-card {
  width: 100%;
  max-width: 380px;
}

h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #f5f0e8;
  margin-bottom: 1.5rem;
}

/* Campos */
.field {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

label {
  font-size: 0.8rem;
  color: #8a8070;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.input-wrapper {
  position: relative;
}

input[type="email"],
input[type="password"],
input[type="text"] {
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 0.9rem;
  background: transparent;
  border: 1px solid #3a3020;
  border-radius: 6px;
  color: #f5f0e8;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s;
}

input::placeholder { color: #5a5040; }

input:focus { border-color: #c9a84c; }

.icon {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #5a5040;
  font-size: 0.9rem;
  pointer-events: none;
}

.field-error {
  color: #e05252;
  font-size: 0.78rem;
}

/* Fila remember + forgot */
.row-extras {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.2rem;
}

.remember {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: #8a8070;
  font-size: 0.85rem;
  text-transform: none;
  letter-spacing: 0;
}

.forgot {
  color: #c9a84c;
  font-size: 0.85rem;
  text-decoration: none;
}

.forgot:hover { text-decoration: underline; }

/* Botón principal */
.btn-primary {
  width: 100%;
  padding: 0.85rem;
  background: linear-gradient(135deg, #c9a84c, #a07830);
  color: #1a1612;
  font-weight: 700;
  font-size: 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: opacity 0.2s;
  letter-spacing: 0.03em;
}

.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* Divisor */
.divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1.2rem 0;
  color: #3a3020;
  font-size: 0.8rem;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #3a3020;
}

.divider span { color: #5a5040; }

/* OAuth */
.oauth-row {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.2rem;
}

.btn-oauth {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.65rem 0.5rem;
  background: transparent;
  border: 1px solid #3a3020;
  border-radius: 6px;
  color: #8a8070;
  font-size: 0.8rem;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}

.btn-oauth:hover { border-color: #c9a84c; color: #f5f0e8; }

.btn-oauth img {
  width: 16px;
  height: 16px;
  object-fit: contain;
  filter: grayscale(0.5);
}

/* Link switch */
.switch {
  text-align: center;
  color: #5a5040;
  font-size: 0.85rem;
}

.switch a {
  color: #c9a84c;
  text-decoration: none;
  margin-left: 0.25rem;
}

.switch a:hover { text-decoration: underline; }

/* Error banner */
.error-banner {
  background: rgba(224, 82, 82, 0.1);
  border: 1px solid #e05252;
  color: #e05252;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

/* Responsive: en móvil stack vertical */
@media (max-width: 700px) {
  .page { flex-direction: column; }
  .logo-panel { padding: 2rem; min-height: 200px; }
  .logo { width: 140px; }
}
</style>