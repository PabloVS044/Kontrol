<template>
  <BaseModal v-model="show" title="Nueva entrada de bitácora" maxWidth="500px">
    <form class="modal-form" @submit.prevent="handleSubmit">

      <div class="form-field">
        <label>Descripción <span class="req">*</span></label>
        <textarea v-model="form.descripcion" placeholder="¿Qué avance se realizó?" rows="3" required></textarea>
      </div>

      <div class="form-row">
        <div class="form-field">
          <label>Tipo de entrada</label>
          <select v-model="form.tipo">
            <option value="completed">Completado</option>
            <option value="warning">Advertencia</option>
            <option value="error">Error / Bloqueo</option>
          </select>
        </div>

        <div class="form-field">
          <label>Fecha</label>
          <input v-model="form.fecha" type="datetime-local" />
        </div>
      </div>

      <div class="form-field">
        <label>Registrado por</label>
        <input v-model="form.nombre" type="text" placeholder="Nombre del responsable" />
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
    nombre:      '',
    descripcion: '',
    tipo:        'completed',
    fecha:       now.toISOString().substring(0, 16),
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
