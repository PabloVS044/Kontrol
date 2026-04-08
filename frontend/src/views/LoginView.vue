<template>
  <div class="login-page">

    <SoftParticle />

    <div class="login-layout">

      <!-- Panel izquierdo: Logo -->
      <div class="login-logo-panel">
        <img src="@/assets/img/kontrol.png" alt="Kontrol" class="login-logo-img" />
      </div>

      <!-- Panel derecho: Formulario -->
      <div class="login-form-panel">
        <div class="login-card">
          <h2 class="login-title">Login</h2>

          <!-- Error del servidor -->
          <div v-if="errorMessage" class="login-banner login-banner--error">
            {{ errorMessage }}
          </div>

          <!-- Email -->
          <div class="login-field">
            <label class="login-field-label">Email</label>
            <div class="login-input-wrap">
              <input
                v-model="form.email"
                type="email"
                placeholder="Email"
                class="login-input"
                :class="{ 'login-input--error': errors.email }"
                @blur="validateEmail"
              />
              <MailIcon class="login-input-icon" :size="15" />
            </div>
            <span v-if="errors.email" class="login-field-error">{{ errors.email }}</span>
          </div>

          <!-- Password -->
          <div class="login-field">
            <label class="login-field-label">Password</label>
            <div class="login-input-wrap">
              <input
                v-model="form.password"
                :type="showPass ? 'text' : 'password'"
                placeholder="Password"
                class="login-input"
                :class="{ 'login-input--error': errors.password }"
                @blur="validatePassword"
              />
              <component
                :is="showPass ? EyeIcon : LockIcon"
                class="login-input-icon login-input-icon--btn"
                :size="15"
                @click="showPass = !showPass"
              />
            </div>
            <span v-if="errors.password" class="login-field-error">{{ errors.password }}</span>
          </div>

          <!-- Remember + Forgot -->
          <div class="login-row-extras">
            <label class="login-remember">
              <input type="checkbox" v-model="rememberMe" />
              Remember me
            </label>
            <a href="#" class="login-forgot">Forgot password</a>
          </div>

          <!-- Botón principal -->
          <button
            class="login-btn-primary"
            :disabled="isLoading"
            @click="handleLogin"
          >
            <span v-if="isLoading" class="login-spinner" />
            {{ isLoading ? 'Signing in...' : 'Sign In' }}
          </button>

          <!-- Divisor -->
          <div class="login-divider"><span>or</span></div>

          <!-- OAuth -->
          <div class="login-oauth-row">
            <button class="login-btn-oauth" @click="handleGoogleLogin">
              <img src="https://img.icons8.com/ios11/512/FFFFFF/google-logo.png" alt="Google" class="login-oauth-logo" />
              Sign in with Google
            </button>
          </div>

          <!-- Link a register -->
          <p class="login-switch">
            Don't have an account?
            <RouterLink to="/register" class="login-switch-link">Sign up now</RouterLink>
          </p>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { MailIcon, LockIcon, EyeIcon } from 'lucide-vue-next'
import SoftParticle from '@/components/UI/Backgrounds/SoftParticles/SoftParticle.vue'
import { useAuthStore } from '@/stores/auth'
import { loginUser, loginWithGoogle } from '@/services/auth'
import './LoginView.css'

const router    = useRouter()
const route     = useRoute()
const authStore = useAuthStore()

const form     = reactive({ email: '', password: '' })
const errors   = reactive({ email: '', password: '' })
const isLoading   = ref(false)
const errorMessage = ref('')
const rememberMe   = ref(false)
const showPass     = ref(false)

// Show error forwarded from AuthCallback (e.g. google_cancelado)
onMounted(() => {
  if (route.query.error) errorMessage.value = route.query.error
})

function validateEmail() {
  errors.email = !form.email
    ? 'Email is required'
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
      ? 'Enter a valid email'
      : ''
}

function validatePassword() {
  errors.password = !form.password
    ? 'Password is required'
    : form.password.length < 6
      ? 'Minimum 6 characters'
      : ''
}

function isValid() {
  validateEmail()
  validatePassword()
  return !errors.email && !errors.password
}

function handleGoogleLogin() {
  loginWithGoogle()
}

async function handleLogin() {
  errorMessage.value = ''
  if (!isValid()) return

  isLoading.value = true
  try {
    const data = await loginUser(form.email, form.password)
    authStore.setToken(data.token)
    router.push({ name: 'dashboard' })
  } catch (err) {
    errorMessage.value = err.message || 'Something went wrong. Please try again.'
  } finally {
    isLoading.value = false
  }
}
</script>
