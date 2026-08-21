<template>
  <section class="summary-card">
    <div class="summary-info">
      <h2 class="card-title">{{ $t('budget.summary.title') }}</h2>
      <div class="amount-grid">
        <div class="amount-group">
          <span class="label">{{ $t('budget.summary.totalAllocated') }}</span>
          <h3 class="total-value">${{ formatMoney(totalAllocated) }}</h3>
        </div>
        <div class="amount-group">
          <span class="label">{{ $t('budget.summary.expenses') }}</span>
          <h3 class="spent-value">${{ formatMoney(totalSpent) }}</h3>
        </div>
        <div class="amount-group">
          <span class="label income">{{ $t('budget.summary.income') }}</span>
          <h3 class="income-value">${{ formatMoney(totalIncome) }}</h3>
        </div>
        <div class="amount-group">
          <span class="label" :class="netClass">{{ $t('budget.summary.net') }}</span>
          <h3 class="net-value" :class="netClass">
            {{ netResult < 0 ? '-' : '' }}${{ formatMoney(Math.abs(netResult)) }}
          </h3>
        </div>
        <div class="amount-group">
          <span class="label" :class="remainingClass">{{ $t('budget.summary.remaining') }}</span>
          <h3 class="remaining-value" :class="remainingClass">
            {{ remaining < 0 ? '-' : '' }}${{ formatMoney(Math.abs(remaining)) }}
          </h3>
        </div>
        <div class="amount-group">
          <span class="label">{{ $t('budget.summary.planned') }}</span>
          <h3 class="planned-value">${{ formatMoney(totalPlanned) }}</h3>
        </div>
      </div>
    </div>

    <div class="chart-donut">
      <svg viewBox="0 0 100 100">
        <circle class="circle-bg" cx="50" cy="50" r="40" />
        <circle
          class="circle-progress"
          cx="50" cy="50" r="40"
          :stroke="progressColor"
          :stroke-dasharray="CIRCUMFERENCE"
          :stroke-dashoffset="CIRCUMFERENCE * (1 - Math.min(1, usageRatio))"
        />
      </svg>
      <div class="donut-text">
        <span class="p-label">{{ $t('budget.summary.used') }}</span>
        <span class="p-value">{{ displayPct }}%</span>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  totalAllocated: { type: Number, default: 0 },
  totalSpent:     { type: Number, default: 0 },
  totalIncome:    { type: Number, default: 0 },
  totalPlanned:   { type: Number, default: 0 },
  remaining:      { type: Number, default: 0 },
  netResult:      { type: Number, default: 0 },
  usageRatio:     { type: Number, default: 0 },
})

const CIRCUMFERENCE = 2 * Math.PI * 40

const displayPct = computed(() => {
  const pct = props.usageRatio * 100
  if (pct <= 0) return 0
  if (pct < 1) return Math.round(pct * 10) / 10
  return Math.round(Math.min(999, pct))
})

const remainingClass = computed(() => props.remaining < 0 ? 'danger' : 'gold')
const netClass       = computed(() => props.netResult < 0 ? 'danger' : 'income')

// Mismo colapso de niveles que budgetColor() en ProjectsView.vue: la paleta v2
// no define un ámbar/naranja intermedio (theme.css, sección "superficies de
// alerta"), así que precaución+advertencia comparten color.
const progressColor = computed(() => {
  if (props.usageRatio > 1)     return 'var(--k-state-error-text)'
  if (props.usageRatio >= 0.6)  return '#f97316' // TODO SCRUM-16: sin token de aviso claro
  return 'var(--k-color-primary)'
})

function formatMoney(v) {
  const n = Number(v || 0)
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.summary-card {
  background: #0c0c0c; /* sin token exacto en la rampa de shades */
  border: 1px solid var(--k-shade-7);
  padding: 32px;
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 24px; gap: 32px; flex-wrap: wrap;
}
.summary-info { flex: 1; min-width: 280px; }
.card-title {
  font-family: var(--k-font-display);
  font-size: var(--k-font-size-heading-1); margin-bottom: 22px; color: var(--k-color-text);
}
.amount-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px 28px;
}
.amount-group { min-width: 0; }
.label {
  font-size: var(--k-font-size-caption); letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--k-gray-5); display: block; margin-bottom: 4px;
}
.label.gold,   .gold    { color: var(--k-color-primary); }
.label.danger, .danger  { color: var(--k-state-error-text); }
.label.income, .income  { color: var(--k-state-success-text); }

.total-value     { font-size: 26px; font-weight: 700; color: var(--k-color-text); font-variant-numeric: tabular-nums; }
.spent-value     { font-size: 22px; font-weight: 600; color: var(--k-color-text); font-variant-numeric: tabular-nums; }
.income-value    { font-size: 22px; font-weight: 700; color: var(--k-state-success-text); font-variant-numeric: tabular-nums; }
.net-value       { font-size: var(--k-font-size-heading-1); font-weight: 700; font-variant-numeric: tabular-nums; }
.remaining-value { font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; }
.planned-value   { font-size: var(--k-font-size-heading-2); font-weight: 600; color: #d4d4d4; font-variant-numeric: tabular-nums; } /* sin token exacto */

.chart-donut {
  width: 180px; height: 180px; position: relative; flex-shrink: 0;
}
.chart-donut svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.circle-bg       { fill: none; stroke: #242424; stroke-width: 8; } /* sin token exacto */
.circle-progress {
  fill: none; stroke-width: 8; stroke-linecap: round;
  transition: stroke-dashoffset 0.6s ease, stroke 0.4s ease;
}
.donut-text {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%); text-align: center;
}
.p-label { font-size: var(--k-font-size-caption); letter-spacing: 0.1em; color: var(--k-gray-5); display: block; }
.p-value { font-size: 22px; font-weight: 700; color: var(--k-color-text); }

@media (max-width: 800px) {
  .amount-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px) {
  .summary-card { padding: 24px; gap: 20px; }
  .amount-grid { gap: 12px; }
  .chart-donut { width: 150px; height: 150px; margin: 0 auto; }
  .total-value { font-size: 22px; }
  .net-value, .remaining-value, .income-value { font-size: 18px; }
}
</style>
