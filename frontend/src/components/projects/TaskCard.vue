<template>
  <div class="task-card" :class="{ 'task-card--done': isDone }">
    <div class="task-card-left">
      <span class="priority-bar" :style="{ background: taskPriorityColor(task.prioridad) }"></span>
      <div class="task-info">
        <span
          class="task-name"
          :class="{ 'task-name-link': clickable }"
          @click="clickable && $emit('click-detail', task)"
        >{{ task.nombre }}</span>
        <span v-if="task.descripcion" class="task-desc">{{ task.descripcion }}</span>
        <div class="task-badges">
          <span class="status-badge small" :style="taskStatusStyle(task.estado)">
            {{ statusLabel(task.estado) }}
          </span>
          <span class="priority-badge" :style="{ color: taskPriorityColor(task.prioridad) }">
            {{ task.prioridad }}
          </span>
          <span
            v-if="task.fecha_vencimiento"
            class="due-badge"
            :class="{ overdue: isOverdue(task) }"
          >{{ $t('projects.tasks.card.due', { date: formatDate(task.fecha_vencimiento) }) }}</span>
          <span v-if="task.asignado" class="due-badge">{{ task.asignado }}</span>
        </div>
      </div>
    </div>

    <div v-if="canEdit" class="task-card-actions">
      <button class="task-action-btn" @click="$emit('click-edit', task)">{{ $t('projects.tasks.card.edit') }}</button>
      <button
        v-if="!isDone"
        class="task-action-btn task-action-btn--close"
        :disabled="closing"
        @click="$emit('click-close', task)"
      >{{ closing ? '…' : $t('projects.tasks.card.close') }}</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { statusLabel, formatDate, isOverdue } from '@/utils/statusHelpers.js'
import { taskStatusStyle, taskPriorityColor } from '@/utils/taskIndicatorColors.js'

const { t } = useI18n()

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
  background: var(--k-shade-2);
  border: 1px solid var(--k-shade-6);
  transition: border-color 0.15s;
}
.task-card:hover { border-color: var(--k-shade-7); }
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
  font-size: var(--k-font-size-body-large);
  color: var(--k-color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--k-font-sans);
}

.task-name-link { cursor: pointer; }
.task-name-link:hover { text-decoration: underline; }

.task-desc {
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-gray-4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--k-font-sans);
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
  font-size: var(--k-font-size-caption);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  font-family: var(--k-font-sans);
}
.status-badge.small { font-size: var(--k-font-size-caption); padding: 2px 8px; }

.priority-badge {
  font-size: var(--k-font-size-caption);
  font-weight: 600;
  letter-spacing: 0.06em;
  font-family: var(--k-font-sans);
}

.due-badge { font-size: var(--k-font-size-caption); color: var(--k-gray-3); font-family: var(--k-font-sans); }
.due-badge.overdue { color: var(--k-state-error-text); }

.task-card-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.task-action-btn {
  background: var(--k-shade-3);
  border: 1px solid var(--k-shade-6);
  color: var(--k-gray-5);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption);
  padding: 6px 12px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.task-action-btn:hover { border-color: var(--k-gray-1); color: var(--k-color-text); }
.task-action-btn--close { border-color: rgba(var(--k-color-success-rgb), 0.2); color: var(--k-state-success-text); }
.task-action-btn--close:hover { border-color: rgba(var(--k-color-success-rgb), 0.4); }
.task-action-btn:disabled { opacity: 0.5; cursor: wait; }
</style>
