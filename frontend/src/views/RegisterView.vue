<template>
  <div class="register-page">

    <SoftParticle />

    <div class="register-layout">

      <!-- Panel izquierdo: Formulario -->
      <div class="register-form-panel">
        <div class="register-card">
          <h2 class="register-title">{{ $t('auth.register.title') }}</h2>

          <!-- Banners -->
          <div v-if="errorMessage" class="register-banner register-banner--error">{{ errorMessage }}</div>
          <div v-if="successMessage" class="register-banner register-banner--success">{{ successMessage }}</div>
          <div v-if="inviteToken" class="register-banner register-banner--success">
            {{ $t('auth.register.inviteBanner') }}
          </div>

          <!-- First Name + Last Name -->
          <div class="register-row-two">
            <div class="register-field">
              <label class="register-field-label">{{ $t('auth.register.firstName') }}</label>
              <input
                v-model="form.firstName"
                type="text"
                :placeholder="$t('auth.register.firstName')"
                class="register-input"
                :class="{ 'register-input--error': errors.firstName }"
                @blur="validate('firstName')"
                @keyup.enter="handleRegister"
              />
              <span v-if="errors.firstName" class="register-field-error">{{ errors.firstName }}</span>
            </div>
            <div class="register-field">
              <label class="register-field-label">{{ $t('auth.register.lastName') }}</label>
              <input
                v-model="form.lastName"
                type="text"
                :placeholder="$t('auth.register.lastName')"
                class="register-input"
                :class="{ 'register-input--error': errors.lastName }"
                @blur="validate('lastName')"
                @keyup.enter="handleRegister"
              />
              <span v-if="errors.lastName" class="register-field-error">{{ errors.lastName }}</span>
            </div>
          </div>

          <!-- Email -->
          <div class="register-field">
            <label class="register-field-label">{{ $t('auth.register.email') }}</label>
            <div class="register-input-wrap">
              <input
                v-model="form.email"
                type="email"
                :placeholder="$t('auth.register.email')"
                class="register-input"
                :class="{ 'register-input--error': errors.email }"
                @blur="validate('email')"
                @keyup.enter="handleRegister"
              />
              <MailIcon class="register-input-icon" :size="15" />
            </div>
            <span v-if="errors.email" class="register-field-error">{{ errors.email }}</span>
          </div>

          <!-- Password -->
          <div class="register-field">
            <label class="register-field-label">{{ $t('auth.register.password') }}</label>
            <div class="register-input-wrap">
              <input
                v-model="form.password"
                :type="showPass ? 'text' : 'password'"
                :placeholder="$t('auth.register.password')"
                class="register-input"
                :class="{ 'register-input--error': errors.password }"
                @blur="validate('password')"
                @keyup.enter="handleRegister"
              />
              <component
                :is="showPass ? EyeIcon : EyeOffIcon"
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
            {{ isLoading ? $t('auth.register.submitting') : $t('auth.register.submit') }}
          </button>

          <!-- Divisor -->
          <div class="register-divider"><span>{{ $t('auth.register.divider') }}</span></div>

          <!-- OAuth -->
          <div class="register-oauth-row">
            <button class="register-btn-oauth" @click="handleGoogleRegister">
              <img src="https://img.icons8.com/ios11/512/FFFFFF/google-logo.png" alt="Google" class="register-oauth-logo" />
              {{ $t('auth.register.withGoogle') }}
            </button>
          </div>

          <!-- Link a login -->
          <p class="register-switch">
            {{ $t('auth.register.hasAccount') }}
            <RouterLink
              :to="inviteToken ? { name: 'login', query: { invite: inviteToken } } : { name: 'login' }"
              class="register-switch-link"
            >
              {{ $t('auth.register.signIn') }}
            </RouterLink>
          </p>

        </div>
      </div>

      <!-- Panel derecho: Logo 3D -->
      <div class="register-logo-panel">
        <KontrolLogo3D class="register-logo-3d" width="460px" height="460px" />
      </div>

    </div>
  </div>
</template>

<script setup>
import { computed, ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { MailIcon,  EyeIcon, EyeOffIcon } from 'lucide-vue-next'
import SoftParticle from '@/components/UI/Backgrounds/SoftParticles/SoftParticle.vue'
import KontrolLogo3D from '@/components/UI/KontrolLogo3D/KontrolLogo3D.vue'
import { useAuthStore } from '@/stores/auth'
import { registerUser, loginWithGoogle } from '@/services/auth'
import { finalizeAuthenticatedSession, getDefaultAuthenticatedRoute } from '@/utils/authFlow'
import { getInviteTokenFromQuery } from '@/utils/invitation'
import './RegisterView.css'

const { t }     = useI18n()
const router    = useRouter()
const route     = useRoute()
const authStore = useAuthStore()

const form = reactive({ firstName: '', lastName: '', email: '', password: '' })
const errors = reactive({ firstName: '', lastName: '', email: '', password: '' })
const isLoading     = ref(false)
const errorMessage  = ref('')
const successMessage = ref('')
const showPass      = ref(false)
const inviteToken   = computed(() => getInviteTokenFromQuery(route.query))

const rules = {
  firstName: () => !form.firstName.trim() ? t('auth.register.errors.firstNameRequired') : '',
  lastName:  () => !form.lastName.trim()  ? t('auth.register.errors.lastNameRequired') : '',
  email:     () => {
    if (!form.email) return t('auth.register.errors.emailRequired')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return t('auth.register.errors.emailInvalid')
    return ''
  },
  password: () => {
    if (!form.password) return t('auth.register.errors.passwordRequired')
    if (form.password.length < 6) return t('auth.register.errors.passwordMin')
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
  loginWithGoogle(inviteToken.value)
}

async function handleRegister() {
  errorMessage.value  = ''
  successMessage.value = ''
  if (!isValid()) return

  isLoading.value = true
  try {
    const data = await registerUser(
      form.firstName,
      form.lastName,
      form.email,
      form.password,
      { inviteToken: inviteToken.value || undefined }
    )

    if (inviteToken.value) {
      await finalizeAuthenticatedSession({
        authStore,
        token: data.token,
        user: data.data,
        joinedEmpresaId: data.invite?.empresa?.id_empresa,
      })

      if (data.invite && !data.invite.success && !authStore.empresaActual) {
        router.push({
          name: 'invite',
          params: { token: inviteToken.value },
          query: { error: data.invite.code },
        })
        return
      }

      router.push(getDefaultAuthenticatedRoute(authStore))
      return
    }

    successMessage.value = t('auth.register.success')
    setTimeout(() => router.push({ name: 'login' }), 1400)
  } catch (err) {
    errorMessage.value = err.message || t('auth.register.errors.generic')
  } finally {
    isLoading.value = false
  }
}
</script>
