<template>
  <div class="task-card" :class="{ 'task-card--done': isDone }">
    <div class="task-card-left">
      <span class="priority-bar" :style="{ background: priorityColor(task.prioridad) }"></span>
      <div class="task-info">
        <span
          class="task-name"
          :class="{ 'task-name-link': clickable }"
          @click="clickable && $emit('click-detail', task)"
        >{{ task.nombre }}</span>
        <span v-if="task.descripcion" class="task-desc">{{ task.descripcion }}</span>
        <div class="task-badges">
          <span class="status-badge small" :style="statusStyle(task.estado)">
            {{ statusLabel(task.estado) }}
          </span>
          <span class="priority-badge" :style="{ color: priorityColor(task.prioridad) }">
            {{ task.prioridad }}
          </span>
          <span
            v-if="task.fecha_vencimiento"
            class="due-badge"
            :class="{ overdue: isOverdue(task) }"
          >Due {{ formatDate(task.fecha_vencimiento) }}</span>
          <span v-if="task.asignado" class="due-badge">{{ task.asignado }}</span>
        </div>
      </div>
    </div>

    <div v-if="canEdit" class="task-card-actions">
      <button class="task-action-btn" @click="$emit('click-edit', task)">Edit</button>
      <button
        v-if="!isDone"
        class="task-action-btn task-action-btn--close"
        :disabled="closing"
        @click="$emit('click-close', task)"
      >{{ closing ? '…' : 'Close' }}</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { statusStyle, statusLabel, priorityColor, formatDate, isOverdue } from '@/utils/statusHelpers.js'

const props = defineProps({
  task:      { type: Object, required: true },
  canEdit:   { type: Boolean, default: false },
  clickable: { type: Boolean, default: true },
  closing:   { type: Boolean, default: false },
})

defineEmits(['click-detail', 'click-edit', 'click-close'])

const isDone = computed(() =>
  props.task.estado === 'COMPLETADA' || props.task.estado === 'CANCELADA'
)
</script>

<style scoped>
.task-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: rgba(15,15,15,0.7);
  border: 1px solid #1f1f1f;
  transition: border-color 0.15s;
}
.task-card:hover { border-color: #2a2a2a; }
.task-card--done { opacity: 0.55; }

.task-card-left {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.priority-bar {
  width: 3px;
  min-height: 36px;
  flex-shrink: 0;
  align-self: stretch;
}

.task-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.task-name {
  font-size: 16px;
  color: #faf8f5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'Manrope', sans-serif;
}

.task-name-link { cursor: pointer; }
.task-name-link:hover { text-decoration: underline; }

.task-desc {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'Manrope', sans-serif;
}

.task-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border: 1px solid;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  font-family: 'Manrope', sans-serif;
}
.status-badge.small { font-size: 10px; padding: 2px 8px; }

.priority-badge {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  font-family: 'Manrope', sans-serif;
}

.due-badge { font-size: 11px; color: #555; font-family: 'Manrope', sans-serif; }
.due-badge.overdue { color: #fb7185; }

.task-card-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.task-action-btn {
  background: transparent;
  border: 1px solid #1f1f1f;
  color: #888;
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  padding: 6px 12px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.task-action-btn:hover { border-color: #333; color: #faf8f5; }
.task-action-btn--close { border-color: rgba(52,211,153,0.2); color: #34d399; }
.task-action-btn--close:hover { border-color: rgba(52,211,153,0.4); }
.task-action-btn:disabled { opacity: 0.5; cursor: wait; }
</style>
