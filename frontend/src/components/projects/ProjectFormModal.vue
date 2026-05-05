<template>
  <BaseModal v-model="localShow" :title="title">
    <form class="modal-form" @submit.prevent="handleSubmit">
      
      <!-- Name -->
      <FormField label="Name" :required="true">
        <input 
          v-model="localForm.nombre" 
          type="text" 
          placeholder="Project name" 
          required 
          :disabled="loading"
        />
      </FormField>

      <!-- Description -->
      <FormField label="Description">
        <textarea 
          v-model="localForm.descripcion" 
          placeholder="Optional description" 
          rows="2"
          :disabled="loading"
        />
      </FormField>

      <!-- Dates row -->
      <div class="form-row">
        <FormField label="Start date" :required="true">
          <input 
            v-model="localForm.fecha_inicio" 
            type="date" 
            required 
            :disabled="loading"
          />
        </FormField>
        <FormField label="End date">
          <input 
            v-model="localForm.fecha_fin_planificada" 
            type="date" 
            :disabled="loading"
          />
        </FormField>
      </div>

      <!-- Budget/Status row -->
      <div class="form-row">
        <FormField label="Budget" :required="true">
          <input
            v-model.number="localForm.presupuesto_total"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            required
            :disabled="loading"
          />
        </FormField>
        <FormField label="Status">
          <select v-model="localForm.estado" :disabled="loading">
            <option v-for="e in ESTADOS" :key="e.value" :value="e.value">
              {{ e.label }}
            </option>
          </select>
        </FormField>
      </div>

      <FormField :error="error">
        <template #default></template>
      </FormField>

      <!-- Actions -->
      <div class="modal-actions">
        <Button 
          label="Cancel" 
          type="button" 
          @click="localShow = false"
          :disabled="loading"
        />
        <Button
          :label="loading ? 'Saving…' : 'Save project'"
          type="submit"
          :disabled="loading"
        />
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { ref, watch } from 'vue'
import BaseModal from '../UI/Modal/BaseModal.vue'
import Button from '../UI/Button/Button.vue'
import FormField from '../common/FormField.vue'
import { ESTADOS } from '../../utils/projectConstants.js'


const emit = defineEmits(['update:show', 'submit'])

const props = defineProps({
  modelValue: Boolean,
  loading: Boolean,
  error: String,
  title: { type: String, default: 'New Project' }
})

const localShow = ref(false)
const localForm = ref({
  nombre: '',
  descripcion: '',
  fecha_inicio: new Date().toISOString().split('T')[0],
  fecha_fin_planificada: '',
  presupuesto_total: null,
  estado: 'PLANIFICADO'
})

watch(() => props.modelValue, (val) => {
  localShow.value = val
  if (!val) resetForm()
})

watch(localShow, (val) => {
  emit('update:show', val)
})

function resetForm() {
  localForm.value = {
    nombre: '',
    descripcion: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin_planificada: '',
    presupuesto_total: null,
    estado: 'PLANIFICADO'
  }
}

function handleSubmit() {
  emit('submit', { ...localForm.value })
}
</script>

<style scoped>
.modal-form {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;
}

:global(.modal-actions :deep(.btn)) {
  border-radius: 0;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 600;
  padding: 10px 20px;
}
.modal-actions :deep(.btn):first-child {
  background: transparent;
  border: 1px solid #1f1f1f;
  color: #faf8f5;
}
.modal-actions :deep(.btn):last-child {
  background: #c9a962;
  color: #0a0a0a;
}
.modal-actions :deep(.btn):last-child:disabled {
  opacity: 0.6;
}
</style>

