<template>
  <section class="breakdown-card">
    <h2 class="section-subtitle">{{ $t('budget.breakdown.title') }}</h2>
    <p class="hint">{{ $t('budget.breakdown.hint') }}</p>

    <div class="group-label">{{ $t('budget.breakdown.expensesLabel') }}</div>
    <div class="row" v-for="src in expenseSources" :key="src.key">
      <div class="row-head">
        <span class="row-label">
          <span class="row-dot" :style="{ background: src.color }"></span>
          {{ src.label }}
        </span>
        <span class="row-amount">${{ formatMoney(src.value) }}</span>
      </div>
      <ProgressBar
        :pct="expenseScale ? (src.value / expenseScale) * 100 : 0"
        :color="src.color"
        height="6px"
      />
    </div>

    <div class="subtotal-row">
      <span>{{ $t('budget.breakdown.totalExpenses') }}</span>
      <span class="subtotal-value">${{ formatMoney(totalExpenses) }}</span>
    </div>

    <div class="group-label" style="margin-top: 18px">{{ $t('budget.breakdown.incomeLabel') }}</div>
    <div class="row">
      <div class="row-head">
        <span class="row-label">
          <span class="row-dot" style="background: var(--k-state-success-text)"></span>
          {{ $t('budget.breakdown.productSales') }}
        </span>
        <span class="row-amount income">${{ formatMoney(totalIncome) }}</span>
      </div>
      <ProgressBar
        :pct="expenseScale ? (totalIncome / expenseScale) * 100 : 0"
        color="var(--k-state-success-text)"
        height="6px"
      />
    </div>

    <div class="net-row" :class="netClass">
      <span class="net-label">{{ $t('budget.breakdown.netResult') }}</span>
      <span class="net-value">
        {{ netResult < 0 ? '-' : '' }}${{ formatMoney(Math.abs(netResult)) }}
      </span>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ProgressBar from '@/components/UI/ProgressBar/ProgressBar.vue'

const { t } = useI18n()

const props = defineProps({
  totalBudget:           { type: Number, default: 0 },
  totalActivities:       { type: Number, default: 0 },
  totalInventoryAdmin:   { type: Number, default: 0 },
  totalInventoryStock:   { type: Number, default: 0 },
  totalIncome:           { type: Number, default: 0 },
})

// admin/activities son categorías decorativas, no estados: la paleta v2 no
// define azul ni morado (mismo hueco documentado en ProjectDetailsView.css
// para .area-badge), así que se conservan literales.
const expenseSources = computed(() => [
  { key: 'stock',      label: t('budget.breakdown.inventoryPurchases'), value: props.totalInventoryStock, color: 'var(--k-color-primary)' },
  { key: 'admin',      label: t('budget.breakdown.adminExpenses'),      value: props.totalInventoryAdmin, color: '#60a5fa' },
  { key: 'activities', label: t('budget.breakdown.activitiesManual'),   value: props.totalActivities,     color: '#a78bfa' },
])

const totalExpenses = computed(() =>
  props.totalActivities + props.totalInventoryAdmin + props.totalInventoryStock
)

const netResult = computed(() => props.totalIncome - totalExpenses.value)
const netClass  = computed(() => netResult.value < 0 ? 'negative' : 'positive')

// Scale bars against the largest single value so they're visually comparable.
const expenseScale = computed(() => Math.max(
  props.totalInventoryStock,
  props.totalInventoryAdmin,
  props.totalActivities,
  props.totalIncome,
  1,
))

function formatMoney(v) {
  const n = Number(v || 0)
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.breakdown-card {
  background: var(--k-shade-1);
  border: 1px solid var(--k-shade-7);
  padding: 20px;
  margin-bottom: 16px;
}
.section-subtitle {
  letter-spacing: 0.15em; font-size: var(--k-font-size-caption); color: var(--k-color-primary);
  font-weight: 600; margin-bottom: 8px; text-transform: uppercase;
}
.hint {
  font-size: var(--k-font-size-caption); color: var(--k-gray-5); margin-bottom: 16px; line-height: 1.5;
  font-family: var(--k-font-sans);
}

.group-label {
  font-size: var(--k-font-size-caption); letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--k-gray-5); margin-bottom: 10px;
  font-family: var(--k-font-sans);
}

.row { margin-bottom: 12px; }
.row-head {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 5px; font-size: var(--k-font-size-caption-lg);
  font-family: var(--k-font-sans);
}
.row-label {
  display: inline-flex; align-items: center; gap: 8px;
  color: #d4d4d4; /* sin token exacto */
}
.row-dot {
  width: 8px; height: 8px; border-radius: 50%; display: inline-block;
}
.row-amount {
  color: var(--k-color-text); font-weight: 600; font-variant-numeric: tabular-nums;
}
.row-amount.income { color: var(--k-state-success-text); }

.subtotal-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 0 0; margin-top: 4px;
  border-top: 1px dashed var(--k-shade-6);
  font-size: var(--k-font-size-caption-lg); color: var(--k-text-soft);
  font-family: var(--k-font-sans);
}
.subtotal-value {
  color: var(--k-color-text); font-weight: 700; font-variant-numeric: tabular-nums;
}

.net-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 14px; margin-top: 16px;
  border-radius: 4px;
  font-family: var(--k-font-sans);
}
/* Antes el fondo y el texto del valor usaban el MISMO verde/rojo sólido —
   texto invisible. Reutiliza el mismo tinte que ya usa BudgetAlertBox.vue
   para ok/critical en vez de un fondo sólido. */
.net-row.positive {
  background: var(--k-alert-ok-bg);
  border: 1px solid var(--k-alert-ok-border);
}
.net-row.negative {
  background: var(--k-alert-critical-bg);
  border: 1px solid var(--k-alert-critical-border);
}
.net-label {
  font-size: var(--k-font-size-caption); letter-spacing: 0.1em; text-transform: uppercase;
  font-weight: 600;
}
.net-row.positive .net-label { color: var(--k-alert-ok-text); }
.net-row.negative .net-label { color: var(--k-alert-critical-text); }
.net-value {
  font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums;
}
.net-row.positive .net-value { color: var(--k-alert-ok-text); }
.net-row.negative .net-value { color: var(--k-alert-critical-text); }

:deep(.pb-bg) { background: #1c1c1c; height: 6px; } /* sin token exacto */
:deep(.pb-fill) { height: 100% !important; }
</style>
