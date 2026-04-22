<template>
  <BaseModal v-model="show" title="New product" max-width="480px">
    <form class="modal-form" @submit.prevent="handleSubmit">
      <div class="form-field">
        <label>Name <span class="req">*</span></label>
        <input v-model="form.nombre" type="text" placeholder="Product name" required />
      </div>

      <div class="form-field">
        <label>Description</label>
        <textarea v-model="form.descripcion" placeholder="Optional description" rows="2"></textarea>
      </div>

      <div class="form-row">
        <div class="form-field">
          <label>Sale price <span class="req">*</span></label>
          <input v-model.number="form.precio_venta" type="number" min="0" step="0.01" placeholder="0.00" required />
        </div>
        <div class="form-field">
          <label>Cost price <span class="req">*</span></label>
          <input v-model.number="form.precio_costo" type="number" min="0" step="0.01" placeholder="0.00" required />
        </div>
      </div>

      <div class="form-row">
        <div class="form-field">
          <label>Initial stock</label>
          <input v-model.number="form.stock_inicial" type="number" min="0" placeholder="0" />
        </div>
        <div class="form-field">
          <label>Min. stock</label>
          <input v-model.number="form.stock_minimo" type="number" min="0" placeholder="0" />
        </div>
      </div>

      <p v-if="error" class="modal-error">{{ error }}</p>

      <div class="modal-actions">
        <button type="button" class="btn-secondary" @click="show = false">Cancel</button>
        <button type="submit" class="btn-primary" :disabled="submitting">
          {{ submitting ? 'Saving…' : 'Save product' }}
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

const form = ref({ nombre: '', descripcion: '', precio_venta: null, precio_costo: null, stock_minimo: 0, stock_inicial: 0 })

watch(() => props.modelValue, (open) => {
  if (open) form.value = { nombre: '', descripcion: '', precio_venta: null, precio_costo: null, stock_minimo: 0, stock_inicial: 0 }
})

function handleSubmit() {
  emit('submit', { ...form.value })
}
</script>

<style scoped>
.modal-form { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.form-field  { display: flex; flex-direction: column; gap: 6px; }
.form-row    { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-field label { font-size: 11px; color: #888; letter-spacing: 0.05em; font-family: 'Manrope', sans-serif; }
.form-field input,
.form-field textarea,
.form-field select {
  background: #0a0a0a; border: 1px solid #1f1f1f;
  color: #faf8f5; font-family: 'Manrope', sans-serif; font-size: 13px;
  padding: 10px 12px; outline: none; resize: vertical;
  transition: border-color 0.15s;
}
.form-field input:focus,
.form-field textarea:focus { border-color: #c9a962; }
.req { color: #c9a962; }
.modal-error   { font-size: 12px; color: #fb7185; font-family: 'Manrope', sans-serif; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }

.btn-primary {
  background: #c9a962; border: none; padding: 10px 18px; cursor: pointer;
  font-family: 'Manrope', sans-serif; font-size: 12px; font-weight: 600;
  color: #0a0a0a; transition: filter 0.15s;
}
.btn-primary:hover    { filter: brightness(1.1); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary {
  background: transparent; border: 1px solid #1f1f1f; color: #faf8f5;
  font-family: 'Manrope', sans-serif; font-size: 12px; padding: 10px 18px;
  cursor: pointer; transition: border-color 0.15s;
}
.btn-secondary:hover { border-color: #333; }
</style>
