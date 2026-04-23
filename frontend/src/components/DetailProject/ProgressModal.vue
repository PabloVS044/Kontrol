<template>
  <BaseModal v-model="show" title="Nueva entrada de bitácora" maxWidth="500px">
    <form class="modal-form" @submit.prevent="handleSubmit">

      <div class="form-field">
        <label>Descripción <span class="req">*</span></label>
        <textarea v-model="form.title" placeholder="¿Qué avance se realizó?" rows="3" required></textarea>
      </div>

      <div class="form-field">
        <label>Detalles adicionales</label>
        <textarea v-model="form.details" placeholder="Contexto extra para el equipo (opcional)" rows="2"></textarea>
      </div>

      <div class="form-row">
        <div class="form-field">
          <label>Tipo de entrada</label>
          <select v-model="form.updateType">
            <option value="UPDATE">Avance</option>
            <option value="MILESTONE">Hito / Logro</option>
            <option value="BLOCKER">Bloqueo</option>
          </select>
        </div>

        <div class="form-field">
          <label>Progreso (%) <span class="req">*</span></label>
          <input v-model.number="form.progressPercentage" type="number" min="0" max="100" step="1" required />
        </div>
      </div>

      <div class="form-field">
        <label>Fecha</label>
        <input v-model="form.happenedAt" type="datetime-local" />
      </div>

      <p v-if="error" class="modal-error">{{ error }}</p>

      <div class="modal-actions">
        <button type="button" class="btn-secondary" @click="show = false">Cancelar</button>
        <button type="submit" class="btn-primary" :disabled="submitting">
          {{ submitting ? 'Guardando…' : 'Agregar entrada' }}
        </button>
      </div>

    </form>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import BaseModal from '@/components/UI/Modal/BaseModal.vue'
import './ProgressModal.css'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  submitting:  { type: Boolean, default: false },
  error:       { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'submit'])

const show = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

function emptyForm() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return {
    title:              '',
    details:            '',
    updateType:         'UPDATE',
    progressPercentage: 0,
    happenedAt:         now.toISOString().substring(0, 16),
  }
}

const form = ref(emptyForm())

watch(() => props.modelValue, (open) => {
  if (open) form.value = emptyForm()
})

function handleSubmit() {
  emit('submit', { ...form.value })
}
</script>
