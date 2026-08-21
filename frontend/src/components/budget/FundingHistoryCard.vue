<template>
  <section class="fh-card">
    <header class="fh-head" @click="open = !open" :class="{ open }">
      <div>
        <h3 class="section-subtitle">{{ $t('budget.fundingHistory.title') }}</h3>
        <p class="fh-meta">
          Base ${{ formatMoney(presupuestoBase) }}
          <template v-if="totalAjustes !== 0">
            <span :class="totalAjustes < 0 ? 'danger' : 'income'">
              {{ totalAjustes < 0 ? '−' : '+' }}${{ formatMoney(Math.abs(totalAjustes)) }} {{ $t('budget.fundingHistory.adjustments') }}
            </span>
          </template>
          <span v-else class="muted">{{ $t('budget.fundingHistory.noAdjustments') }}</span>
        </p>
      </div>
      <svg class="chev" :class="{ open }" width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M3 5l4 4 4-4" stroke="var(--k-gray-5)" stroke-width="1.4" stroke-linecap="square"/>
      </svg>
    </header>

    <div v-if="open" class="fh-body">
      <div v-if="loading" class="fh-empty">{{ $t('budget.fundingHistory.loading') }}</div>
      <div v-else-if="!history.length" class="fh-empty">{{ $t('budget.fundingHistory.empty') }}</div>
      <ul v-else class="fh-list">
        <li v-for="row in history" :key="row.id_ajuste" class="fh-item">
          <div class="fh-item-top">
            <span :class="row.monto < 0 ? 'danger' : 'income'" class="fh-amount">
              {{ row.monto < 0 ? '−' : '+' }}${{ formatMoney(Math.abs(row.monto)) }}
            </span>
            <span class="fh-date">{{ formatDate(row.fecha) }}</span>
          </div>
          <p v-if="row.motivo" class="fh-motivo">{{ row.motivo }}</p>
          <span v-if="row.usuario" class="fh-user">{{ $t('budget.fundingHistory.by', { user: row.usuario }) }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps({
  history:         { type: Array, default: () => [] },
  presupuestoBase: { type: Number, default: 0 },
  totalAjustes:    { type: Number, default: 0 },
  loading:         { type: Boolean, default: false },
})

const open = ref(false)

function formatMoney(v) {
  const n = Number(v || 0)
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function formatDate(v) {
  if (!v) return ''
  try {
    return new Date(v).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return v }
}
</script>

<style scoped>
.fh-card {
  background: var(--k-shade-1);
  border: 1px solid var(--k-shade-7);
  margin-bottom: 16px;
}
.fh-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 18px; cursor: pointer;
  transition: background 0.15s;
}
.fh-head:hover { background: var(--k-shade-3); }

.section-subtitle {
  letter-spacing: 0.15em; font-size: var(--k-font-size-caption); color: var(--k-color-primary);
  font-weight: 600; margin: 0 0 4px; text-transform: uppercase;
}
.fh-meta {
  font-size: var(--k-font-size-caption); color: var(--k-gray-5); margin: 0;
  font-family: var(--k-font-sans);
}
.muted { color: var(--k-gray-3); }
.income { color: var(--k-state-success-text); font-weight: 600; }
.danger { color: var(--k-state-error-text); font-weight: 600; }

.chev { transition: transform 0.2s; flex-shrink: 0; }
.chev.open { transform: rotate(180deg); }

.fh-body {
  padding: 0 18px 16px;
  border-top: 1px solid var(--k-shade-6);
}
.fh-empty {
  font-size: var(--k-font-size-caption-lg); color: var(--k-gray-5); padding: 14px 0;
  text-align: center; font-family: var(--k-font-sans);
}

.fh-list { list-style: none; padding: 0; margin: 12px 0 0; }
.fh-item {
  padding: 10px 0;
  border-bottom: 1px solid #161616; /* sin token exacto en la rampa de shades */
  font-family: var(--k-font-sans);
}
.fh-item:last-child { border-bottom: none; }
.fh-item-top {
  display: flex; justify-content: space-between; align-items: baseline;
}
.fh-amount {
  font-size: var(--k-font-size-body-main); font-variant-numeric: tabular-nums;
}
.fh-date { font-size: var(--k-font-size-caption); color: var(--k-gray-5); }
.fh-motivo {
  font-size: var(--k-font-size-caption-lg); color: #d4d4d4; margin: 4px 0 0; /* sin token exacto */
  line-height: 1.4;
}
.fh-user { font-size: var(--k-font-size-caption); color: var(--k-gray-4); }
</style>
