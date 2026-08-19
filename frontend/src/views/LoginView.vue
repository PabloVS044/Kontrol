<template>
  <div class="login-page">

    <SoftParticle />

    <div class="login-layout">

      <!-- Panel izquierdo: Logo 3D -->
      <div class="login-logo-panel">
        <KontrolLogo3D class="login-logo-3d" width="460px" height="460px" />
      </div>

      <!-- Panel derecho: Formulario -->
      <div class="login-form-panel">
        <div class="login-card">
          <h2 class="login-title">{{ $t('auth.login.title') }}</h2>

          <!-- Error del servidor -->
          <div v-if="errorMessage" class="login-banner login-banner--error">
            {{ errorMessage }}
          </div>

          <div v-if="inviteToken" class="login-banner login-banner--success">
            {{ $t('auth.login.inviteBanner') }}
          </div>

          <!-- Email -->
          <div class="login-field">
            <label class="login-field-label">{{ $t('auth.login.email') }}</label>
            <div class="login-input-wrap">
              <input
                v-model="form.email"
                type="email"
                :placeholder="$t('auth.login.email')"
                class="login-input"
                :class="{ 'login-input--error': errors.email }"
                @blur="validateEmail"
                @keyup.enter="handleLogin"
              />
              <MailIcon class="login-input-icon" :size="15" />
            </div>
            <span v-if="errors.email" class="login-field-error">{{ errors.email }}</span>
          </div>

          <!-- Password -->
          <div class="login-field">
            <label class="login-field-label">{{ $t('auth.login.password') }}</label>
            <div class="login-input-wrap">
              <input
                v-model="form.password"
                :type="showPass ? 'text' : 'password'"
                :placeholder="$t('auth.login.password')"
                class="login-input"
                :class="{ 'login-input--error': errors.password }"
                @blur="validatePassword"
                @keyup.enter="handleLogin"
              />
              <component
                :is="showPass ? EyeIcon : EyeOffIcon"
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
              {{ $t('auth.login.rememberMe') }}
            </label>
            <a href="#" class="login-forgot">{{ $t('auth.login.forgotPassword') }}</a>
          </div>

          <!-- Botón principal -->
          <button
            class="login-btn-primary"
            :disabled="isLoading"
            @click="handleLogin"
          >
            <span v-if="isLoading" class="login-spinner" />
            {{ isLoading ? $t('auth.login.submitting') : $t('auth.login.submit') }}
          </button>

          <!-- Divisor -->
          <div class="login-divider"><span>{{ $t('auth.login.divider') }}</span></div>

          <!-- OAuth -->
          <div class="login-oauth-row">
            <button class="login-btn-oauth" @click="handleGoogleLogin">
              <img src="https://img.icons8.com/ios11/512/FFFFFF/google-logo.png" alt="Google" class="login-oauth-logo" />
              {{ $t('auth.login.withGoogle') }}
            </button>
          </div>

          <!-- Link a register -->
          <p class="login-switch">
            {{ $t('auth.login.noAccount') }}
            <RouterLink
              :to="inviteToken ? { name: 'register', query: { invite: inviteToken } } : { name: 'register' }"
              class="login-switch-link"
            >
              {{ $t('auth.login.signUp') }}
            </RouterLink>
          </p>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { computed, ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { MailIcon,  EyeIcon, EyeOffIcon } from 'lucide-vue-next'
import SoftParticle from '@/components/UI/Backgrounds/SoftParticles/SoftParticle.vue'
import KontrolLogo3D from '@/components/UI/KontrolLogo3D/KontrolLogo3D.vue'
import { useAuthStore } from '@/stores/auth'
import { loginUser, loginWithGoogle } from '@/services/auth'
import { finalizeAuthenticatedSession, getDefaultAuthenticatedRoute } from '@/utils/authFlow'
import { getInviteTokenFromQuery } from '@/utils/invitation'
import './LoginView.css'

const { t }     = useI18n()
const router    = useRouter()
const route     = useRoute()
const authStore = useAuthStore()

const form     = reactive({ email: '', password: '' })
const errors   = reactive({ email: '', password: '' })
const isLoading   = ref(false)
const errorMessage = ref('')
const rememberMe   = ref(false)
const showPass     = ref(false)
const inviteToken  = computed(() => getInviteTokenFromQuery(route.query))

// Show error forwarded from AuthCallback (e.g. google_cancelado)
onMounted(() => {
  if (route.query.error) errorMessage.value = route.query.error
})

function validateEmail() {
  errors.email = !form.email
    ? t('auth.login.errors.emailRequired')
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
      ? t('auth.login.errors.emailInvalid')
      : ''
}

function validatePassword() {
  errors.password = !form.password
    ? t('auth.login.errors.passwordRequired')
    : form.password.length < 6
      ? t('auth.login.errors.passwordMin')
      : ''
}

function isValid() {
  validateEmail()
  validatePassword()
  return !errors.email && !errors.password
}

function handleGoogleLogin() {
  loginWithGoogle(inviteToken.value)
}

async function handleLogin() {
  errorMessage.value = ''
  if (!isValid()) return

  isLoading.value = true
  try {
    const data = await loginUser(form.email, form.password, inviteToken.value || undefined)

    await finalizeAuthenticatedSession({
      authStore,
      token: data.token,
      user: data.data,
      joinedEmpresaId: data.invite?.empresa?.id_empresa,
    })

    if (inviteToken.value && data.invite && !data.invite.success && !authStore.empresaActual) {
      router.push({
        name: 'invite',
        params: { token: inviteToken.value },
        query: { error: data.invite.code },
      })
      return
    }

    router.push(getDefaultAuthenticatedRoute(authStore))
  } catch (err) {
    errorMessage.value = err.code
      ? t(`auth.login.errors.${err.code}`)
      : err.message || t('auth.login.errors.generic')
  } finally {
    isLoading.value = false
  }
}
</script>
