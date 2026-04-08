<template>
  <div class="register-page">

    <SoftParticle />

    <div class="register-layout">

      <!-- Panel izquierdo: Formulario -->
      <div class="register-form-panel">
        <div class="register-card">
          <h2 class="register-title">Register</h2>

          <!-- Banners -->
          <div v-if="errorMessage" class="register-banner register-banner--error">{{ errorMessage }}</div>
          <div v-if="successMessage" class="register-banner register-banner--success">{{ successMessage }}</div>

          <!-- First Name + Last Name -->
          <div class="register-row-two">
            <div class="register-field">
              <label class="register-field-label">First Name</label>
              <input
                v-model="form.firstName"
                type="text"
                placeholder="First Name"
                class="register-input"
                :class="{ 'register-input--error': errors.firstName }"
                @blur="validate('firstName')"
              />
              <span v-if="errors.firstName" class="register-field-error">{{ errors.firstName }}</span>
            </div>
            <div class="register-field">
              <label class="register-field-label">Last Name</label>
              <input
                v-model="form.lastName"
                type="text"
                placeholder="Last Name"
                class="register-input"
                :class="{ 'register-input--error': errors.lastName }"
                @blur="validate('lastName')"
              />
              <span v-if="errors.lastName" class="register-field-error">{{ errors.lastName }}</span>
            </div>
          </div>

          <!-- Email -->
          <div class="register-field">
            <label class="register-field-label">Email</label>
            <div class="register-input-wrap">
              <input
                v-model="form.email"
                type="email"
                placeholder="Email"
                class="register-input"
                :class="{ 'register-input--error': errors.email }"
                @blur="validate('email')"
              />
              <MailIcon class="register-input-icon" :size="15" />
            </div>
            <span v-if="errors.email" class="register-field-error">{{ errors.email }}</span>
          </div>

          <!-- Password -->
          <div class="register-field">
            <label class="register-field-label">Password</label>
            <div class="register-input-wrap">
              <input
                v-model="form.password"
                :type="showPass ? 'text' : 'password'"
                placeholder="Password"
                class="register-input"
                :class="{ 'register-input--error': errors.password }"
                @blur="validate('password')"
              />
              <component
                :is="showPass ? EyeIcon : LockIcon"
                class="register-input-icon register-input-icon--btn"
                :size="15"
                @click="showPass = !showPass"
              />
            </div>
            <span v-if="errors.password" class="register-field-error">{{ errors.password }}</span>
          </div>

          <!-- Botón Create Account -->
          <button
            class="register-btn-primary"
            :disabled="isLoading"
            @click="handleRegister"
          >
            <span v-if="isLoading" class="register-spinner" />
            {{ isLoading ? 'Creating account...' : 'Create Account' }}
          </button>

          <!-- Divisor -->
          <div class="register-divider"><span>or</span></div>

          <!-- OAuth -->
          <div class="register-oauth-row">
            <button class="register-btn-oauth" @click="handleGoogleRegister">
              <img src="https://img.icons8.com/ios11/512/FFFFFF/google-logo.png" alt="Google" class="register-oauth-logo" />
              Sign up with Google
            </button>
          </div>

          <!-- Link a login -->
          <p class="register-switch">
            Already have an account?
            <RouterLink to="/login" class="register-switch-link">Sign in</RouterLink>
          </p>

        </div>
      </div>

      <!-- Panel derecho: Logo -->
      <div class="register-logo-panel">
        <img src="@/assets/img/kontrol.png" alt="Kontrol" class="register-logo-img" />
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { MailIcon, LockIcon, EyeIcon } from 'lucide-vue-next'
import SoftParticle from '@/components/UI/Backgrounds/SoftParticles/SoftParticle.vue'
import { useAuthStore } from '@/stores/auth'
import { registerUser, loginWithGoogle } from '@/services/auth'
import './RegisterView.css'

const router    = useRouter()
const authStore = useAuthStore()

const form = reactive({ firstName: '', lastName: '', email: '', password: '' })
const errors = reactive({ firstName: '', lastName: '', email: '', password: '' })
const isLoading     = ref(false)
const errorMessage  = ref('')
const successMessage = ref('')
const showPass      = ref(false)

const rules = {
  firstName: () => !form.firstName.trim() ? 'First name is required' : '',
  lastName:  () => !form.lastName.trim()  ? 'Last name is required' : '',
  email:     () => {
    if (!form.email) return 'Email is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter a valid email'
    return ''
  },
  password: () => {
    if (!form.password) return 'Password is required'
    if (form.password.length < 6) return 'Minimum 6 characters'
    return ''
  },
}

function validate(field) {
  errors[field] = rules[field]()
}

function isValid() {
  Object.keys(rules).forEach(f => validate(f))
  return !Object.values(errors).some(Boolean)
}

function handleGoogleRegister() {
  loginWithGoogle()
}

async function handleRegister() {
  errorMessage.value  = ''
  successMessage.value = ''
  if (!isValid()) return

  isLoading.value = true
  try {
    await registerUser(form.firstName, form.lastName, form.email, form.password)
    successMessage.value = 'Account created! Redirecting to login...'
    setTimeout(() => router.push({ name: 'login' }), 1400)
  } catch (err) {
    errorMessage.value = err.message || 'Something went wrong. Please try again.'
  } finally {
    isLoading.value = false
  }
}
</script>
