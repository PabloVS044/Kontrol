<template>
  <BaseModal v-model="show" max-width="480px">
    <template #header-prefix>
      <span class="priority-bar" :style="{ background: priorityColor(task?.prioridad), minHeight: '24px' }"></span>
    </template>
    <template #header-title>
      <span class="modal-title">{{ task?.nombre ?? '…' }}</span>
    </template>

    <div v-if="loading" class="detail-loading">{{ $t('projects.tasks.detail.loading') }}</div>

    <div v-else-if="task" class="modal-form">
      <div class="form-field">
        <label>{{ $t('projects.tasks.detail.description') }}</label>
        <p>{{ task.descripcion || '—' }}</p>
      </div>
      <div class="form-row">
        <div class="form-field">
          <label>{{ $t('projects.tasks.detail.priority') }}</label>
          <p>{{ task.prioridad }}</p>
        </div>
        <div class="form-field" style="align-items: flex-start;">
          <label>{{ $t('projects.tasks.detail.status') }}</label>
          <span class="status-badge small" :style="statusStyle(task.estado)" style="width: fit-content;">
            {{ statusLabel(task.estado) }}
          </span>
        </div>
      </div>
      <div class="form-field">
        <label>{{ $t('projects.tasks.detail.dueDate') }}</label>
        <p>{{ task.fecha_vencimiento?.substring(0, 10) || '—' }}</p>
      </div>
      <div class="form-field">
        <label>{{ $t('projects.tasks.detail.assignedTo') }}</label>
        <p>{{ task.asignado_nombre ? `${task.asignado_nombre} ${task.asignado_apellido}` : '—' }}</p>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseModal from '@/components/UI/Modal/BaseModal.vue'
import { statusStyle, statusLabel, priorityColor } from '@/utils/statusHelpers.js'

const { t } = useI18n()

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  task:       { type: Object, default: null },
  loading:    { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const show = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})
</script>

<style scoped>
.priority-bar { width: 3px; flex-shrink: 0; }
.modal-title  { font-family: 'Playfair Display', serif; font-size: 20px; color: var(--Text); flex: 1; }
.detail-loading { padding: 24px; text-align: center; color: var(--TextDim); font-family: 'Manrope', sans-serif; font-size: 13px; }

.modal-form  { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.form-field  { display: flex; flex-direction: column; gap: 6px; }
.form-field label { font-size: 11px; color: var(--TextMuted); letter-spacing: 0.05em; font-family: 'Manrope', sans-serif; }
.form-field p { font-size: 13px; color: var(--Text); font-family: 'Manrope', sans-serif; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.status-badge {
  display: inline-flex; align-items: center;
  padding: 4px 12px; border: 1px solid;
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase;
  font-family: 'Manrope', sans-serif;
}
.status-badge.small { font-size: 11px; padding: 2px 8px; }
</style>
