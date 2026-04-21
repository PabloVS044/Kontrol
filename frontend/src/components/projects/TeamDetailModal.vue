<template>
  <BaseModal v-model="show" max-width="560px">
    <template #header-prefix>
      <span class="priority-bar" :style="{ background: areaColor(team?.area), minHeight: '24px' }"></span>
    </template>
    <template #header-title>
      <span class="modal-title">{{ team?.nombre }}</span>
    </template>
    <template #header-actions>
      <button class="task-action-btn" @click="$emit('edit', team)">Edit</button>
      <button class="task-action-btn task-action-btn--close" @click="$emit('delete', team)">Delete</button>
    </template>

    <div v-if="team" class="modal-form">
      <div class="form-row">
        <div class="form-field">
          <label>Area</label>
          <span class="area-badge" style="width: fit-content;">{{ team.area }}</span>
        </div>
        <div class="form-field">
          <label>Members</label>
          <p>{{ team.miembros.length }}</p>
        </div>
        <div class="form-field">
          <label>Tasks assigned</label>
          <p>{{ team.tareasAsignadas.length }}</p>
        </div>
      </div>

      <div class="form-field">
        <label>Members</label>
        <div v-if="team.miembros.length === 0" class="empty-hint">No members assigned.</div>
        <div class="member-tags">
          <span v-for="m in team.miembros" :key="m.id_usuario" class="area-badge">
            {{ m.nombre }} {{ m.apellido }}
          </span>
        </div>
      </div>

      <div class="form-field">
        <label>Tasks</label>
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
import BaseModal from '@/components/UI/Modal/BaseModal.vue'
import TaskCard from '@/components/projects/TaskCard.vue'

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
    'Desarrollo':      '#60a5fa',
    'Diseño':          '#60a5fa',
    'Calidad':         '#34d399',
    'Infraestructura': '#f97316',
    'Gestión':         '#c9a962',
  }[area] || '#555'
}
</script>

<style scoped>
.priority-bar { width: 3px; flex-shrink: 0; }
.modal-title  { font-family: 'Playfair Display', serif; font-size: 20px; color: #faf8f5; flex: 1; }

.modal-form { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.form-field { display: flex; flex-direction: column; gap: 6px; }
.form-field label { font-size: 11px; color: #888; letter-spacing: 0.05em; font-family: 'Manrope', sans-serif; }
.form-field p { font-size: 13px; color: #faf8f5; font-family: 'Manrope', sans-serif; }
.form-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }

.area-badge {
  font-size: 11px; color: #c9a962;
  background: rgba(201,169,98,0.1); border: 1px solid rgba(201,169,98,0.2);
  padding: 3px 10px; white-space: nowrap;
  font-family: 'Manrope', sans-serif;
}

.member-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.empty-hint  { color: #555; font-size: 13px; font-family: 'Manrope', sans-serif; }
.tasks-list  { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }

.task-action-btn {
  background: transparent; border: 1px solid #1f1f1f; color: #888;
  font-family: 'Manrope', sans-serif; font-size: 11px;
  padding: 6px 12px; cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.task-action-btn:hover { border-color: #333; color: #faf8f5; }
.task-action-btn--close { border-color: rgba(52,211,153,0.2); color: #34d399; }
.task-action-btn--close:hover { border-color: rgba(52,211,153,0.4); }
</style>
