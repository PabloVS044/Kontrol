<template>
  <BaseModal v-model="show" :title="editingTask ? 'Edit task' : 'New task'">
    <form class="modal-form" @submit.prevent="handleSubmit">
      <div class="form-field">
        <label>Name <span class="req">*</span></label>
        <input v-model="form.nombre" type="text" placeholder="Task name" required />
      </div>

      <div class="form-field">
        <label>Description</label>
        <textarea v-model="form.descripcion" placeholder="Optional description" rows="2"></textarea>
      </div>

      <div class="form-row">
        <div class="form-field">
          <label>Priority</label>
          <select v-model="form.prioridad">
            <option value="BAJA">Low</option>
            <option value="MEDIA">Medium</option>
            <option value="ALTA">High</option>
            <option value="CRITICA">Critical</option>
          </select>
        </div>
        <div class="form-field">
          <label>{{ editingTask ? 'Status' : 'Initial status' }}</label>
          <select v-model="form.estado">
            <option value="PENDIENTE">Pending</option>
            <option value="EN_PROGRESO">In progress</option>
            <option value="COMPLETADA">Completed</option>
            <option value="CANCELADA">Cancelled</option>
          </select>
        </div>
      </div>

      <div class="form-field">
        <label>Assign to</label>
        <select v-model="form.id_asignado">
          <option value="">— Unassigned —</option>
          <option v-for="m in members" :key="m.id_usuario" :value="m.id_usuario">
            {{ m.nombre }} {{ m.apellido }}
          </option>
        </select>
      </div>

      <div class="form-field">
        <label>Due date</label>
        <input v-model="form.fecha_vencimiento" type="date" />
      </div>

      <p v-if="error" class="modal-error">{{ error }}</p>

      <div class="modal-actions">
        <button type="button" class="btn-secondary" @click="show = false">Cancel</button>
        <button type="submit" class="btn-primary" :disabled="submitting">
          {{ submitting ? 'Saving…' : editingTask ? 'Update task' : 'Create task' }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import BaseModal from '@/components/UI/Modal/BaseModal.vue'

const props = defineProps({
  modelValue:  { type: Boolean, required: true },
  editingTask: { type: Object, default: null },
  members:     { type: Array, default: () => [] },
  submitting:  { type: Boolean, default: false },
  error:       { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'submit'])

const show = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const form = ref(emptyForm())

function emptyForm() {
  return { nombre: '', descripcion: '', prioridad: 'MEDIA', estado: 'PENDIENTE', fecha_vencimiento: '', id_asignado: '' }
}

watch(() => props.modelValue, (open) => {
  if (!open) return
  if (props.editingTask) {
    form.value = {
      nombre:            props.editingTask.nombre,
      descripcion:       props.editingTask.descripcion || '',
      prioridad:         props.editingTask.prioridad,
      estado:            props.editingTask.estado,
      fecha_vencimiento: props.editingTask.fecha_vencimiento?.substring(0, 10) || '',
      id_asignado:       props.editingTask.asignado_id || '',
    }
  } else {
    form.value = emptyForm()
  }
})

function handleSubmit() {
  emit('submit', { ...form.value })
}
</script>

<style scoped>
.modal-form  { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.form-field  { display: flex; flex-direction: column; gap: 6px; }
.form-field label { font-size: 11px; color: #888; letter-spacing: 0.05em; font-family: 'Manrope', sans-serif; }
.form-field input,
.form-field textarea,
.form-field select {
  background: #0a0a0a; border: 1px solid #1f1f1f;
  color: #faf8f5; font-family: 'Manrope', sans-serif; font-size: 13px;
  padding: 10px 12px; outline: none; resize: none;
  transition: border-color 0.15s;
}
.form-field input:focus,
.form-field textarea:focus,
.form-field select:focus { border-color: #c9a962; }
.form-field select option { background: #0f0f0f; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.req { color: #c9a962; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
.modal-error   { font-size: 12px; color: #fb7185; font-family: 'Manrope', sans-serif; }

.btn-primary {
  display: inline-flex; align-items: center; gap: 8px;
  background: #c9a962; border: none; padding: 10px 18px; cursor: pointer;
  font-family: 'Manrope', sans-serif; font-size: 12px; font-weight: 600;
  color: #0a0a0a; transition: filter 0.15s;
}
.btn-primary:hover { filter: brightness(1.1); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary {
  background: transparent; border: 1px solid #1f1f1f; color: #faf8f5;
  font-family: 'Manrope', sans-serif; font-size: 12px; padding: 10px 18px;
  cursor: pointer; transition: border-color 0.15s;
}
.btn-secondary:hover { border-color: #333; }
</style>
