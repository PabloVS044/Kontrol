<template>
  <BaseModal v-model="show" :title="$t('inventory.delete.title')" max-width="420px">
    <div class="delete-body">
      <p class="delete-question">
        {{ $t('inventory.delete.question', { name: product?.nombre ?? '' }) }}
      </p>
      <p class="delete-warning">{{ $t('inventory.delete.warning') }}</p>

      <p v-if="error" class="delete-error">{{ error }}</p>

      <div class="modal-actions">
        <Button
          class="btn-cancel"
          :label="$t('inventory.modal.cancel')"
          :disabled="submitting"
          back-color="var(--k-shade-3)"
          hover-back="var(--k-shade-4)"
          @click="show = false"
        />
        <Button
          class="btn-delete"
          :label="submitting ? $t('inventory.delete.deleting') : $t('inventory.delete.submit')"
          :disabled="submitting"
          back-color="var(--k-color-error)"
          hover-back="var(--k-alert-critical-text)"
          @click="$emit('confirm')"
        />
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { computed } from 'vue'
import BaseModal from '@/components/UI/Modal/BaseModal.vue'
import Button from '@/components/UI/Button/Button.vue'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  product:    { type: Object, default: null },
  error:      { type: String, default: null },
  submitting: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const show = computed({
  get: () => props.modelValue,
  // Igual que en el cobro: mientras la petición está en vuelo el diálogo no se
  // cierra, para que el resultado no se pierda de vista.
  set: (v) => { if (!props.submitting) emit('update:modelValue', v) },
})
</script>

<style scoped>
/**
 * Confirmación de borrado. El botón destructivo va en rojo de marca —no en el
 * dorado del resto de acciones— para que no se confunda con un "guardar".
 */

.delete-body { padding: 24px; display: flex; flex-direction: column; gap: 12px; }

.delete-question {
  margin: 0;
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-main);
  color: var(--k-color-text);
  line-height: var(--k-leading-normal);
}
.delete-warning {
  margin: 0;
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-text-muted);
}

.delete-error {
  margin: 0;
  font-family: var(--k-font-sans); font-size: var(--k-font-size-caption-lg);
  color: var(--k-alert-critical-text);
  background: var(--k-alert-critical-bg);
  border: var(--k-border-width) solid var(--k-alert-critical-border);
  padding: 10px 12px;
}

.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
.modal-actions .btn {
  border-radius: 0;
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  font-weight: var(--k-font-weight-semibold);
  letter-spacing: var(--k-tracking-caps); text-transform: uppercase;
  padding: 10px 20px;
}
.modal-actions .btn-cancel {
  border: var(--k-border-width) solid var(--k-shade-6);
  color: var(--k-color-text);
}
.modal-actions .btn-delete { color: var(--k-color-text); }
</style>
