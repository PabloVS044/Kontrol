<template>
  <div class="project-card">
    <div 
      class="card-accent" 
      :style="{ backgroundColor: statusColor }"
    ></div>
    
    <div class="card-header">
      <span class="card-name">{{ project.nombre }}</span>
      <Pill
        :label="isAdmin ? 'ADMIN' : 'MEMBER'"
        :btnColor="isAdmin ? 'rgba(201,169,98,0.12)' : 'rgba(96,165,250,0.08)'"
        :circleColor="isAdmin ? '#c9a962' : '#60a5fa'"
        :textColor="isAdmin ? '#c9a962' : '#60a5fa'"
      />
    </div>

    <div class="card-body">
      <p class="card-desc">{{ project.descripcion || $t('projects.noDescription') }}</p>
      
      <!-- Progress bar -->
      <div class="progress-wrap">
        <ProgressBar
          :pct="progressPct"
          :color="statusColor"
          height="3px"
          style="flex:1"
        />
        <span class="progress-val">{{ progressPct }}%</span>
      </div>

      <!-- Budget line -->
      <div class="budget-line">
        <div class="budget-labels">
          <span>{{ $t('projects.budget') }}</span>
          <span class="budget-val">{{ budgetDisplay }}</span>
        </div>
        <div class="progress-bg">
          <div
            class="progress-fill"
            :style="{ 
              width: budgetPct + '%', 
              backgroundColor: budgetColor 
            }"
          ></div>
        </div>
        <div class="budget-meta">
          <span :style="{ color: budgetColor }">{{ $t('projects.budgetUsed', { pct: budgetPct }) }}</span>
          <span
            v-if="budgetAlert"
            class="alert-pill"
            :class="budgetAlert === 'CRITICO' ? 'critical' : 'warn'"
          >
            {{ budgetAlert === 'CRITICO' ? $t('projects.overrun') : $t('projects.warning') }}
          </span>
        </div>
      </div>

      <!-- Footer -->
      <div class="card-footer-row">
        <template v-if="canEditStatus">
          <div
            class="status-select-wrap"
            :style="{ '--status-color': statusColor }"
          >
            <span 
              class="status-dot-mark" 
              :style="{ backgroundColor: statusColor }"
            ></span>
            <select
              class="status-select"
              :value="project.estado"
              :disabled="statusUpdating"
              @change="$emit('update-status', project, $event.target.value)"
            >
              <option v-for="e in ESTADOS" :key="e.value" :value="e.value">
                {{ e.label }}
              </option>
            </select>
          </div>
        </template>
        <Pill
          v-else
          :label="displayStatusLabel"
          :btnColor="statusColor + '18'"
          :circleColor="statusColor"
          :textColor="statusColor"
        />
        <span class="due-date">
          {{ dueDateText }}
        </span>
      </div>

      <p v-if="statusError" class="status-error">
        {{ statusError }}
      </p>
    </div>

    <div class="card-open">
      <Anchor
        :label="$t('projects.list.openProject')"
        :link="projectLink"
        textColor="#555"
        backColor="transparent"
        hoverColor="rgba(201,169,98,0.06)"
      />
      <a class="open-anchor" @click="$emit('open-budget', project)">{{ $t('projects.list.openBudget') }}</a>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Pill from '../UI/Pill/Pill.vue'
import ProgressBar from '../UI/ProgressBar/ProgressBar.vue'
import Anchor from '../UI/Button/Anchor.vue'
import { statusLabel, formatDate } from '../../utils/statusHelpers.js'
import { useAuthStore } from '../../stores/auth.js'
import { STATUS_COLOR, STATUS_PROGRESS } from '../../utils/projectConstants.js'

const { t } = useI18n()
const authStore = useAuthStore()

const ESTADOS = computed(() => [
  { value: 'PLANIFICADO', label: t('projects.statuses.planned')    },
  { value: 'EN_PROGRESO', label: t('projects.statuses.inProgress') },
  { value: 'PAUSADO',     label: t('projects.statuses.paused')     },
  { value: 'COMPLETADO',  label: t('projects.statuses.completed')  },
  { value: 'CANCELADO',   label: t('projects.statuses.cancelled')  },
])

const props = defineProps({
  project: { type: Object, required: true },
  budgetSummary: { type: Object, default: () => ({}) },
  statusUpdating: Boolean,
  statusError: String,
  canEditStatus: Boolean
})

const emit = defineEmits(['update-status', 'open-budget'])

const router = useRouter()

const statusColor = computed(() => STATUS_COLOR[props.project.estado] || '#666')
const progressPct = computed(() => STATUS_PROGRESS[props.project.estado] ?? 0)
const displayStatusLabel = computed(() => statusLabel(props.project.estado))
const isAdmin = computed(() => props.project.id_encargado === authStore.idUsuario)

const budgetSummary = computed(() => props.budgetSummary)
const budgetPct = computed(() => budgetSummary.value?.porcentaje_completado ?? 0)
const budgetColor = computed(() => {
  const lvl = budgetSummary.value?.alerta_nivel
  if (lvl === 'CRITICO') return '#fb7185'
  if (lvl === 'ADVERTENCIA') return '#f97316'
  return '#c9a962'
})
const budgetAlert = computed(() => budgetSummary.value?.alerta_nivel)
const budgetDisplay = computed(() => {
  const spent = budgetSummary.value?.total_gastado ?? 0
  const total = budgetSummary.value?.presupuesto_total ?? props.project.presupuesto_total ?? 0
  return `$${Number(spent).toLocaleString()} / $${Number(total).toLocaleString()}`
})

const dueDateText = computed(() => {
  const date = props.project.fecha_fin_planificada
  return date ? t('projects.dueDate', { date: formatDate(date) }) : t('projects.noDueDate')
})

const projectLink = computed(() => `/projects/${props.project.id_proyecto}`)
</script>

<style scoped>
.project-card {
  background: #0f0f0f;
  border: 1px solid #1f1f1f;
  display: flex;
  flex-direction: column;
  transition: border-color 0.2s;
  height: 100%;
  min-height: 280px;
}
.project-card:hover { border-color: #333; }

.card-accent { height: 3px; flex-shrink: 0; }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 16px 8px;
}
.card-name {
  font-family: 'Playfair Display', serif;
  font-size: 16px;
  color: #faf8f5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.card-body {
  padding: 0 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}
.card-desc {
  font-size: 12px;
  color: #666;
  line-height: 1.5;
}

.progress-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}
.progress-val {
  font-size: 11px;
  color: #555;
  width: 30px;
  text-align: right;
  flex-shrink: 0;
}

.budget-line {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.budget-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #888;
}
.budget-val {
  color: #faf8f5;
  font-variant-numeric: tabular-nums;
}
.progress-bg {
  width: 100%;
  height: 4px;
  background: #1f1f1f;
  border-radius: 2px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  transition: width 0.4s;
}
.budget-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  color: #555;
}
.alert-pill {
  font-size: 9px;
  padding: 2px 6px;
  letter-spacing: 0.08em;
  border-radius: 2px;
  border: 1px solid currentColor;
}
.alert-pill.warn { 
  color: #f97316; 
  background: #f97316; 
}
.alert-pill.critical { 
  color: #fb7185; 
  background: #fb7185; 
}

.card-footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.due-date {
  font-size: 11px;
  color: #555;
}

.status-select-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border: 1px solid var(--status-color, #555);
  background: color-mix(in srgb, var(--status-color, #555) 9%, transparent);
  border-radius: 3px;
  height: 22px;
}
.status-dot-mark {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-select {
  background: #111111;
  border: none;
  color: var(--status-color, #faf8f5);
  font-family: 'Manrope', sans-serif;
  font-size: 10px;
  letter-spacing: 0.04em;
  padding: 0;
  padding-right: 14px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='6' viewBox='0 0 8 6'><path d='M1 1l3 3 3-3' stroke='%23888' stroke-width='1.2' fill='none' stroke-linecap='square'/></svg>");
  background-repeat: no-repeat;
  background-position: right 0 center;
  background-size: 8px 6px;
}
.status-select:disabled {
  opacity: 0.6;
  cursor: wait;
}

.status-error {
  margin-top: 6px;
  font-size: 11px;
  color: #fecdd3;
  font-family: 'Manrope', sans-serif;
}

.card-open {
  border-top: 1px solid #1a1a1a;
  padding: 10px 16px;
}
.open-anchor {
  font-size: 12px;
  color: #555;
  cursor: pointer;
  display: block;
  width: 100%;
  text-align: right;
  margin-top: 4px;
  transition: color 0.15s;
  text-decoration: none;
}
.open-anchor:hover { color: #c9a962; }

:deep(.pill) {
  height: 22px;
  padding: 0 10px;
  border-radius: 3px;
  border: 1px solid currentColor;
}
:deep(.pill-text) {
  font-size: 10px;
  letter-spacing: 0.06em;
  font-family: 'Manrope', sans-serif;
}
:deep(.dot) { display: none; }
</style>

