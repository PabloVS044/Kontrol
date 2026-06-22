<template>
  <section class="pf-card">
    <div class="pf-header">
      <h2 class="section-subtitle">{{ title }}</h2>
      <span class="pf-count" v-if="products.length">
        {{ $t('budget.productTable.count', { count: products.length }) }}
      </span>
    </div>
    <p class="hint">{{ hintText }}</p>

    <div v-if="loading" class="pf-empty">{{ $t('budget.productTable.loading') }}</div>
    <div v-else-if="!products.length" class="pf-empty">
      {{ $t('budget.productTable.empty') }}
    </div>

    <template v-else>
      <div class="pf-totals" :class="{ compact: !hasSales }">
        <div class="pf-total-cell">
          <span class="pf-total-label">{{ $t('budget.productTable.totalInvested') }}</span>
          <span class="pf-total-value">${{ formatMoney(totals.total_invertido) }}</span>
        </div>
        <template v-if="hasSales">
          <div class="pf-total-cell">
            <span class="pf-total-label">{{ $t('budget.productTable.totalSold') }}</span>
            <span class="pf-total-value income">${{ formatMoney(totals.total_vendido) }}</span>
          </div>
          <div class="pf-total-cell">
            <span class="pf-total-label">{{ $t('budget.productTable.totalGrossProfit') }}</span>
            <span class="pf-total-value" :class="totals.utilidad_bruta < 0 ? 'danger' : 'income'">
              {{ totals.utilidad_bruta < 0 ? '-' : '' }}${{ formatMoney(Math.abs(totals.utilidad_bruta || 0)) }}
            </span>
          </div>
          <div class="pf-total-cell">
            <span class="pf-total-label">{{ $t('budget.productTable.totalMargin') }}</span>
            <span class="pf-total-value" :class="totals.margen_pct < 0 ? 'danger' : 'gold'">
              {{ totals.margen_pct }}%
            </span>
          </div>
        </template>
        <template v-else>
          <div class="pf-total-cell">
            <span class="pf-total-label">{{ $t('budget.productTable.totalUnitsBought') }}</span>
            <span class="pf-total-value">{{ totalUnitsBought }}</span>
          </div>
          <div class="pf-total-cell">
            <span class="pf-total-label">{{ $t('budget.productTable.totalUnitsUsed') }}</span>
            <span class="pf-total-value">{{ totalUnitsUsed }}</span>
          </div>
        </template>
      </div>

      <div class="pf-table-wrap">
        <table class="pf-table">
          <thead>
            <tr v-if="hasSales">
              <th class="left">{{ $t('budget.productTable.colProduct') }}</th>
              <th>{{ $t('budget.productTable.colStock') }}</th>
              <th>{{ $t('budget.productTable.colBought') }}</th>
              <th>{{ $t('budget.productTable.colSold') }}</th>
              <th>{{ $t('budget.productTable.colInvested') }}</th>
              <th>{{ $t('budget.productTable.colRevenue') }}</th>
              <th>{{ $t('budget.productTable.colProfit') }}</th>
              <th>{{ $t('budget.productTable.colMargin') }}</th>
            </tr>
            <tr v-else>
              <th class="left">{{ $t('budget.productTable.colProduct') }}</th>
              <th>{{ $t('budget.productTable.colStock') }}</th>
              <th>{{ $t('budget.productTable.colBought') }}</th>
              <th>{{ $t('budget.productTable.colUsed') }}</th>
              <th>{{ $t('budget.productTable.colInvested') }}</th>
              <th>{{ $t('budget.productTable.colAvgCost') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in products" :key="p.id_producto">
              <td class="left name">{{ p.nombre }}</td>
              <td class="num">{{ p.stock_actual }}</td>
              <td class="num">{{ p.unidades_compradas }}</td>
              <td class="num">{{ p.unidades_vendidas }}</td>
              <td class="num">${{ formatMoney(p.total_invertido) }}</td>
              <template v-if="hasSales">
                <td class="num income">${{ formatMoney(p.total_vendido) }}</td>
                <td class="num" :class="p.utilidad_bruta < 0 ? 'danger' : 'income'">
                  {{ p.utilidad_bruta < 0 ? '-' : '' }}${{ formatMoney(Math.abs(p.utilidad_bruta)) }}
                </td>
                <td class="num" :class="p.margen_pct < 0 ? 'danger' : 'gold'">
                  {{ p.margen_pct }}%
                </td>
              </template>
              <template v-else>
                <td class="num">${{ formatMoney(p.costo_promedio_ponderado) }}</td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  products: { type: Array, default: () => [] },
  totals:   { type: Object, default: () => ({}) },
  loading:  { type: Boolean, default: false },
})

const hasSales = computed(() => Number(props.totals?.total_vendido || 0) > 0)

const title = computed(() =>
  hasSales.value ? t('budget.productTable.titleFinancials') : t('budget.productTable.titleConsumption')
)

const hintText = computed(() =>
  hasSales.value ? t('budget.productTable.hintFinancials') : t('budget.productTable.hintConsumption')
)

const totalUnitsBought = computed(() =>
  props.products.reduce((sum, p) => sum + Number(p.unidades_compradas || 0), 0)
)
const totalUnitsUsed = computed(() =>
  props.products.reduce((sum, p) => sum + Number(p.unidades_vendidas || 0), 0)
)

function formatMoney(v) {
  const n = Number(v || 0)
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.pf-card {
  background: #0c0c0c;
  border: 1px solid #2a2a2a;
  padding: 24px;
  margin-bottom: 24px;
}

.pf-header {
  display: flex; justify-content: space-between; align-items: center;
  gap: 12px; margin-bottom: 8px;
}
.section-subtitle {
  letter-spacing: 0.15em; font-size: 11px; color: var(--Primary);
  font-weight: 600; text-transform: uppercase;
}
.pf-count { font-size: 11px; color: var(--TextMuted); }
.hint {
  font-size: 11px; color: var(--TextMuted); line-height: 1.5; margin-bottom: 16px;
  font-family: 'Manrope', sans-serif;
}

.pf-empty {
  color: var(--TextMuted); font-size: 13px; padding: 24px;
  text-align: center; border: 1px dashed #2a2a2a;
}

.pf-totals {
  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px; margin-bottom: 16px;
  padding: 14px; background: #000000;
  border: 1px solid #1f1f1f;
}
.pf-totals.compact { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.pf-total-cell {
  display: flex; flex-direction: column; gap: 4px; min-width: 0;
}
.pf-total-label {
  font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--TextMuted);
}
.pf-total-value {
  font-size: 16px; font-weight: 700; color: var(--Text);
  font-variant-numeric: tabular-nums;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.pf-table-wrap { overflow-x: auto; }

.pf-table {
  width: 100%; border-collapse: collapse;
  font-family: 'Manrope', sans-serif; font-size: 12px;
}
.pf-table th {
  text-align: right; padding: 10px 12px;
  font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--TextMuted); border-bottom: 1px solid #1f1f1f;
  font-weight: 600;
  white-space: nowrap;
}
.pf-table th.left { text-align: left; }
.pf-table td {
  padding: 12px;
  color: var(--TextSoft);
  border-bottom: 1px solid #161616;
  font-variant-numeric: tabular-nums;
}
.pf-table td.left  { text-align: left; }
.pf-table td.num   { text-align: right; white-space: nowrap; }
.pf-table td.name {
  color: var(--Text); font-weight: 500;
  max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.pf-table tbody tr:hover { background: #111111; }
.pf-table tbody tr:last-child td { border-bottom: none; }

.income { color: #34d399; }
.danger { color: #fb7185; }
.gold   { color: var(--Primary); }

@media (max-width: 800px) {
  .pf-totals,
  .pf-totals.compact { grid-template-columns: repeat(2, 1fr); }
}
</style>
