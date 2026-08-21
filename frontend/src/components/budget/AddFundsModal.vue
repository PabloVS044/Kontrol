<template>
  <BaseModal v-model="show" :title="$t('budget.fundsModal.title')" max-width="460px">
    <form class="modal-form" @submit.prevent="handleSubmit">
      <div class="form-field">
        <label>{{ $t('budget.fundsModal.amount') }} <span class="req">*</span></label>
        <input
          v-model.number="form.monto"
          type="number"
          step="0.01"
          placeholder="0.00"
          required
        />
        <p class="hint">{{ $t('budget.fundsModal.hint') }}</p>
      </div>

      <div class="form-field">
        <label>{{ $t('budget.fundsModal.reason') }}</label>
        <textarea
          v-model="form.motivo"
          rows="2"
          :placeholder="$t('budget.fundsModal.reasonPlaceholder')"
          maxlength="500"
        ></textarea>
      </div>

      <p v-if="error" class="modal-error">{{ error }}</p>

      <div class="modal-actions">
        <button type="button" class="btn-secondary" @click="show = false">{{ $t('budget.fundsModal.cancel') }}</button>
        <button type="submit" class="btn-primary" :disabled="submitting || !isValid">
          {{ submitting ? $t('budget.fundsModal.saving') : $t('budget.fundsModal.register') }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import BaseModal from '@/components/UI/Modal/BaseModal.vue'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  submitting: { type: Boolean, default: false },
  error:      { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'submit'])

const show = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const form = ref({ monto: null, motivo: '' })

const isValid = computed(() =>
  typeof form.value.monto === 'number' && form.value.monto !== 0
)

watch(() => props.modelValue, (open) => {
  if (open) form.value = { monto: null, motivo: '' }
})

function handleSubmit() {
  if (!isValid.value) return
  emit('submit', {
    monto: form.value.monto,
    motivo: form.value.motivo?.trim() || null,
  })
}
</script>

<style scoped>
.modal-form { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.form-field { display: flex; flex-direction: column; gap: 6px; }
.form-field label {
  font-size: var(--k-font-size-caption); color: var(--k-gray-5); letter-spacing: 0.05em;
  font-family: var(--k-font-sans);
}
.form-field input,
.form-field textarea {
  background: var(--k-shade-1); border: 1px solid var(--k-shade-6); color: var(--k-color-text);
  font-family: var(--k-font-sans); font-size: var(--k-font-size-body-small);
  padding: 10px 12px; outline: none; resize: vertical;
  transition: border-color 0.15s;
}
.form-field input:focus, .form-field textarea:focus { border-color: var(--k-color-primary); }
.hint {
  font-size: var(--k-font-size-caption); color: var(--k-gray-5); line-height: 1.5; margin: 0;
  font-family: var(--k-font-sans);
}
.req { color: var(--k-color-primary); }
.modal-error { font-size: var(--k-font-size-caption-lg); color: var(--k-state-error-text); font-family: var(--k-font-sans); }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
.btn-primary {
  background: var(--k-color-primary); border: none; padding: 10px 18px; cursor: pointer;
  font-family: var(--k-font-sans); font-size: var(--k-font-size-caption-lg); font-weight: 600;
  color: var(--k-shade-1); transition: filter 0.15s;
}
.btn-primary:hover    { filter: brightness(1.1); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary {
  background: var(--k-shade-3); border: 1px solid var(--k-shade-6); color: var(--k-color-text);
  font-family: var(--k-font-sans); font-size: var(--k-font-size-caption-lg); padding: 10px 18px;
  cursor: pointer; transition: border-color 0.15s;
}
.btn-secondary:hover { border-color: var(--k-gray-1); }
</style>
