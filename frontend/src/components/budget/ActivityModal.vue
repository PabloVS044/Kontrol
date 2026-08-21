<template>
  <BaseModal v-model="show" :title="editingActivity ? $t('budget.activityModal.editTitle') : $t('budget.activityModal.newTitle')" max-width="460px">
    <form class="modal-form" @submit.prevent="handleSubmit">
      <div class="form-field">
        <label>{{ $t('budget.activityModal.name') }} <span class="req">*</span></label>
        <input v-model="form.nombre" type="text" :placeholder="$t('budget.activityModal.namePlaceholder')" required />
      </div>
      <div class="form-row">
        <div class="form-field">
          <label>{{ $t('budget.activityModal.planned') }} <span class="req">*</span></label>
          <input v-model.number="form.monto_planificado" type="number" min="0" step="0.01" placeholder="0.00" required />
        </div>
        <div class="form-field">
          <label>{{ $t('budget.activityModal.actual') }}</label>
          <input v-model.number="form.monto_real" type="number" min="0" step="0.01" placeholder="0.00" />
        </div>
      </div>

      <p v-if="error" class="modal-error">{{ error }}</p>

      <div class="modal-actions">
        <button type="button" class="btn-secondary" @click="show = false">{{ $t('budget.activityModal.cancel') }}</button>
        <button type="submit" class="btn-primary" :disabled="submitting">
          {{ submitting ? $t('budget.activityModal.saving') : $t('budget.activityModal.save') }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import BaseModal from '@/components/UI/Modal/BaseModal.vue'

const props = defineProps({
  modelValue:      { type: Boolean, required: true },
  editingActivity: { type: Object, default: null },
  submitting:      { type: Boolean, default: false },
  error:           { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'submit'])

const show = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const form = ref({ nombre: '', monto_planificado: null, monto_real: null })

watch(() => props.modelValue, (open) => {
  if (!open) return
  if (props.editingActivity) {
    form.value = {
      nombre:            props.editingActivity.nombre,
      monto_planificado: parseFloat(props.editingActivity.monto_planificado),
      monto_real:        props.editingActivity.monto_real != null
        ? parseFloat(props.editingActivity.monto_real)
        : null,
    }
  } else {
    form.value = { nombre: '', monto_planificado: null, monto_real: null }
  }
})

function handleSubmit() {
  emit('submit', { ...form.value })
}
</script>

<style scoped>
.modal-form { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.form-field { display: flex; flex-direction: column; gap: 6px; }
.form-row   { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-field label {
  font-size: var(--k-font-size-caption); color: var(--k-gray-5); letter-spacing: 0.05em;
  font-family: var(--k-font-sans);
}
.form-field input {
  background: var(--k-shade-1); border: 1px solid var(--k-shade-6); color: var(--k-color-text);
  font-family: var(--k-font-sans); font-size: var(--k-font-size-body-small);
  padding: 10px 12px; outline: none; transition: border-color 0.15s;
}
.form-field input:focus { border-color: var(--k-color-primary); }
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
