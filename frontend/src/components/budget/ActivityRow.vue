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
          <path d="M2 3l3 4 3-4" stroke="#888" stroke-width="1.4" stroke-linecap="square"/>
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

const usageColor = computed(() => {
  if (usagePct.value > 100) return '#fb7185'
  if (usagePct.value >= 80) return '#f97316'
  if (usagePct.value >= 60) return '#facc15'
  return '#caa860'
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
  border-bottom: 1px solid #1a1a1a;
}
.bar-item:last-child { border-bottom: none; }

.bar-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 6px; font-size: 13px; gap: 8px;
}

.bar-name-btn {
  display: inline-flex; align-items: center; gap: 8px;
  background: #111111; border: none; padding: 0;
  color: #faf8f5; font-family: 'Manrope', sans-serif;
  font-size: 13px; font-weight: 500;
  cursor: pointer; min-width: 0; flex: 1;
}
.bar-name-btn:hover:not(.disabled) { color: #caa860; }
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
  font-size: 11px; color: #888;
  background: #111111;
  padding: 1px 6px;
  border: 1px solid #2a2a2a;
  flex-shrink: 0;
}

.bar-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.bar-pct {
  font-weight: 600; font-size: 13px; font-variant-numeric: tabular-nums;
  transition: color 0.2s;
}

.row-btn {
  background: #111111; border: 1px solid #2e2e2e; color: #b8b8b8;
  width: 26px; height: 26px; cursor: pointer; font-size: 12px; line-height: 1;
  display: inline-flex; align-items: center; justify-content: center;
  transition: color 0.15s, border-color 0.15s;
  font-family: 'Manrope', sans-serif;
}
.row-btn:hover { color: #caa860; border-color: #caa860; }
.row-btn.danger:hover { color: #fb7185; border-color: #fb7185; }

.bar-amounts {
  display: flex; justify-content: space-between;
  font-size: 12px; color: #bcbcbc; margin-bottom: 6px;
}
.amt-label {
  font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase;
  color: #888; margin-right: 4px;
}
.bar-overrun {
  font-size: 11px; color: #fda4af; margin-top: 4px;
  font-family: 'Manrope', sans-serif;
}

.bar-details {
  margin-top: 12px;
  padding: 12px 14px;
  background: #000000;
  border: 1px solid #1a1a1a;
  border-left: 2px solid #caa860;
}
.bar-details-empty {
  font-size: 12px; color: #888; text-align: center;
  padding: 8px 0;
  font-family: 'Manrope', sans-serif;
}
.bar-details-list {
  display: flex; flex-direction: column; gap: 8px;
  font-family: 'Manrope', sans-serif;
}
.detail-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px; align-items: baseline;
  font-size: 12px;
  padding-bottom: 6px;
  border-bottom: 1px dashed #1f1f1f;
}
.detail-row:last-child { border-bottom: none; padding-bottom: 0; }

.detail-date {
  font-size: 11px; color: #888; letter-spacing: 0.05em;
  text-transform: uppercase;
  min-width: 56px;
}
.detail-tag {
  font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
  color: #caa860; background: #caa860;
  padding: 1px 6px; border: 1px solid rgba(202,168,96,0.2);
  align-self: center;
}
.detail-text {
  color: #d4d4d4; line-height: 1.4;
  overflow: hidden; text-overflow: ellipsis;
}
.detail-user { color: #888; font-size: 11px; }
.detail-amount {
  color: #faf8f5; font-weight: 600; font-variant-numeric: tabular-nums;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.18s ease;
}
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Override ProgressBar default background */
:deep(.pb-bg) {
  background: #202020;
  border: 1px solid #2a2a2a;
  height: 10px;
}
:deep(.pb-fill) {
  height: 100% !important;
}
</style>
