<template>
  <div class="sh-root">
    <AppNavbar />

    <main class="sh-content">
      <RouterLink class="sh-back" :to="{ name: 'sales' }">
        <span aria-hidden="true">←</span> {{ $t('sales.title') }}
      </RouterLink>

      <header class="sh-header">
        <h1 class="sh-title">{{ $t('salesHistory.title') }}</h1>
        <p class="sh-subtitle">{{ $t('salesHistory.subtitle') }}</p>
      </header>

      <div class="sh-toolbar">
        <div class="sh-field">
          <span class="sh-label">{{ $t('salesHistory.range') }}</span>
          <div class="sh-seg" role="group" :aria-label="$t('salesHistory.range')">
            <button
              v-for="option in RANGE_PRESETS"
              :key="option"
              type="button"
              class="sh-seg-btn"
              :class="{ active: preset === option }"
              :aria-pressed="preset === option"
              @click="preset = option"
            >{{ $t(`salesHistory.presets.${option}`) }}</button>
          </div>
        </div>

        <template v-if="preset === 'custom'">
          <label class="sh-field">
            <span class="sh-label">{{ $t('salesHistory.from') }}</span>
            <input v-model="customFrom" class="sh-input" type="date" :max="customTo || today" />
          </label>
          <label class="sh-field">
            <span class="sh-label">{{ $t('salesHistory.to') }}</span>
            <input v-model="customTo" class="sh-input" type="date" :min="customFrom" :max="today" />
          </label>
        </template>

        <label class="sh-field">
          <span class="sh-label">{{ $t('inventoryTable.project') }}</span>
          <select v-model="projectId" class="sh-select">
            <option :value="null">{{ $t('inventoryTable.allProjects') }}</option>
            <option v-for="p in projects" :key="p.id_proyecto" :value="p.id_proyecto">{{ p.nombre }}</option>
          </select>
        </label>
      </div>

      <p v-if="!range" class="sh-state sh-state--err" role="alert">{{ $t('salesHistory.invalidRange') }}</p>

      <template v-else>
        <p class="sh-range" aria-live="polite">{{ rangeLabel }}</p>

        <section class="sh-kpis" :aria-label="$t('salesHistory.summaryLabel')">
          <div class="sh-kpi sh-kpi--main">
            <span class="sh-kpi-label">{{ $t('salesHistory.kpis.income') }}</span>
            <span class="sh-kpi-value">{{ money(resumen.cobrado_total) }}</span>
            <span class="sh-kpi-note">
              {{ $t('salesHistory.kpis.incomeNote', { vat: money(resumen.iva), discounts: money(resumen.descuentos) }) }}
            </span>
          </div>
          <div class="sh-kpi sh-kpi--main sh-kpi--profit" :class="{ 'is-loss': resumen.utilidad < 0 }">
            <span class="sh-kpi-label">{{ $t('salesHistory.kpis.profit') }}</span>
            <span class="sh-kpi-value">{{ money(resumen.utilidad) }}</span>
            <span class="sh-kpi-note">
              {{ $t('salesHistory.kpis.profitNote', { net: money(resumen.ingreso_neto), cost: money(resumen.costo_ventas) }) }}
            </span>
          </div>
          <div class="sh-kpi">
            <span class="sh-kpi-label">{{ $t('salesHistory.kpis.sales') }}</span>
            <span class="sh-kpi-value">{{ resumen.ventas }}</span>
          </div>
          <div class="sh-kpi">
            <span class="sh-kpi-label">{{ $t('salesHistory.kpis.average') }}</span>
            <span class="sh-kpi-value">{{ money(resumen.ticket_promedio) }}</span>
          </div>
          <div class="sh-kpi">
            <span class="sh-kpi-label">{{ $t('salesHistory.kpis.units') }}</span>
            <span class="sh-kpi-value">{{ resumen.unidades }}</span>
          </div>
        </section>

        <p v-if="loading" class="sh-state">{{ $t('salesHistory.loading') }}</p>

        <div v-else-if="error" class="sh-state sh-state--err" role="alert">
          <span>{{ $t('salesHistory.loadError') }}</span>
          <button type="button" class="sh-retry" @click="load">{{ $t('inventoryTable.retry') }}</button>
        </div>

        <p v-else-if="!ventas.length" class="sh-state">{{ $t('salesHistory.empty') }}</p>

        <template v-else>
          <p v-if="truncado" class="sh-note">{{ $t('salesHistory.truncated', { count: ventas.length }) }}</p>

          <table class="sh-table">
            <thead>
              <tr>
                <th scope="col">{{ $t('salesHistory.columns.date') }}</th>
                <th scope="col">{{ $t('salesHistory.columns.seller') }}</th>
                <th scope="col">{{ $t('salesHistory.columns.project') }}</th>
                <th scope="col" class="num">{{ $t('salesHistory.columns.units') }}</th>
                <th scope="col" class="num">{{ $t('salesHistory.columns.total') }}</th>
                <th scope="col"><span class="sr-only">{{ $t('salesHistory.columns.details') }}</span></th>
              </tr>
            </thead>
            <tbody v-for="venta in ventas" :key="venta.clave" class="sh-sale" :class="{ open: isOpen(venta) }">
              <tr class="sh-row">
                <td :data-label="$t('salesHistory.columns.date')">{{ formatDate(venta.fecha) }}</td>
                <td :data-label="$t('salesHistory.columns.seller')">{{ venta.vendedor || '—' }}</td>
                <td :data-label="$t('salesHistory.columns.project')">{{ venta.proyectos.join(', ') }}</td>
                <td :data-label="$t('salesHistory.columns.units')" class="num">{{ venta.unidades }}</td>
                <td :data-label="$t('salesHistory.columns.total')" class="num sh-total">{{ money(venta.total) }}</td>
                <td class="sh-toggle-cell">
                  <button
                    type="button"
                    class="sh-toggle"
                    :aria-expanded="isOpen(venta)"
                    :aria-controls="`sale-${venta.clave}`"
                    @click="toggle(venta)"
                  >
                    {{ isOpen(venta) ? $t('salesHistory.hideDetails') : $t('salesHistory.showDetails') }}
                    <span class="sh-chevron" aria-hidden="true">▾</span>
                  </button>
                </td>
              </tr>
              <tr v-if="isOpen(venta)" :id="`sale-${venta.clave}`" class="sh-detail-row">
                <td colspan="6">
                  <table class="sh-lines">
                    <thead>
                      <tr>
                        <th scope="col">{{ $t('salesHistory.lines.product') }}</th>
                        <th scope="col" class="num">{{ $t('salesHistory.lines.quantity') }}</th>
                        <th scope="col" class="num">{{ $t('salesHistory.lines.unitPrice') }}</th>
                        <th scope="col" class="num">{{ $t('salesHistory.lines.discount') }}</th>
                        <th scope="col" class="num">{{ $t('salesHistory.lines.vat') }}</th>
                        <th scope="col" class="num">{{ $t('salesHistory.lines.amount') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="linea in venta.lineas" :key="linea.id_movimiento">
                        <td :data-label="$t('salesHistory.lines.product')">
                          {{ linea.producto_nombre }}
                          <span v-if="venta.proyectos.length > 1" class="sh-line-project">{{ linea.proyecto_nombre }}</span>
                        </td>
                        <td :data-label="$t('salesHistory.lines.quantity')" class="num">{{ linea.cantidad }}</td>
                        <td :data-label="$t('salesHistory.lines.unitPrice')" class="num">{{ money(linea.precio_unitario) }}</td>
                        <td :data-label="$t('salesHistory.lines.discount')" class="num">{{ linea.descuento ? `−${money(linea.descuento)}` : '—' }}</td>
                        <td :data-label="$t('salesHistory.lines.vat')" class="num">{{ linea.iva ? money(linea.iva) : '—' }}</td>
                        <td :data-label="$t('salesHistory.lines.amount')" class="num">{{ money(linea.importe) }}</td>
                      </tr>
                    </tbody>
                  </table>
                  <dl class="sh-breakdown">
                    <div><dt>{{ $t('salesHistory.lines.subtotal') }}</dt><dd>{{ money(venta.subtotal) }}</dd></div>
                    <div v-if="venta.descuento"><dt>{{ $t('salesHistory.lines.discount') }}</dt><dd>−{{ money(venta.descuento) }}</dd></div>
                    <div v-if="venta.iva"><dt>{{ $t('salesHistory.lines.vat') }}</dt><dd>{{ money(venta.iva) }}</dd></div>
                    <div class="sh-breakdown-total"><dt>{{ $t('salesHistory.columns.total') }}</dt><dd>{{ money(venta.total) }}</dd></div>
                  </dl>
                </td>
              </tr>
            </tbody>
          </table>
        </template>

        <!-- Los gráficos y los más vendidos siguen en Reportes; aquí solo el detalle. -->
        <RouterLink class="sh-reports" :to="{ path: '/reports', hash: '#sales' }">
          {{ $t('salesHistory.toReports') }} →
        </RouterLink>
      </template>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import AppNavbar from '../components/AppNavbar.vue'
import { apiFetch as requestApi, authHeaders } from '@/services/api.js'
import { useSaleConfigStore } from '../stores/saleConfig'
import { useInventoryProjects } from '../composables/useInventoryProjects.js'
import { formatMoney } from '@/utils/currency.js'
import { RANGE_PRESETS, rangeFor, toDateInput } from '@/utils/dateRange.js'

const { locale } = useI18n()
const saleConfigStore = useSaleConfigStore()
const { projects, load: loadProjects } = useInventoryProjects()

const today = toDateInput(new Date())
const preset = ref('today')
const customFrom = ref(today)
const customTo = ref(today)
const projectId = ref(null)

const EMPTY = {
  ventas: 0, subtotal: 0, descuentos: 0, iva: 0, cobrado_total: 0,
  ingreso_neto: 0, costo_ventas: 0, utilidad: 0, unidades: 0, ticket_promedio: 0,
}
const resumen = ref({ ...EMPTY })
const ventas = ref([])
const truncado = ref(false)
const loading = ref(false)
const error = ref(false)
const expanded = ref(new Set())

const range = computed(() => rangeFor(preset.value, { from: customFrom.value, to: customTo.value }))

const dayFormat = computed(() => new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short', year: 'numeric' }))
const rangeLabel = computed(() => {
  const r = range.value
  if (!r) return ''
  const from = dayFormat.value.format(r.from)
  const to = dayFormat.value.format(r.to)
  return from === to ? from : `${from} – ${to}`
})

const money = (value) => formatMoney(Number(value), saleConfigStore.moneda)

function formatDate(iso) {
  const date = new Date(iso)
  // En "Hoy" la fecha sobra: basta la hora.
  const options = preset.value === 'today'
    ? { hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
  return date.toLocaleString(locale.value, options)
}

const isOpen = (venta) => expanded.value.has(venta.clave)

function toggle(venta) {
  const next = new Set(expanded.value)
  if (next.has(venta.clave)) next.delete(venta.clave)
  else next.add(venta.clave)
  expanded.value = next
}

// Una respuesta lenta de un rango anterior no debe pisar la del actual.
let requestId = 0

async function load() {
  const r = range.value
  if (!r) return
  const current = ++requestId
  loading.value = true
  error.value = false
  try {
    const params = new URLSearchParams({
      desde: r.desde,
      hasta: r.hasta,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    })
    if (projectId.value) params.set('projectId', projectId.value)
    const res = await requestApi(`/api/inventory-movements/sales?${params}`, { headers: authHeaders() })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const { data } = await res.json()
    if (current !== requestId) return
    resumen.value = data.resumen ?? { ...EMPTY }
    ventas.value = data.ventas ?? []
    truncado.value = Boolean(data.truncado)
    expanded.value = new Set()
  } catch {
    if (current !== requestId) return
    error.value = true
    resumen.value = { ...EMPTY }
    ventas.value = []
  } finally {
    if (current === requestId) loading.value = false
  }
}

watch([() => range.value?.desde, () => range.value?.hasta, projectId], load)

onMounted(() => {
  saleConfigStore.load()
  loadProjects()
  load()
})
</script>

<style scoped>
.sh-root { min-height: 100vh; color: var(--k-color-text); font-family: var(--k-font-sans); }
.sh-content { max-width: 1240px; margin: 56px auto 0; padding: var(--k-space-6) var(--k-space-6) var(--k-space-7); }

.sh-back {
  display: inline-flex;
  align-items: center;
  gap: var(--k-space-2);
  min-height: var(--k-target-min-size);
  color: var(--k-text-muted);
  font-size: var(--k-font-size-caption-lg);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-decoration: none;
}
.sh-back:hover { color: var(--k-color-primary); }

.sh-header { margin: var(--k-space-2) 0 var(--k-space-5); }
.sh-title {
  margin: 0 0 var(--k-space-2);
  font-family: var(--k-font-display);
  font-size: var(--k-font-size-display-2);
  font-weight: var(--k-font-weight-regular);
}
.sh-subtitle { margin: 0; color: var(--k-text-muted); font-size: var(--k-font-size-body-small); }

.sh-toolbar { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--k-space-4); margin-bottom: var(--k-space-3); }
.sh-field { display: flex; flex-direction: column; gap: var(--k-space-2); min-width: 0; }
.sh-label {
  font-size: var(--k-font-size-caption);
  color: var(--k-text-soft);
  letter-spacing: var(--k-tracking-caps);
  text-transform: uppercase;
}
.sh-select,
.sh-input {
  min-height: var(--k-target-min-size);
  padding: 0 var(--k-space-3);
  background: var(--k-form-input-bg);
  border: var(--k-border-width) solid var(--k-shade-7);
  color: var(--k-color-text);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-main);
  min-width: 0;
}
.sh-select { max-width: 260px; cursor: pointer; }
.sh-select option { background: var(--k-shade-2); color: var(--k-color-text); }
.sh-select:focus,
.sh-input:focus { outline: none; border-color: var(--k-color-primary); background: var(--k-form-input-focus-bg); }

.sh-seg {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 3px;
  background: var(--k-shade-2);
  border: var(--k-border-width) solid var(--k-shade-6);
}
.sh-seg-btn {
  min-height: calc(var(--k-target-min-size) - 8px);
  padding: 0 var(--k-space-3);
  background: transparent;
  border: none;
  color: var(--k-text-muted);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  cursor: pointer;
}
.sh-seg-btn:hover { color: var(--k-color-text); }
.sh-seg-btn.active { background: var(--k-color-primary); color: var(--k-form-btn-text); }

.sh-range { margin: 0 0 var(--k-space-4); color: var(--k-text-muted); font-size: var(--k-font-size-caption-lg); }

/* Ingresos y utilidad arriba, a lo ancho; ventas, ticket y unidades debajo. */
.sh-kpis {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--k-space-3);
  margin-bottom: var(--k-space-5);
}
.sh-kpi {
  display: flex;
  flex-direction: column;
  gap: var(--k-space-1);
  min-width: 0;
  padding: var(--k-space-4);
  background: var(--k-shade-3);
  border: var(--k-border-width) solid var(--k-shade-6);
}
.sh-kpi { grid-column: span 2; }
.sh-kpi--main { grid-column: span 3; border-color: var(--k-color-border); }
.sh-kpi-label {
  color: var(--k-text-soft);
  font-size: var(--k-font-size-caption);
  letter-spacing: var(--k-tracking-caps);
  text-transform: uppercase;
}
.sh-kpi-value {
  font-size: var(--k-font-size-heading-1);
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.sh-kpi--main .sh-kpi-value { color: var(--k-color-primary); font-size: var(--k-font-size-display-2); }
.sh-kpi--profit .sh-kpi-value { color: var(--k-state-success-text); }
.sh-kpi--profit.is-loss .sh-kpi-value { color: var(--k-state-error-text); }
.sh-kpi-note { color: var(--k-text-dim); font-size: var(--k-font-size-caption); }

.sh-state { padding: var(--k-space-6) 0; color: var(--k-text-muted); font-size: var(--k-font-size-body-small); }
.sh-state--err { display: flex; flex-wrap: wrap; align-items: center; gap: var(--k-space-3); color: var(--k-state-error-text); }
.sh-retry {
  min-height: var(--k-target-min-size);
  padding: 0 var(--k-space-4);
  background: none;
  border: var(--k-border-width) solid var(--k-shade-7);
  color: var(--k-color-text);
  font-family: var(--k-font-sans);
  cursor: pointer;
}
.sh-note { margin: 0 0 var(--k-space-3); color: var(--k-alert-watching-text); font-size: var(--k-font-size-caption-lg); }

.sh-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--k-shade-3);
  border: var(--k-border-width) solid var(--k-shade-6);
  font-size: var(--k-font-size-body-small);
}
.sh-table > thead th,
.sh-row > td {
  padding: var(--k-space-3) var(--k-space-4);
  border-bottom: var(--k-border-width) solid var(--k-shade-6);
  text-align: left;
  vertical-align: middle;
}
.sh-table > thead th {
  color: var(--k-text-soft);
  font-size: var(--k-font-size-caption);
  font-weight: var(--k-font-weight-semibold);
  letter-spacing: var(--k-tracking-caps);
  text-transform: uppercase;
  white-space: nowrap;
}
.sh-table .num { text-align: right; font-variant-numeric: tabular-nums; }
.sh-row:hover { background: var(--k-shade-4); }
.sh-total { font-weight: var(--k-font-weight-semibold); }
.sh-toggle-cell { text-align: right; width: 1%; white-space: nowrap; }

.sh-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--k-space-2);
  min-height: 32px;
  padding: 0 var(--k-space-3);
  background: none;
  border: var(--k-border-width) solid var(--k-shade-7);
  color: var(--k-text-soft);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  cursor: pointer;
}
.sh-toggle:hover { border-color: var(--k-color-primary); color: var(--k-color-text); }
.sh-chevron { transition: transform 0.15s; }
.sh-sale.open .sh-chevron { transform: rotate(180deg); }

.sh-detail-row > td {
  padding: var(--k-space-3) var(--k-space-4) var(--k-space-4);
  background: var(--k-shade-2);
  border-bottom: var(--k-border-width) solid var(--k-shade-6);
}
.sh-lines { width: 100%; border-collapse: collapse; font-size: var(--k-font-size-caption-lg); }
.sh-lines th,
.sh-lines td { padding: var(--k-space-2) var(--k-space-3); border-bottom: var(--k-border-width) solid var(--k-shade-5); text-align: left; }
.sh-lines th { color: var(--k-text-dim); font-weight: var(--k-font-weight-semibold); }
.sh-line-project { display: block; color: var(--k-text-dim); font-size: var(--k-font-size-caption); }

.sh-breakdown {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--k-space-1);
  margin: var(--k-space-3) 0 0;
  font-size: var(--k-font-size-caption-lg);
}
.sh-breakdown div { display: flex; gap: var(--k-space-4); }
.sh-breakdown dt { color: var(--k-text-muted); }
.sh-breakdown dd { margin: 0; min-width: 96px; text-align: right; font-variant-numeric: tabular-nums; }
.sh-breakdown-total { font-weight: var(--k-font-weight-semibold); color: var(--k-color-text); }

.sh-reports {
  display: inline-block;
  margin-top: var(--k-space-5);
  color: var(--k-color-primary);
  font-size: var(--k-font-size-caption-lg);
  text-decoration: none;
}
.sh-reports:hover { text-decoration: underline; }

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@media (max-width: 900px) {
  .sh-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .sh-kpi,
  .sh-kpi--main { grid-column: span 1; }
  .sh-kpi:last-child { grid-column: 1 / -1; }
}

@media (max-width: 480px) {
  .sh-kpis { grid-template-columns: minmax(0, 1fr); }
}

/* En un teléfono cada venta es una ficha y su detalle se abre debajo. */
@media (max-width: 720px) {
  .sh-content { padding: var(--k-space-5) var(--k-space-4) var(--k-space-6); }
  .sh-toolbar > .sh-field { flex: 1 1 100%; }
  .sh-select { max-width: none; }

  .sh-table,
  .sh-table > tbody,
  .sh-row,
  .sh-row > td,
  .sh-detail-row,
  .sh-detail-row > td { display: block; width: 100%; }
  .sh-table { background: none; border: none; }
  .sh-table > thead { display: none; }
  .sh-sale {
    display: block;
    margin-bottom: var(--k-space-3);
    background: var(--k-shade-3);
    border: var(--k-border-width) solid var(--k-shade-6);
  }
  .sh-row > td {
    display: flex;
    justify-content: space-between;
    gap: var(--k-space-3);
    padding: var(--k-space-2) var(--k-space-4);
    border-bottom: none;
    text-align: right;
  }
  .sh-row > td[data-label]::before {
    content: attr(data-label);
    flex-shrink: 0;
    color: var(--k-text-soft);
    font-size: var(--k-font-size-caption);
    letter-spacing: var(--k-tracking-caps);
    text-transform: uppercase;
    text-align: left;
  }
  .sh-toggle-cell { width: 100%; }
  .sh-toggle { width: 100%; justify-content: center; min-height: var(--k-target-min-size); }

  .sh-lines thead { display: none; }
  .sh-lines,
  .sh-lines tbody,
  .sh-lines tr,
  .sh-lines td { display: block; width: 100%; }
  .sh-lines tr { padding: var(--k-space-2) 0; border-bottom: var(--k-border-width) solid var(--k-shade-5); }
  .sh-lines td { display: flex; justify-content: space-between; gap: var(--k-space-3); padding: 2px 0; border: none; text-align: right; }
  .sh-lines td::before { content: attr(data-label); color: var(--k-text-dim); text-align: left; }
  .sh-breakdown { align-items: stretch; }
  .sh-breakdown div { justify-content: space-between; }
}
</style>
