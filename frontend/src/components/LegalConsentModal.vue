<template>
  <Teleport to="body">
    <div v-if="required" class="consent-overlay">
      <div
        ref="dialogRef"
        class="consent-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="t('legalConsent.ariaLabel')"
        tabindex="-1"
        @keydown.tab="trapFocus"
      >
        <label class="consent-check">
          <input v-model="checked" type="checkbox" class="consent-checkbox" />
          <i18n-t keypath="legalConsent.checkbox" tag="span" scope="global">
            <template #terms>
              <a href="/legal#terms" target="_blank" rel="noopener">{{ t('legalConsent.termsLink') }}</a>
            </template>
          </i18n-t>
        </label>

        <button type="button" class="consent-btn" :disabled="!checked" @click="acceptTerms">
          {{ t('legalConsent.accept') }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useLegalConsent } from '../composables/useLegalConsent.js'

/**
 * Aviso de aceptación de los Términos y Condiciones. Aparece la primera vez
 * que un usuario entra a la plataforma y no se cierra hasta que marca la
 * casilla y acepta: no tiene botón de cerrar, no responde a Escape ni al clic
 * fuera, y deja inerte el resto de la app mientras está abierto.
 */

// La portada y los textos legales se ven sin aceptar: el enlace del aviso
// abre /legal en otra pestaña para leerlos completos.
const PUBLIC_ROUTES = new Set(['landing', 'legal'])

const { t } = useI18n()
const route = useRoute()
const authStore = useAuthStore()
const { hasAccepted, accept } = useLegalConsent()

const checked = ref(false)
const dialogRef = ref(null)

// Antes de resolver la primera navegación la ruta no tiene nombre: esperar
// evita que el aviso parpadee al cargar.
const required = computed(() =>
  authStore.isLoggedIn &&
  authStore.idUsuario != null &&
  route.matched.length > 0 &&
  !PUBLIC_ROUTES.has(route.name) &&
  !hasAccepted(authStore.idUsuario),
)

function setAppInert(inert) {
  document.getElementById('app')?.toggleAttribute('inert', inert)
}

watch(required, async (isRequired) => {
  setAppInert(isRequired)
  if (!isRequired) return
  checked.value = false
  await nextTick()
  dialogRef.value?.focus()
}, { immediate: true })

onBeforeUnmount(() => setAppInert(false))

function trapFocus(event) {
  const items = [...(dialogRef.value?.querySelectorAll('a[href], button:not([disabled]), input') ?? [])]
  if (!items.length) return
  const first = items[0]
  const last = items[items.length - 1]

  if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.value)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function acceptTerms() {
  if (checked.value) accept(authStore.idUsuario)
}
</script>

<style scoped>
/* Por encima de todo lo demás de la app (el valor más alto en uso es 9999).
   Velo ligero: la plataforma se sigue viendo detrás del aviso. */
.consent-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--k-space-4);
  background: rgba(var(--k-color-black-rgb), 0.45);
  backdrop-filter: blur(2px);
}

.consent-dialog {
  width: 100%;
  max-width: 440px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: var(--k-space-4);
  padding: var(--k-space-5);
  background: color-mix(in srgb, var(--k-color-bg-2) 82%, transparent);
  backdrop-filter: blur(12px);
  border: 1px solid var(--k-color-border);
  border-radius: var(--k-radius-lg);
  box-shadow: var(--k-shadow-modal);
  text-align: left;
}

.consent-dialog:focus {
  outline: none;
}

.consent-check {
  display: flex;
  align-items: flex-start;
  gap: var(--k-space-3);
  font-size: var(--k-font-size-body-main);
  line-height: 1.5;
  color: var(--k-color-text);
  cursor: pointer;
}

.consent-checkbox {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  margin: 1px 0 0;
  accent-color: var(--k-color-primary);
  cursor: pointer;
}

.consent-check a {
  color: var(--k-color-primary);
  font-weight: var(--k-font-weight-semibold);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.consent-btn {
  align-self: flex-end;
  min-height: var(--k-target-min-size, 44px);
  padding: 0 var(--k-space-6);
  border: 1px solid var(--k-color-primary);
  border-radius: var(--k-radius-md);
  background: var(--k-color-primary);
  color: var(--k-form-btn-text);
  font-size: var(--k-font-size-body-main);
  font-weight: var(--k-font-weight-semibold);
  cursor: pointer;
  transition: opacity 0.2s;
}

.consent-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.consent-check a:focus-visible,
.consent-btn:focus-visible,
.consent-checkbox:focus-visible {
  outline: var(--k-focus-ring);
  outline-offset: var(--k-focus-ring-offset);
}

@media (max-width: 480px) {
  .consent-btn {
    align-self: stretch;
  }
}
</style>
