<template>
  <BaseModal v-model="show" :title="editingTask ? $t('projects.tasks.modal.editTitle') : $t('projects.tasks.modal.newTitle')">
    <form class="modal-form" @submit.prevent="handleSubmit">
      <FormField :label="$t('projects.tasks.modal.name')" :required="true">
        <input v-model="form.nombre" type="text" :placeholder="$t('projects.tasks.modal.namePlaceholder')" required />
      </FormField>

      <FormField :label="$t('projects.tasks.modal.description')">
        <textarea v-model="form.descripcion" :placeholder="$t('projects.tasks.modal.descriptionPlaceholder')" rows="2"></textarea>
      </FormField>

      <div class="form-row">
        <FormField :label="$t('projects.tasks.modal.priority')">
          <select v-model="form.prioridad">
            <option value="BAJA">{{ $t('projects.priorities.low') }}</option>
            <option value="MEDIA">{{ $t('projects.priorities.medium') }}</option>
            <option value="ALTA">{{ $t('projects.priorities.high') }}</option>
            <option value="CRITICA">{{ $t('projects.priorities.critical') }}</option>
          </select>
        </FormField>
        <FormField :label="editingTask ? $t('projects.tasks.modal.status') : $t('projects.tasks.modal.initialStatus')">
          <select v-model="form.estado">
            <option value="PENDIENTE">{{ $t('projects.taskStatuses.pending') }}</option>
            <option value="EN_PROGRESO">{{ $t('projects.taskStatuses.inProgress') }}</option>
            <option value="COMPLETADA">{{ $t('projects.taskStatuses.completed') }}</option>
            <option value="CANCELADA">{{ $t('projects.taskStatuses.cancelled') }}</option>
          </select>
        </FormField>
      </div>

      <FormField :label="$t('projects.tasks.modal.assignTo')">
        <select v-model="form.id_asignado">
          <option value="">{{ $t('projects.tasks.modal.unassigned') }}</option>
          <option v-for="m in members" :key="m.id_usuario" :value="m.id_usuario">
            {{ m.nombre }} {{ m.apellido }}
          </option>
        </select>
      </FormField>

      <FormField :label="$t('projects.tasks.modal.dueDate')">
        <input v-model="form.fecha_vencimiento" type="date" />
      </FormField>

      <p v-if="error" class="modal-error">{{ error }}</p>

      <div class="modal-actions">
        <Button
          class="btn-cancel"
          :label="$t('projects.tasks.modal.cancel')"
          back-color="var(--k-shade-3)"
          hover-back="var(--k-shade-4)"
          @click="show = false"
        />
        <Button
          class="btn-save"
          type="submit"
          :disabled="submitting"
          :label="submitting ? $t('projects.tasks.modal.saving') : editingTask ? $t('projects.tasks.modal.update') : $t('projects.tasks.modal.create')"
          back-color="var(--k-color-primary)"
          hover-back="var(--k-color-primary-2)"
        />
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseModal from '@/components/UI/Modal/BaseModal.vue'
import Button from '@/components/UI/Button/Button.vue'
import FormField from '@/components/common/FormField.vue'

const { t } = useI18n()

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
.modal-form { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.form-row   { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.modal-form input,
.modal-form textarea,
.modal-form select {
  background: var(--k-shade-1);
  border: var(--k-border-width) solid var(--k-shade-6);
  color: var(--k-color-text);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-small);
  padding: 10px 12px;
  outline: none;
  resize: none;
  transition: var(--k-transition-ui);
}
.modal-form input:focus,
.modal-form textarea:focus,
.modal-form select:focus {
  border-color: var(--k-color-primary);
  background: var(--k-form-input-focus-bg);
}
.modal-form input::placeholder,
.modal-form textarea::placeholder { color: var(--k-text-placeholder); }
.modal-form select option { background: var(--k-shade-2); }

.modal-error   { font-size: var(--k-font-size-caption-lg); color: var(--k-state-error-text); font-family: var(--k-font-sans); }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }

.modal-actions .btn {
  border-radius: 0;
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  font-weight: var(--k-font-weight-semibold);
  padding: 10px 18px;
}
.modal-actions .btn-cancel {
  border: var(--k-border-width) solid var(--k-shade-6);
  color: var(--k-color-text);
}
.modal-actions .btn-save { color: var(--k-form-btn-text); }
</style>
