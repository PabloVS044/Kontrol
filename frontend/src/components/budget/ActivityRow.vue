<template>
  <div class="bar-item" :class="{ expanded }">
    <div class="bar-header">
      <button
        class="bar-name-btn"
        :class="{ disabled: !hasDetails }"
        :disabled="!hasDetails"
        :title="hasDetails ? (expanded ? $t('budget.activityRow.hideDetails') : $t('budget.activityRow.showDetails')) : $t('budget.activityRow.noEntries')"
        @click="toggle"
      >
        <svg
          v-if="hasDetails"
          class="chev"
          :class="{ open: expanded }"
          width="10" height="10" viewBox="0 0 10 10" fill="none"
        >
          <path d="M2 3l3 4 3-4" stroke="var(--k-gray-5)" stroke-width="1.4" stroke-linecap="square"/>
        </svg>
        <span v-else class="chev-placeholder"></span>
        <span class="bar-name">{{ activity.nombre }}</span>
        <span v-if="gastosCount > 0" class="bar-count">{{ gastosCount }}</span>
      </button>

      <span class="bar-right">
        <span class="bar-pct" :style="{ color: usageColor }">{{ usagePct }}%</span>
        <button
          v-if="canEdit"
          class="row-btn"
          title="Edit activity"
          @click="$emit('edit', activity)"
        >✎</button>
        <button
          v-if="canDelete"
          class="row-btn danger"
          title="Delete activity"
          @click="$emit('delete', activity)"
        >×</button>
      </span>
    </div>

    <div class="bar-amounts">
      <span><span class="amt-label">{{ $t('budget.activityRow.planned') }}</span> ${{ formatMoney(activity.monto_planificado) }}</span>
      <span><span class="amt-label">{{ $t('budget.activityRow.actual') }}</span> ${{ formatMoney(efectivo) }}</span>
    </div>
    <ProgressBar
      :pct="Math.min(100, usagePct)"
      :color="usageColor"
      height="10px"
    />
    <div v-if="usagePct > 100" class="bar-overrun">
      {{ $t('budget.activityRow.overPlan', { amount: formatMoney(efectivo - Number(activity.monto_planificado || 0)) }) }}
    </div>

    <!-- Expandable history -->
    <transition name="fade">
      <div v-if="expanded" class="bar-details">
        <div v-if="historyLoading" class="bar-details-empty">{{ $t('budget.activityRow.loading') }}</div>

        <div v-else-if="history && history.length" class="bar-details-list">
          <div v-if="manualReal > 0" class="detail-row manual">
            <span class="detail-tag">{{ $t('budget.activityRow.manual') }}</span>
            <span class="detail-text">{{ $t('budget.activityRow.directEntry') }}</span>
            <span class="detail-amount">${{ formatMoney(manualReal) }}</span>
          </div>
          <div v-for="g in history" :key="g.id_movimiento" class="detail-row">
            <span class="detail-date">{{ formatDate(g.fecha) }}</span>
            <span class="detail-text">
              {{ g.motivo || t('budget.activityRow.registeredExpense') }}
              <span v-if="g.usuario" class="detail-user">— {{ g.usuario }}</span>
            </span>
            <span class="detail-amount">${{ formatMoney(g.monto) }}</span>
          </div>
        </div>

        <div v-else-if="manualReal > 0" class="bar-details-list">
          <div class="detail-row manual">
            <span class="detail-tag">{{ $t('budget.activityRow.manual') }}</span>
            <span class="detail-text">{{ $t('budget.activityRow.directEntry') }}</span>
            <span class="detail-amount">${{ formatMoney(manualReal) }}</span>
          </div>
        </div>

        <div v-else class="bar-details-empty">
          {{ $t('budget.activityRow.noEntriesYet') }}
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ProgressBar from '@/components/UI/ProgressBar/ProgressBar.vue'

const { t } = useI18n()

const props = defineProps({
  activity:    { type: Object, required: true },
  canEdit:     { type: Boolean, default: false },
  canDelete:   { type: Boolean, default: false },
  fetchHistory:{ type: Function, default: null },
})

defineEmits(['edit', 'delete'])

const expanded = ref(false)
const historyLoading = ref(false)
const history = ref(null)

const manualReal = computed(() => parseFloat(props.activity.monto_real || 0))
const efectivo   = computed(() => parseFloat(props.activity.monto_real_efectivo ?? props.activity.monto_real ?? 0))
const gastosCount = computed(() => Number(props.activity.gastos_count || 0))

const hasDetails = computed(() => gastosCount.value > 0 || manualReal.value > 0)

const usagePct = computed(() => {
  const planned = parseFloat(props.activity.monto_planificado || 0)
  if (planned <= 0) return efectivo.value > 0 ? 100 : 0
  return Math.round((efectivo.value / planned) * 100)
})

// Mismo colapso de niveles que budgetColor() en ProjectsView.vue y
// progressColor() en BudgetSummaryCard.vue: la paleta v2 no define un
// ámbar/naranja intermedio.
const usageColor = computed(() => {
  if (usagePct.value > 100) return 'var(--k-state-error-text)'
  if (usagePct.value >= 60) return '#f97316' // TODO SCRUM-16: sin token de aviso claro
  return 'var(--k-color-primary)'
})

async function toggle() {
  if (!hasDetails.value) return
  expanded.value = !expanded.value
  if (expanded.value && history.value === null && props.fetchHistory) {
    historyLoading.value = true
    try {
      const data = await props.fetchHistory(props.activity.id_actividad)
      history.value = data?.gastos ?? []
    } catch {
      history.value = []
    } finally {
      historyLoading.value = false
    }
  }
}

// If the activity changes (e.g. after editing), drop the cached history.
watch(() => props.activity.id_actividad, () => {
  history.value = null
  expanded.value = false
})

// Refresh when gastos_count changes (new expense registered).
watch(gastosCount, (now, before) => {
  if (now !== before) history.value = null
})

function formatMoney(v) {
  const n = Number(v || 0)
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function formatDate(v) {
  if (!v) return ''
  try {
    return new Date(v).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })
  } catch { return v }
}
</script>

<style scoped>
.bar-item {
  margin-bottom: 18px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--k-shade-4);
}
.bar-item:last-child { border-bottom: none; }

.bar-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 6px; font-size: var(--k-font-size-body-small); gap: 8px;
}

.bar-name-btn {
  display: inline-flex; align-items: center; gap: 8px;
  background: var(--k-shade-3); border: none; padding: 0;
  color: var(--k-color-text); font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-small); font-weight: 500;
  cursor: pointer; min-width: 0; flex: 1;
}
.bar-name-btn:hover:not(.disabled) { color: var(--k-color-primary); }
.bar-name-btn.disabled { cursor: default; opacity: 1; }
.bar-name-btn:disabled { cursor: default; }

.chev {
  flex-shrink: 0; transition: transform 0.2s;
}
.chev.open { transform: rotate(180deg); }
.chev-placeholder { width: 10px; flex-shrink: 0; }

.bar-name {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.bar-count {
  font-size: var(--k-font-size-caption); color: var(--k-gray-5);
  background: var(--k-shade-3);
  padding: 1px 6px;
  border: 1px solid var(--k-shade-7);
  flex-shrink: 0;
}

.bar-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.bar-pct {
  font-weight: 600; font-size: var(--k-font-size-body-small); font-variant-numeric: tabular-nums;
  transition: color 0.2s;
}

.row-btn {
  background: var(--k-shade-3); border: 1px solid #2e2e2e; color: #b8b8b8; /* sin token exacto */
  width: 26px; height: 26px; cursor: pointer; font-size: var(--k-font-size-caption-lg); line-height: 1;
  display: inline-flex; align-items: center; justify-content: center;
  transition: color 0.15s, border-color 0.15s;
  font-family: var(--k-font-sans);
}
.row-btn:hover { color: var(--k-color-primary); border-color: var(--k-color-primary); }
.row-btn.danger:hover { color: var(--k-state-error-text); border-color: var(--k-state-error-text); }

.bar-amounts {
  display: flex; justify-content: space-between;
  font-size: var(--k-font-size-caption-lg); color: #bcbcbc; margin-bottom: 6px; /* sin token exacto */
}
.amt-label {
  font-size: var(--k-font-size-caption); letter-spacing: 0.05em; text-transform: uppercase;
  color: var(--k-gray-5); margin-right: 4px;
}
.bar-overrun {
  font-size: var(--k-font-size-caption); color: var(--k-state-error-text); margin-top: 4px;
  font-family: var(--k-font-sans);
}

.bar-details {
  margin-top: 12px;
  padding: 12px 14px;
  background: rgb(var(--k-color-black-rgb));
  border: 1px solid var(--k-shade-4);
  border-left: 2px solid var(--k-color-primary);
}
.bar-details-empty {
  font-size: var(--k-font-size-caption-lg); color: var(--k-gray-5); text-align: center;
  padding: 8px 0;
  font-family: var(--k-font-sans);
}
.bar-details-list {
  display: flex; flex-direction: column; gap: 8px;
  font-family: var(--k-font-sans);
}
.detail-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px; align-items: baseline;
  font-size: var(--k-font-size-caption-lg);
  padding-bottom: 6px;
  border-bottom: 1px dashed var(--k-shade-6);
}
.detail-row:last-child { border-bottom: none; padding-bottom: 0; }

.detail-date {
  font-size: var(--k-font-size-caption); color: var(--k-gray-5); letter-spacing: 0.05em;
  text-transform: uppercase;
  min-width: 56px;
}
.detail-tag {
  font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; /* sin token exacto */
  color: var(--k-color-primary); background: var(--k-surface-primary-tint);
  padding: 1px 6px; border: 1px solid rgba(var(--k-color-primary-rgb), 0.2);
  align-self: center;
}
.detail-text {
  color: #d4d4d4; line-height: 1.4; /* sin token exacto */
  overflow: hidden; text-overflow: ellipsis;
}
.detail-user { color: var(--k-gray-5); font-size: var(--k-font-size-caption); }
.detail-amount {
  color: var(--k-color-text); font-weight: 600; font-variant-numeric: tabular-nums;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.18s ease;
}
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Override ProgressBar default background */
:deep(.pb-bg) {
  background: #202020; /* sin token exacto */
  border: 1px solid var(--k-shade-7);
  height: 10px;
}
:deep(.pb-fill) {
  height: 100% !important;
}
</style>
