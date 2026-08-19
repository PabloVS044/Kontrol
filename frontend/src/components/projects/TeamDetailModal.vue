<template>
  <BaseModal v-model="show" max-width="560px">
    <template #header-prefix>
      <span class="priority-bar" :style="{ background: areaColor(team?.area), minHeight: '24px' }"></span>
    </template>
    <template #header-title>
      <span class="modal-title">{{ team?.nombre }}</span>
    </template>
    <template #header-actions>
      <button class="task-action-btn" @click="$emit('edit', team)">{{ $t('projects.team.detail.edit') }}</button>
      <button class="task-action-btn task-action-btn--close" @click="$emit('delete', team)">{{ $t('projects.team.detail.delete') }}</button>
    </template>

    <div v-if="team" class="modal-form">
      <div class="form-row">
        <div class="form-field">
          <label>{{ $t('projects.team.detail.area') }}</label>
          <span class="area-badge" style="width: fit-content;">{{ areaLabel(team.area) }}</span>
        </div>
        <div class="form-field">
          <label>{{ $t('projects.team.detail.members') }}</label>
          <p>{{ team.miembros.length }}</p>
        </div>
        <div class="form-field">
          <label>{{ $t('projects.team.detail.tasksAssigned') }}</label>
          <p>{{ team.tareasAsignadas.length }}</p>
        </div>
      </div>

      <div class="form-field">
        <label>{{ $t('projects.team.detail.members') }}</label>
        <div v-if="team.miembros.length === 0" class="empty-hint">{{ $t('projects.team.detail.noMembers') }}</div>
        <div class="member-tags">
          <span v-for="m in team.miembros" :key="m.id_usuario" class="area-badge">
            {{ m.nombre }} {{ m.apellido }}
          </span>
        </div>
      </div>

      <div class="form-field">
        <label>{{ $t('projects.team.detail.tasks') }}</label>
        <div class="tasks-list">
          <TaskCard
            v-for="t in team.tareasAsignadas"
            :key="t.id"
            :task="t"
            :clickable="false"
          />
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseModal from '@/components/UI/Modal/BaseModal.vue'
import TaskCard from '@/components/projects/TaskCard.vue'

const { t } = useI18n()

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  team:       { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'edit', 'delete'])

const show = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

function areaColor(area) {
  return {
    /* cambiar a token color azul */
    Development: '#60a5fa',
    Engineering: '#60a5fa',
    Design: '#60a5fa',
    Quality: 'var(--k-state-success-text)',
    Infrastructure: '#f97316',
    Management: 'var(--k-color-primary)',
    Desarrollo: '#60a5fa',
    Diseño: '#60a5fa',
    Calidad: 'var(--k-state-success-text)',
    Infraestructura: '#f97316',
    Gestión: 'var(--k-color-primary)',
  }[area] || 'var(--k-gray-3)'
}

function areaLabel(area) {
  return {
    Desarrollo: 'Engineering',
    Diseño: 'Design',
    Calidad: 'Quality',
    Infraestructura: 'Infrastructure',
    Gestión: 'Management',
  }[area] || area
}
</script>

<style scoped>
.priority-bar { width: 3px; flex-shrink: 0; }
.modal-title  { font-family: var(--k-font-display); font-size: var(--k-font-size-heading-2); color: var(--k-color-text); flex: 1; }

.modal-form { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.form-field { display: flex; flex-direction: column; gap: 6px; }
.form-field label { font-size: var(--k-font-size-caption); color: var(--k-gray-5); letter-spacing: 0.05em; font-family: var(--k-font-sans); }
.form-field p { font-size: var(--k-font-size-body-small); color: var(--k-color-text); font-family: var(--k-font-sans); }
.form-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }

.area-badge {
  font-size: var(--k-font-size-caption); color: var(--k-color-primary);
  background: var(--k-surface-primary-tint); border: 1px solid rgba(var(--k-color-primary-rgb), 0.2);
  padding: 3px 10px; white-space: nowrap;
  font-family: var(--k-font-sans);
}

.member-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.empty-hint  { color: var(--k-gray-3); font-size: var(--k-font-size-body-small); font-family: var(--k-font-sans); }
.tasks-list  { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }

.task-action-btn {
  background: #111111; border: 1px solid #1f1f1f; color: #888;
  font-family: 'Manrope', sans-serif; font-size: 11px;
  padding: 6px 12px; cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.task-action-btn:hover { border-color: #333; color: #faf8f5; }
.task-action-btn--close { border-color: rgba(52,211,153,0.2); color: #34d399; }
.task-action-btn--close:hover { border-color: rgba(52,211,153,0.4); }
</style>
