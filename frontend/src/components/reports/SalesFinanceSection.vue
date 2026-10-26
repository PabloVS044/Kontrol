<template>
  <div id="sales" class="section-block sales-finance">
    <div class="section-header sf-header">
      <span class="section-title">{{ $t('reports.sales.title') }}</span>
      <div class="sf-controls">
        <select v-model="selectedProjectId" class="sf-select">
          <option value="">{{ $t('reports.sales.allProjects') }}</option>
          <option v-for="p in projects" :key="p.id_proyecto" :value="p.id_proyecto">{{ p.nombre }}</option>
        </select>
        <div class="sf-presets">
          <button
            v-for="p in presets"
            :key="p.key"
            class="sf-preset"
            :class="{ active: preset === p.key }"
            :aria-pressed="preset === p.key"
            @click="preset = p.key"
          >{{ p.label }}</button>
        </div>
      </div>
    </div>

    <!-- Rango personalizado -->
    <div v-if="preset === 'custom'" class="sf-custom-range">
      <label>{{ $t('reports.sales.from') }} <input v-model="customDesde" type="date" /></label>
      <label>{{ $t('reports.sales.to') }} <input v-model="customHasta" type="date" /></label>
    </div>

    <div v-if="error" class="sf-state sf-state--error">{{ error }}</div>

    <template v-else>
      <!-- KPIs -->
      <div class="sf-kpi-grid">
        <div class="sf-kpi">
          <span class="sf-kpi-label">{{ $t('reports.sales.kpi.grossIncome') }}</span>
          <span class="sf-kpi-value">{{ loading ? '—' : money(resumen.ingreso_bruto) }}</span>
        </div>
        <div class="sf-kpi">
          <span class="sf-kpi-label">{{ $t('reports.sales.kpi.cogs') }}</span>
          <span class="sf-kpi-value">{{ loading ? '—' : money(resumen.costo_ventas) }}</span>
        </div>
        <div class="sf-kpi">
          <span class="sf-kpi-label">{{ $t('reports.sales.kpi.grossProfit') }}</span>
          <span class="sf-kpi-value">{{ loading ? '—' : money(resumen.ganancia_bruta) }}</span>
        </div>
        <div class="sf-kpi">
          <span class="sf-kpi-label">{{ $t('reports.sales.kpi.adminExpenses') }}</span>
          <span class="sf-kpi-value">{{ loading ? '—' : money(resumen.gastos_admin) }}</span>
        </div>
        <div class="sf-kpi sf-kpi--accent">
          <span class="sf-kpi-label">{{ $t('reports.sales.kpi.netProfit') }}</span>
          <span class="sf-kpi-value" :class="resumen.ganancia_neta < 0 ? 'neg' : 'pos'">
            {{ loading ? '—' : money(resumen.ganancia_neta) }}
          </span>
        </div>
        <div class="sf-kpi">
          <span class="sf-kpi-label">{{ $t('reports.sales.kpi.unitsSold') }}</span>
          <span class="sf-kpi-value">{{ loading ? '—' : resumen.unidades_vendidas }}</span>
        </div>
        <div class="sf-kpi">
          <span class="sf-kpi-label">{{ $t('reports.sales.kpi.purchases') }}</span>
          <span class="sf-kpi-value">{{ loading ? '—' : money(resumen.compras) }}</span>
        </div>
        <div class="sf-kpi">
          <span class="sf-kpi-label">{{ $t('reports.sales.kpi.avgTicket') }}</span>
          <span class="sf-kpi-value">{{ loading ? '—' : money(resumen.ticket_promedio) }}</span>
        </div>
      </div>

      <!-- Gráfico ingreso vs ganancia en el tiempo -->
      <div class="sf-chart-block">
        <div class="sf-chart-legend">
          <span class="leg"><span class="leg-dot gold"></span>{{ $t('reports.sales.legendIncome') }}</span>
          <span class="leg"><span class="leg-dot green"></span>{{ $t('reports.sales.legendProfit') }}</span>
        </div>
        <div v-if="loading" class="sf-state">{{ $t('reports.sales.loading') }}</div>
        <div v-else-if="!serie.length" class="sf-state">{{ $t('reports.sales.noData') }}</div>
        <svg v-else class="sf-svg" viewBox="0 0 600 180" preserveAspectRatio="none">
          <line v-for="g in 4" :key="g" x1="0" :y1="g * 36" x2="600" :y2="g * 36" stroke="var(--k-shade-4)" stroke-width="1" />
          <path :d="areaPath('ingreso')" fill="url(#sfIncomeGrad)" />
          <path :d="linePath('ingreso')" fill="none" stroke="var(--k-color-primary)" stroke-width="2" />
          <path :d="linePath('ganancia')" fill="none" stroke="var(--k-hue-emerald)" stroke-width="1.6" stroke-dasharray="5 3" />
          <defs>
            <linearGradient id="sfIncomeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--k-color-primary)" stop-opacity="0.25" />
              <stop offset="100%" stop-color="var(--k-color-primary)" stop-opacity="0" />
            </linearGradient>
          </defs>
        </svg>
        <div v-if="!loading && serie.length" class="sf-x-axis">
          <span v-for="(pt, i) in chartPoints" :key="i">{{ pt.label }}</span>
        </div>
      </div>

      <!-- Top productos -->
      <div v-if="!loading && topProductos.length" class="sf-top">
        <span class="sf-top-title">{{ $t('reports.sales.topProducts') }}</span>
        <div v-for="tp in topProductos" :key="tp.id_producto" class="sf-top-row">
          <span class="sf-top-name">{{ tp.nombre }}</span>
          <span class="sf-top-units">{{ $t('reports.sales.unitsShort', { count: tp.unidades }) }}</span>
          <span class="sf-top-income">{{ money(tp.ingreso) }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { apiFetch as requestApi, authHeaders } from '@/services/api.js'
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSaleConfigStore } from '../../stores/saleConfig'

const { t } = useI18n()
const saleConfigStore = useSaleConfigStore()

defineProps({
  projects: { type: Array, default: () => [] },
})

const selectedProjectId = ref('')
const preset = ref('mes')
const customDesde = ref('')
const customHasta = ref('')

const loading = ref(false)
const error = ref(null)
const resumen = ref({
  ingreso_bruto: 0, costo_ventas: 0, ganancia_bruta: 0,
  gastos_admin: 0, compras: 0, ganancia_neta: 0,
  unidades_vendidas: 0, operaciones_venta: 0, ticket_promedio: 0,
})
const serie = ref([])
const topProductos = ref([])

const presets = computed(() => [
  { key: 'dia',    label: t('reports.sales.presets.day') },
  { key: 'semana', label: t('reports.sales.presets.week') },
  { key: 'mes',    label: t('reports.sales.presets.month') },
  { key: 'custom', label: t('reports.sales.presets.custom') },
])

// ── Date range + bucket derived from the active preset ──────────────────────
function fmt(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

const range = computed(() => {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)

  if (preset.value === 'dia') {
    return { desde: fmt(start), hasta: fmt(now), bucket: 'hour' }
  }
  if (preset.value === 'semana') {
    start.setDate(start.getDate() - 6)
    return { desde: fmt(start), hasta: fmt(now), bucket: 'day' }
  }
  if (preset.value === 'custom') {
    if (!customDesde.value || !customHasta.value) return null
    const d = new Date(customDesde.value); d.setHours(0, 0, 0, 0)
    const h = new Date(customHasta.value); h.setHours(23, 59, 59, 0)
    const days = (h - d) / 86400000
    const bucket = days <= 2 ? 'hour' : days <= 62 ? 'day' : days <= 365 ? 'week' : 'month'
    return { desde: fmt(d), hasta: fmt(h), bucket }
  }
  // default: mes (últimos 30 días)
  start.setDate(start.getDate() - 29)
  return { desde: fmt(start), hasta: fmt(now), bucket: 'day' }
})

async function load() {
  const r = range.value
  if (!r) return
  loading.value = true
  error.value = null
  try {
    // El rango se construye con la hora local del navegador y la columna
    // `fecha` guarda hora UTC. Sin mandar la zona, el backend compara relojes
    // distintos y las ventas del día no entran en el informe hasta pasado el
    // desfase horario (seis horas en Guatemala).
    const params = new URLSearchParams({
      desde: r.desde,
      hasta: r.hasta,
      bucket: r.bucket,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    })
    if (selectedProjectId.value) params.set('projectId', selectedProjectId.value)
    const res = await requestApi(`/api/inventory-movements/stats?${params}`, { headers: authHeaders() })
    if (!res.ok) throw new Error(`Error ${res.status}`)
    const json = await res.json()
    resumen.value = json.data.resumen
    serie.value = json.data.serie
    topProductos.value = json.data.top_productos
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

watch([selectedProjectId, preset, customDesde, customHasta], load)
onMounted(load)

// ── Money + chart helpers ───────────────────────────────────────────────────
// El símbolo ya no va fijo: sale de la moneda configurada por la empresa.
function money(n) {
  return saleConfigStore.money(n)
}

const chartPoints = computed(() => {
  const pts = serie.value
  if (!pts.length) return []
  const max = Math.max(...pts.map((p) => p.ingreso), 1)
  const n = pts.length
  return pts.map((p, i) => ({
    x: n === 1 ? 300 : Math.round((i / (n - 1)) * 600),
    ingreso: 175 - (p.ingreso / max) * 170,
    ganancia: 175 - (Math.max(p.ganancia, 0) / max) * 170,
    label: labelFor(p.periodo),
  }))
})

function labelFor(periodo) {
  const d = new Date(periodo)
  if (range.value?.bucket === 'hour') return String(d.getHours()).padStart(2, '0') + 'h'
  if (range.value?.bucket === 'month') return d.toLocaleDateString(undefined, { month: 'short' })
  return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })
}

function linePath(key) {
  return chartPoints.value.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p[key]}`).join(' ')
}

function areaPath(key) {
  const pts = chartPoints.value
  if (!pts.length) return ''
  return `${linePath(key)} L${pts[pts.length - 1].x},180 L${pts[0].x},180 Z`
}
</script>

<style scoped>
.sales-finance { display: flex; flex-direction: column; gap: 18px; }
.sf-header { flex-wrap: wrap; gap: 12px; }
.sf-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.sf-select {
  background: var(--k-shade-1); border: 1px solid var(--k-shade-7); color: var(--k-text-soft);
  font-family: 'Manrope', sans-serif; font-size: 12px; padding: 6px 10px; outline: none;
}
.sf-select option { background: var(--k-shade-3); }

.sf-presets { display: flex; gap: 4px; }
.sf-preset {
  background: var(--k-shade-1); border: 1px solid var(--k-shade-7); color: var(--k-text-muted);
  font-family: 'Manrope', sans-serif; font-size: 11px; font-weight: 600;
  padding: 6px 12px; cursor: pointer; transition: color .15s, border-color .15s, background .15s;
}
.sf-preset:hover { color: var(--k-text-soft); }
.sf-preset.active { color: var(--k-color-primary); border-color: var(--k-color-primary); background: var(--k-surface-primary-tint-2); box-shadow: var(--k-state-selected-indicator); }

.sf-custom-range { display: flex; gap: 16px; flex-wrap: wrap; }
.sf-custom-range label {
  display: flex; align-items: center; gap: 8px;
  font-family: 'Manrope', sans-serif; font-size: 11px; color: var(--k-text-dim);
}
.sf-custom-range input {
  background: var(--k-shade-1); border: 1px solid var(--k-shade-7); color: var(--k-text-soft);
  font-family: 'Manrope', sans-serif; font-size: 12px; padding: 6px 8px; outline: none;
}

.sf-kpi-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
}
.sf-kpi {
  display: flex; flex-direction: column; gap: 6px;
  padding: 14px; background: var(--k-shade-1); border: 1px solid var(--k-shade-5);
}
.sf-kpi--accent { border-color: rgba(var(--k-color-primary-rgb), 0.35); }
.sf-kpi-label {
  font-family: 'Manrope', sans-serif; font-size: 11px; font-weight: 700;
  color: var(--k-text-faint); letter-spacing: 0.06em; text-transform: uppercase;
}
.sf-kpi-value {
  font-family: 'Playfair Display', serif; font-size: 1.4rem; color: var(--k-color-text); line-height: 1.1; font-variant-numeric: tabular-nums;
}
.sf-kpi-value.pos { color: var(--k-hue-emerald); }
.sf-kpi-value.neg { color: var(--k-hue-rose); }

.sf-chart-block { display: flex; flex-direction: column; gap: 8px; }
.sf-chart-legend { display: flex; gap: 16px; }
.leg { display: flex; align-items: center; gap: 6px; font-family: 'Manrope', sans-serif; font-size: 11px; color: var(--k-text-dim); }
.leg-dot { width: 8px; height: 8px; border-radius: 50%; }
.leg-dot.gold { background: var(--k-color-primary); }
.leg-dot.green { background: var(--k-hue-emerald); }
.sf-svg { width: 100%; height: 180px; display: block; }
.sf-x-axis { display: flex; justify-content: space-between; }
.sf-x-axis span { font-family: 'Manrope', sans-serif; font-size: 11px; color: var(--k-text-faint); }

.sf-state { padding: 24px 0; color: var(--k-text-dim); font-family: 'Manrope', sans-serif; font-size: 12px; text-align: center; }
.sf-state--error { color: var(--k-hue-rose); }

.sf-top { display: flex; flex-direction: column; gap: 6px; }
.sf-top-title {
  font-family: 'Manrope', sans-serif; font-size: 11px; font-weight: 700;
  color: var(--k-text-faint); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px;
}
.sf-top-row {
  display: grid; grid-template-columns: 1fr auto auto; gap: 12px; align-items: center;
  padding: 8px 0; border-bottom: 1px solid var(--k-shade-3b);
}
.sf-top-name { font-family: 'Manrope', sans-serif; font-size: 12px; color: var(--k-text-soft); }
.sf-top-units { font-family: 'Manrope', sans-serif; font-size: 11px; color: var(--k-text-dim); }
.sf-top-income { font-family: 'Playfair Display', serif; font-size: 14px; color: var(--k-color-primary); }

@media (max-width: 900px) {
  .sf-kpi-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
