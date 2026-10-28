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
        <h2 class="consent-title">{{ t('legalConsent.title') }}</h2>
        <p class="consent-intro">{{ t('legalConsent.intro') }}</p>
        <ul class="consent-docs">
          <li v-for="doc in pendingDocs" :key="doc.slug">
            <a :href="doc.path" target="_blank" rel="noopener">{{ doc.title }}</a>
            <span class="consent-doc-version">{{ t('legal.document.version', { version: doc.version }) }}</span>
          </li>
        </ul>

        <label class="consent-check">
          <input v-model="checked" type="checkbox" class="consent-checkbox" />
          <span>{{ t('legalConsent.checkbox') }}</span>
        </label>

        <p v-if="error" class="consent-error" role="alert">{{ error }}</p>

        <Button
          class="consent-btn"
          :label="t('legalConsent.accept')"
          :disabled="!checked || saving"
          back-color="var(--k-color-primary)"
          hover-back="var(--k-color-primary-2)"
          @click="acceptTerms"
        />
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
import { LEGAL_DOCUMENTS, legalDocumentPath } from '../utils/legal.js'
import Button from './UI/Button/Button.vue'

/**
 * Aviso de aceptación de los documentos legales (L-6). Aparece cuando el
 * servidor dice que el usuario tiene documentos pendientes —una cuenta creada
 * con Google, o un cambio sustancial desde su última aceptación— y no se
 * cierra hasta que marca la casilla y acepta: no tiene botón de cerrar, no
 * responde a Escape ni al clic fuera, y deja inerte el resto de la app.
 */

// La portada y los textos legales se ven sin aceptar: los enlaces del aviso
// abren cada documento en otra pestaña para leerlo completo.
const PUBLIC_ROUTES = new Set(['landing', 'legal', 'legal-document'])

const { t } = useI18n()
const route = useRoute()
const authStore = useAuthStore()
const { load, pendingFor, accept } = useLegalConsent()

const checked = ref(false)
const saving = ref(false)
const error = ref('')
const dialogRef = ref(null)

// Antes de resolver la primera navegación la ruta no tiene nombre: esperar
// evita que el aviso parpadee al cargar.
const inPlatform = computed(() =>
  authStore.isLoggedIn &&
  authStore.idUsuario != null &&
  route.matched.length > 0 &&
  !PUBLIC_ROUTES.has(route.name),
)

watch(
  () => (inPlatform.value ? `${authStore.idUsuario}:${route.fullPath}` : null),
  (key) => {
    if (key) load(authStore.idUsuario)
  },
  { immediate: true },
)

const pendingDocs = computed(() =>
  pendingFor(authStore.idUsuario).map(({ document, version }) => {
    const doc = LEGAL_DOCUMENTS.find((d) => d.slug === document)
    return {
      slug: document,
      version,
      path: legalDocumentPath(doc?.id),
      title: doc ? t(`legal.${doc.id}.title`) : document,
    }
  }),
)

const required = computed(() => inPlatform.value && pendingDocs.value.length > 0)

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

async function acceptTerms() {
  if (!checked.value || saving.value) return
  saving.value = true
  error.value = ''
  try {
    await accept(authStore.idUsuario)
  } catch (err) {
    error.value = err.serverCode === 'legal_version_outdated'
      ? t('legalConsent.errors.outdated')
      : t('legalConsent.errors.generic')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
/* Por encima de todo lo demás de la app (el valor más alto en uso es 9999).
   Velo ligero: la plataforma se sigue viendo detrás del aviso. */
.consent-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--k-z-system);
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

.consent-title {
  margin: 0;
  font-size: var(--k-font-size-heading-2);
  font-weight: var(--k-font-weight-bold);
  color: var(--k-color-text);
}

.consent-intro,
.consent-error {
  margin: 0;
  font-size: var(--k-font-size-body-main);
  line-height: 1.5;
  color: var(--k-text-soft);
}

.consent-error {
  color: var(--k-color-error);
}

.consent-docs {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--k-space-2);
}

.consent-docs li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--k-space-2);
}

.consent-docs a {
  color: var(--k-color-primary);
  font-weight: var(--k-font-weight-semibold);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.consent-docs a:focus-visible {
  outline: var(--k-focus-ring);
  outline-offset: var(--k-focus-ring-offset);
}

.consent-doc-version {
  font-size: var(--k-font-size-caption);
  color: var(--k-text-dim);
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

.btn.consent-btn {
  align-self: flex-end;
  padding: 0 var(--k-space-6);
}

.consent-checkbox:focus-visible {
  outline: var(--k-focus-ring);
  outline-offset: var(--k-focus-ring-offset);
}

@media (max-width: 480px) {
  .btn.consent-btn {
    align-self: stretch;
  }
}
</style>
