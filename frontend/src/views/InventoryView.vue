<template>
  <div class="invt-root">
    <AppNavbar />

    <main class="invt-content">
      <header class="invt-header">
        <div>
          <h1 class="invt-title">{{ $t('inventory.header.title') }}</h1>
          <p class="invt-subtitle">{{ $t('inventoryTable.subtitle') }}</p>
        </div>
        <!-- Vender, dar de alta y mover stock viven en Ventas > Cobrar: aquí
             solo se consulta, para no tener dos pantallas que hacen lo mismo. -->
        <RouterLink v-if="authStore.canSellInventory" class="invt-charge" :to="{ name: 'sales-charge' }">
          {{ $t('inventoryTable.goToCharge') }} →
        </RouterLink>
      </header>

      <div class="invt-toolbar">
        <label class="invt-field">
          <span class="invt-label">{{ $t('inventoryTable.project') }}</span>
          <select v-model="projectId" class="invt-select">
            <option :value="null">{{ $t('inventoryTable.allProjects') }}</option>
            <option v-for="p in projects" :key="p.id_proyecto" :value="p.id_proyecto">{{ p.nombre }}</option>
          </select>
        </label>

        <label class="invt-field invt-field--grow">
          <span class="invt-label">{{ $t('inventoryTable.search') }}</span>
          <input
            v-model.trim="search"
            class="invt-input"
            type="search"
            :placeholder="$t('inventoryTable.searchPlaceholder')"
          />
        </label>

        <div class="invt-field">
          <span class="invt-label">{{ $t('inventoryTable.stockFilter') }}</span>
          <div class="invt-seg" role="group" :aria-label="$t('inventoryTable.stockFilter')">
            <button
              v-for="option in STOCK_FILTERS"
              :key="option"
              type="button"
              class="invt-seg-btn"
              :class="{ active: stockFilter === option }"
              :aria-pressed="stockFilter === option"
              @click="stockFilter = option"
            >{{ $t(`inventoryTable.stockFilters.${option}`) }}</button>
          </div>
        </div>
      </div>

      <p v-if="!loading && !error" class="invt-summary">
        {{ $t('inventoryTable.summary', { count: products.length, low: lowCount, out: outCount }) }}
      </p>

      <p v-if="loading" class="invt-state">{{ $t('inventoryTable.loading') }}</p>

      <div v-else-if="error" class="invt-state invt-state--err" role="alert">
        <span>{{ $t('inventoryTable.loadError') }}</span>
        <button type="button" class="invt-retry" @click="loadProducts">{{ $t('inventoryTable.retry') }}</button>
      </div>

      <p v-else-if="!products.length" class="invt-state">{{ $t('inventoryTable.empty') }}</p>

      <p v-else-if="!rows.length" class="invt-state">{{ $t('inventoryTable.noMatches') }}</p>

      <table v-else class="invt-table">
        <thead>
          <tr>
            <th scope="col" :aria-sort="ariaSort('nombre')">
              <button type="button" class="invt-sort" @click="sortBy('nombre')">
                {{ $t('inventoryTable.columns.product') }} <span aria-hidden="true">{{ sortArrow('nombre') }}</span>
              </button>
            </th>
            <th scope="col">{{ $t('inventoryTable.columns.category') }}</th>
            <th v-if="!projectId" scope="col">{{ $t('inventoryTable.columns.project') }}</th>
            <th scope="col" class="num" :aria-sort="ariaSort('precio_venta')">
              <button type="button" class="invt-sort" @click="sortBy('precio_venta')">
                {{ $t('inventoryTable.columns.price') }} <span aria-hidden="true">{{ sortArrow('precio_venta') }}</span>
              </button>
            </th>
            <th scope="col" class="num">{{ $t('inventoryTable.columns.cost') }}</th>
            <th scope="col" class="num" :aria-sort="ariaSort('stock_actual')">
              <button type="button" class="invt-sort" @click="sortBy('stock_actual')">
                {{ $t('inventoryTable.columns.stock') }} <span aria-hidden="true">{{ sortArrow('stock_actual') }}</span>
              </button>
            </th>
            <th scope="col" class="num">{{ $t('inventoryTable.columns.minimum') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in rows" :key="p.id_producto">
            <td :data-label="$t('inventoryTable.columns.product')" class="invt-name-cell">
              <RouterLink class="invt-name" :to="detailLink(p)">{{ p.nombre }}</RouterLink>
              <span v-if="p.codigo_barras" class="invt-code">{{ p.codigo_barras }}</span>
            </td>
            <td :data-label="$t('inventoryTable.columns.category')">{{ p.categoria || '—' }}</td>
            <td v-if="!projectId" :data-label="$t('inventoryTable.columns.project')">{{ p.proyecto_nombre }}</td>
            <td :data-label="$t('inventoryTable.columns.price')" class="num">{{ money(p.precio_venta) }}</td>
            <td :data-label="$t('inventoryTable.columns.cost')" class="num">{{ money(p.precio_costo) }}</td>
            <td :data-label="$t('inventoryTable.columns.stock')" class="num">
              <span class="invt-stock" :class="`is-${stockTone(p)}`">
                {{ p.stock_actual }}
                <span v-if="stockTone(p) !== 'ok'" class="invt-badge">{{ stockLabel(p) }}</span>
              </span>
            </td>
            <td :data-label="$t('inventoryTable.columns.minimum')" class="num">{{ p.stock_minimo }}</td>
          </tr>
        </tbody>
      </table>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppNavbar from '../components/AppNavbar.vue'
import { apiFetch as requestApi, authHeaders } from '@/services/api.js'
import { useAuthStore } from '../stores/auth'
import { useSaleConfigStore } from '../stores/saleConfig'
import { useInventoryProjects } from '../composables/useInventoryProjects.js'
import { formatMoney } from '@/utils/currency.js'

const STOCK_FILTERS = ['all', 'low', 'out']

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const saleConfigStore = useSaleConfigStore()
const { projects, load: loadProjects } = useInventoryProjects()

// El proyecto vive en la URL: volver desde el detalle de un producto deja la
// tabla como estaba.
const initialProject = Number(route.query.project)
const projectId = ref(Number.isInteger(initialProject) && initialProject > 0 ? initialProject : null)
const search = ref('')
const stockFilter = ref('all')
const sortKey = ref('nombre')
const sortDir = ref('asc')

const products = ref([])
const loading = ref(true)
const error = ref(false)

async function loadProducts() {
  loading.value = true
  error.value = false
  try {
    const query = projectId.value ? `?projectId=${projectId.value}` : ''
    const res = await requestApi(`/api/products${query}`, { headers: authHeaders() })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    products.value = (await res.json()).data ?? []
  } catch {
    error.value = true
    products.value = []
  } finally {
    loading.value = false
  }
}

function stockTone(p) {
  const stock = Number(p.stock_actual)
  if (stock <= 0) return 'out'
  if (stock <= Number(p.stock_minimo)) return 'low'
  return 'ok'
}

function stockLabel(p) {
  return stockTone(p) === 'out' ? t('inventory.stock.outOfStock') : t('inventory.stock.lowStock')
}

const lowCount = computed(() => products.value.filter((p) => stockTone(p) === 'low').length)
const outCount = computed(() => products.value.filter((p) => stockTone(p) === 'out').length)

const rows = computed(() => {
  const q = search.value.toLocaleLowerCase(locale.value)
  const filtered = products.value.filter((p) => {
    if (stockFilter.value !== 'all' && stockTone(p) !== stockFilter.value) return false
    if (!q) return true
    return [p.nombre, p.codigo_barras, p.categoria]
      .some((value) => String(value ?? '').toLocaleLowerCase(locale.value).includes(q))
  })

  const dir = sortDir.value === 'asc' ? 1 : -1
  return filtered.sort((a, b) => {
    if (sortKey.value === 'nombre') return dir * String(a.nombre).localeCompare(String(b.nombre), locale.value)
    return dir * (Number(a[sortKey.value]) - Number(b[sortKey.value]))
  })
})

function sortBy(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

const sortArrow = (key) => (sortKey.value === key ? (sortDir.value === 'asc' ? '↑' : '↓') : '')
const ariaSort = (key) => (sortKey.value === key ? (sortDir.value === 'asc' ? 'ascending' : 'descending') : 'none')

const money = (value) => formatMoney(Number(value), saleConfigStore.moneda)

function detailLink(p) {
  return { name: 'inventory-detail', params: { id: p.id_producto }, query: { project: p.id_proyecto } }
}

watch(projectId, (id) => {
  router.replace({ query: id ? { project: id } : {} })
  loadProducts()
})

onMounted(() => {
  loadProjects()
  loadProducts()
})
</script>

<style scoped>
.invt-root { min-height: 100vh; color: var(--k-color-text); font-family: var(--k-font-sans); }
.invt-content { max-width: 1240px; margin: 56px auto 0; padding: var(--k-space-7) var(--k-space-6); }

.invt-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--k-space-4);
  margin-bottom: var(--k-space-5);
}
.invt-title {
  margin: 0 0 var(--k-space-2);
  font-family: var(--k-font-display);
  font-size: var(--k-font-size-display-2);
  font-weight: var(--k-font-weight-regular);
}
.invt-subtitle { margin: 0; color: var(--k-text-muted); font-size: var(--k-font-size-body-small); }
.invt-charge {
  color: var(--k-color-primary);
  font-size: var(--k-font-size-caption-lg);
  text-decoration: none;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.invt-charge:hover { text-decoration: underline; }

.invt-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--k-space-4);
  margin-bottom: var(--k-space-4);
}
.invt-field { display: flex; flex-direction: column; gap: var(--k-space-2); min-width: 0; }
.invt-field--grow { flex: 1 1 240px; }
.invt-label {
  font-size: var(--k-font-size-caption);
  color: var(--k-text-soft);
  letter-spacing: var(--k-tracking-caps);
  text-transform: uppercase;
}
.invt-select,
.invt-input {
  min-height: var(--k-target-min-size);
  padding: 0 var(--k-space-3);
  background: var(--k-form-input-bg);
  border: var(--k-border-width) solid var(--k-shade-7);
  color: var(--k-color-text);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-main);
  min-width: 0;
}
.invt-select { max-width: 260px; cursor: pointer; }
.invt-select option { background: var(--k-shade-2); color: var(--k-color-text); }
.invt-select:focus,
.invt-input:focus { outline: none; border-color: var(--k-color-primary); background: var(--k-form-input-focus-bg); }

.invt-seg {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 3px;
  background: var(--k-shade-2);
  border: var(--k-border-width) solid var(--k-shade-6);
}
.invt-seg-btn {
  min-height: calc(var(--k-target-min-size) - 8px);
  padding: 0 var(--k-space-3);
  background: transparent;
  border: none;
  color: var(--k-text-muted);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  cursor: pointer;
}
.invt-seg-btn:hover { color: var(--k-color-text); }
.invt-seg-btn.active { background: var(--k-color-primary); color: var(--k-form-btn-text); }

.invt-summary { margin: 0 0 var(--k-space-3); color: var(--k-text-muted); font-size: var(--k-font-size-caption-lg); }
.invt-state { padding: var(--k-space-6) 0; color: var(--k-text-muted); font-size: var(--k-font-size-body-small); }
.invt-state--err { display: flex; flex-wrap: wrap; align-items: center; gap: var(--k-space-3); color: var(--k-state-error-text); }
.invt-retry {
  min-height: var(--k-target-min-size);
  padding: 0 var(--k-space-4);
  background: none;
  border: var(--k-border-width) solid var(--k-shade-7);
  color: var(--k-color-text);
  font-family: var(--k-font-sans);
  cursor: pointer;
}

.invt-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--k-shade-3);
  border: var(--k-border-width) solid var(--k-shade-6);
  font-size: var(--k-font-size-body-small);
}
.invt-table th,
.invt-table td {
  padding: var(--k-space-3) var(--k-space-4);
  border-bottom: var(--k-border-width) solid var(--k-shade-6);
  text-align: left;
  vertical-align: middle;
}
.invt-table th {
  color: var(--k-text-soft);
  font-size: var(--k-font-size-caption);
  font-weight: var(--k-font-weight-semibold);
  letter-spacing: var(--k-tracking-caps);
  text-transform: uppercase;
  white-space: nowrap;
}
.invt-table .num { text-align: right; font-variant-numeric: tabular-nums; }
.invt-table tbody tr:hover { background: var(--k-shade-4); }

.invt-sort {
  padding: 0;
  background: none;
  border: none;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  cursor: pointer;
}
.invt-sort:hover { color: var(--k-color-text); }

.invt-name-cell { min-width: 0; }
.invt-name { color: var(--k-color-text); text-decoration: none; font-weight: var(--k-font-weight-semibold); overflow-wrap: anywhere; }
.invt-name:hover { color: var(--k-color-primary); text-decoration: underline; }
.invt-code { display: block; margin-top: 2px; color: var(--k-text-dim); font-family: var(--k-font-mono); font-size: var(--k-font-size-caption); }

.invt-stock { display: inline-flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: var(--k-space-2); }
.invt-stock.is-low { color: var(--k-alert-watching-text); }
.invt-stock.is-out { color: var(--k-alert-critical-text); }
.invt-badge {
  padding: 1px 6px;
  font-size: var(--k-font-size-caption);
  border: var(--k-border-width) solid currentColor;
  white-space: nowrap;
}

/* En un teléfono siete columnas no caben: cada producto pasa a ser una ficha
   con la etiqueta de cada dato a la izquierda. */
@media (max-width: 720px) {
  .invt-content { padding: var(--k-space-5) var(--k-space-4) var(--k-space-6); }
  .invt-select { max-width: none; }
  .invt-toolbar > .invt-field { flex: 1 1 100%; }
  .invt-table,
  .invt-table tbody,
  .invt-table tr,
  .invt-table td { display: block; width: 100%; }
  .invt-table { background: none; border: none; }
  .invt-table thead { display: none; }
  .invt-table tr {
    margin-bottom: var(--k-space-3);
    background: var(--k-shade-3);
    border: var(--k-border-width) solid var(--k-shade-6);
  }
  .invt-table td {
    display: flex;
    justify-content: space-between;
    gap: var(--k-space-3);
    padding: var(--k-space-2) var(--k-space-4);
    border-bottom: none;
    text-align: right;
  }
  .invt-table td::before {
    content: attr(data-label);
    flex-shrink: 0;
    color: var(--k-text-soft);
    font-size: var(--k-font-size-caption);
    letter-spacing: var(--k-tracking-caps);
    text-transform: uppercase;
    text-align: left;
  }
  .invt-table td.invt-name-cell {
    display: block;
    padding-top: var(--k-space-3);
    text-align: left;
  }
  .invt-table td.invt-name-cell::before { content: none; }
}
</style>
