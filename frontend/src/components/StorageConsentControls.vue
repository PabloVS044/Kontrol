<template>
  <div class="storage-controls">
    <p class="storage-controls-status" role="status">{{ t(`storageConsent.status.${status}`) }}</p>
    <!-- Las dos opciones pesan lo mismo: rechazar no puede costar más que aceptar. -->
    <div class="storage-controls-actions">
      <button
        type="button"
        class="storage-controls-btn"
        data-action="reject"
        :aria-pressed="decision === 'rejected'"
        @click="reject"
      >
        {{ t('storageConsent.reject') }}
      </button>
      <button
        type="button"
        class="storage-controls-btn"
        data-action="accept"
        :aria-pressed="decision === 'accepted'"
        @click="accept"
      >
        {{ t('storageConsent.accept') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStorageConsent } from '../composables/useStorageConsent.js'

/**
 * Estado y botones del consentimiento de preferencias. Lo usan el aviso, la
 * sección de cookies de /legal y Configuración, para que la decisión se pueda
 * cambiar desde cualquiera de los tres.
 */

const { t } = useI18n()
const { decision, accept, reject } = useStorageConsent()
const status = computed(() => decision.value ?? 'pending')
</script>

<style scoped>
.storage-controls {
  display: flex;
  flex-direction: column;
  gap: var(--k-space-3);
}

.storage-controls-status {
  margin: 0;
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-color-text);
}

.storage-controls-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--k-space-3);
}

.storage-controls-btn {
  flex: 1 1 140px;
  min-height: 40px;
  padding: 0 var(--k-space-4);
  background: var(--k-shade-4);
  border: 1px solid var(--k-color-border);
  border-radius: var(--k-radius-md);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  font-weight: var(--k-font-weight-semibold);
  color: var(--k-color-text);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.storage-controls-btn:hover {
  border-color: var(--k-color-primary);
}

.storage-controls-btn[aria-pressed='true'] {
  border-color: var(--k-color-primary);
  background: color-mix(in srgb, var(--k-color-primary) 18%, var(--k-shade-4));
}

.storage-controls-btn:focus-visible {
  outline: var(--k-focus-ring);
  outline-offset: var(--k-focus-ring-offset);
}
</style>
