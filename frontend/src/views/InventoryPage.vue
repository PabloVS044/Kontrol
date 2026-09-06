<template>
  <div class="inventory-root">
    <AppNavbar />

    <ProductModal
      v-model="showModal"
      :submitting="modalLoading"
      :error="modalError"
      @submit="submitProduct"
    />

    <RestockModal
      v-model="showRestock"
      :product="restockProduct"
      :submitting="restockLoading"
      :error="restockError"
      @submit="submitRestock"
    />

    <BarcodeScanner
      v-model="showScanner"
      :feedback="scanFeedback"
      @detected="handleScan"
    />

    <SaleCheckoutModal
      v-model="showCheckout"
      :items="saleCart"
      :total="saleTotal"
      :subtitle="saleSubtitle"
      :error="saleError"
      :submitting="saleSubmitting"
      @confirm="submitSale"
    />

    <div class="inventory-layout">

    <!-- Estado: no autenticado -->
    <ErrorState
      v-if="authError"
      :title="$t('inventory.authError.title')"
      :message="$t('inventory.authError.message')"
    />

    <!-- Estado: error genérico -->
    <ErrorState
      v-else-if="fetchError"
      :title="$t('inventory.fetchError.title')"
      :message="fetchError"
    >
      <template #actions>
        <Button :label="$t('inventory.fetchError.retry')" @click="loadData" />
      </template>
    </ErrorState>

    <template v-else>

      <!-- Panel principal -->
      <div class="main-panel">

        <!-- Encabezado -->
        <div class="inv-header">
          <div class="inv-header-left">
            <h1 class="inv-title">{{ $t('inventory.header.title') }}</h1>
            <p class="inv-subtitle">{{ $t('inventory.header.subtitle') }}</p>
          </div>
          <div class="inv-header-actions">
            <button
              data-birdie="create-product"
              class="btn-primary"
              :class="{ 'btn-disabled': !canCreateProduct }"
              :title="canCreateProduct ? '' : selectedProject ? $t('inventory.header.noWriteAccessTitle') : $t('inventory.header.selectProjectTitle')"
              @click="canCreateProduct ? openNewProduct() : null"
            >
              <svg class="icon16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="var(--k-form-btn-text)" stroke-width="1.5" stroke-linecap="square"/>
              </svg>
              <span>{{ canCreateProduct ? $t('inventory.header.newProduct') : selectedProject ? $t('inventory.header.noWriteAccess') : $t('inventory.header.selectProjectFirst') }}</span>
            </button>
            <button class="icon-btn" :title="$t('inventory.header.settings')">
              <svg class="icon18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="2.5" stroke="var(--k-gray-4)" stroke-width="1.4"/>
                <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.697 3.697l1.414 1.414M12.889 12.889l1.414 1.414M3.697 14.303l1.414-1.414M12.889 5.111l1.414-1.414" stroke="var(--k-gray-4)" stroke-width="1.4" stroke-linecap="square"/>
              </svg>
            </button>
            <button class="icon-btn" :title="$t('inventory.header.history')">
              <svg class="icon18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="7" stroke="var(--k-gray-4)" stroke-width="1.4"/>
                <path d="M9 5v4.5l3 1.5" stroke="var(--k-gray-4)" stroke-width="1.4" stroke-linecap="square"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Selector de proyecto -->
        <div class="project-filter">
          <span class="pf-label">{{ $t('inventory.projectFilter.label') }}</span>
          <div class="pf-tabs">
            <button
              class="pf-tab"
              :class="{ active: !selectedProject }"
              @click="selectProject(null)"
            >{{ $t('inventory.projectFilter.allProjects') }}</button>
            <button
              v-for="p in projects"
              :key="p.id_proyecto"
              class="pf-tab"
              :class="{ active: selectedProject?.id_proyecto === p.id_proyecto }"
              @click="selectProject(p)"
            >{{ p.nombre }}</button>
          </div>
          <span v-if="projectsLoading" class="pf-loading">{{ $t('inventory.projectFilter.loading') }}</span>
        </div>

        <!-- Búsqueda -->
        <div class="search-bar">
          <svg class="icon18" viewBox="0 0 18 18" fill="none">
            <circle cx="8" cy="8" r="5.5" stroke="var(--k-gray-4)" stroke-width="1.4"/>
            <path d="M12.5 12.5L16 16" stroke="var(--k-gray-4)" stroke-width="1.4" stroke-linecap="square"/>
          </svg>
          <input
            v-model="searchQuery"
            class="search-input"
            type="text"
            :placeholder="$t('inventory.search.placeholder')"
          />
          <button
            class="scan-btn"
            :title="$t('inventory.scanner.scan')"
            :disabled="!authStore.canSellInventory"
            @click="openScanner"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 5V3a1 1 0 0 1 1-1h2M16 5V3a1 1 0 0 0-1-1h-2M2 13v2a1 1 0 0 0 1 1h2M16 13v2a1 1 0 0 1-1 1h-2" stroke="var(--k-gray-4)" stroke-width="1.4" stroke-linecap="round"/>
              <path d="M4.5 6v6M7 6v6M9.5 6v6M12 6v6M13.5 6v6" stroke="var(--k-gray-4)" stroke-width="1.2" stroke-linecap="round"/>
            </svg>
          </button>
          <button class="search-submit">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="var(--k-form-btn-text)" stroke-width="1.5" stroke-linecap="square"/>
            </svg>
          </button>
        </div>

        <!-- Filtros por categoría (dinámicos desde la API) -->
        <div class="filter-row">
          <span class="filter-label">{{ $t('inventory.filter.category') }}</span>
          <button
            v-for="cat in categories"
            :key="cat"
            class="chip"
            :class="{ active: activeCategory === cat }"
            @click="activeCategory = cat"
          >{{ cat === 'All' ? $t('inventory.filter.all') : cat }}</button>
        </div>

        <!-- Encabezado de sección -->
        <div class="section-header">
          <span class="section-title">{{ $t('inventory.section.title') }}</span>
          <span v-if="loading" class="section-meta">{{ $t('inventory.section.loading') }}</span>
          <span v-else class="section-meta">
            {{ $t('inventory.section.productCount', { count: filteredProducts.length }) }}
          </span>
        </div>

        <!-- Skeleton mientras carga -->
        <div v-if="loading" class="product-grid">
          <div v-for="n in 8" :key="n" class="product-card skeleton">
            <div class="card-img skeleton-img"></div>
            <div class="card-body" style="gap:10px">
              <div class="skeleton-line short"></div>
              <div class="skeleton-line"></div>
              <div class="skeleton-line mid"></div>
            </div>
          </div>
        </div>

        <!-- Grid de productos -->
        <div v-else class="product-grid">
          <div
            v-for="product in filteredProducts"
            :key="product.id_producto"
            class="product-card"
            @click="openDetail(product)"
          >
            <div class="card-img">
              <div class="img-placeholder">
                <!-- Ícono genérico de producto -->
                <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
                  <rect x="10" y="8" width="28" height="34" rx="2" stroke="var(--k-color-text)" stroke-width="1.5"/>
                  <path d="M10 18h28M18 8v10" stroke="var(--k-color-text)" stroke-width="1.5"/>
                </svg>
                <span>image</span>
              </div>
              <Pill
                :label="stockLabel(product)"
                :btnColor="stockPill(product).bg"
                :circleColor="stockPill(product).fg"
                :textColor="stockPill(product).fg"
              />
            </div>

            <div class="card-body">
              <span v-if="!selectedProject && product.proyecto_nombre" class="card-project-tag">{{ product.proyecto_nombre }}</span>
              <span v-if="product.categoria" class="card-code">{{ product.categoria }}</span>
              <span class="card-name">{{ product.nombre }}</span>
              <div class="card-meta">
                <div>
                  <div class="card-price-label">{{ $t('inventory.card.price') }}</div>
                  <div class="card-price">${{ Number(product.precio_venta).toFixed(2) }}</div>
                </div>
                <div class="card-stock">
                  <div class="card-stock-num" :class="stockNumClass(product)">
                    {{ product.stock_actual }}
                  </div>
                  <div class="card-stock-label">{{ $t('inventory.card.totalStock') }}</div>
                </div>
              </div>
              <!-- Project-specific usage -->
              <div v-if="selectedProject" class="card-proj-usage">
                <div class="proj-usage-row">
                  <span class="pu-label">{{ $t('inventory.card.entries') }}</span>
                  <span class="pu-val green">+{{ product.entradas_proyecto ?? 0 }}</span>
                </div>
                <div class="proj-usage-row">
                  <span class="pu-label">{{ $t('inventory.card.exits') }}</span>
                  <span class="pu-val red">-{{ product.salidas_proyecto ?? 0 }}</span>
                </div>
                <div class="proj-usage-row">
                  <span class="pu-label">{{ $t('inventory.card.net') }}</span>
                  <span class="pu-val" :class="(product.neto_proyecto ?? 0) >= 0 ? 'green' : 'red'">
                    {{ (product.neto_proyecto ?? 0) >= 0 ? '+' : '' }}{{ product.neto_proyecto ?? 0 }}
                  </span>
                </div>
              </div>
            </div>

            <div class="card-footer" @click.stop>
              <button
                v-if="canRestock(product)"
                class="restock-btn"
                :title="$t('inventory.card.restock')"
                @click="openRestock(product)"
              >
                + {{ $t('inventory.card.restock') }}
              </button>
              <!-- Sell button OR quantity stepper if product is already in cart -->
              <button
                v-if="!getCartItem(product)"
                data-birdie="sell-product"
                class="sell-btn"
                :disabled="!canSellProduct(product)"
                :title="canSellProduct(product) ? '' : $t('inventory.card.cannotSell')"
                @click="addToCart(product)"
              >
                {{ $t('inventory.card.sell') }}
              </button>
              <div v-else class="qty-stepper">
                <button
                  class="qty-btn"
                  :aria-label="$t('inventory.card.decrease')"
                  @click="decrementCart(product)"
                >−</button>
                <input
                  class="qty-input"
                  type="number"
                  min="1"
                  :max="product.stock_actual"
                  :value="getCartItem(product).cantidad"
                  @input="setCartQuantity(product, $event.target.value)"
                  @click.stop
                />
                <button
                  class="qty-btn"
                  :aria-label="$t('inventory.card.increase')"
                  :disabled="getCartItem(product).cantidad >= product.stock_actual"
                  @click="incrementCart(product)"
                >+</button>
              </div>
            </div>
          </div>

          <!-- Sin resultados -->
          <div v-if="!loading && filteredProducts.length === 0" class="empty-state">
            <p>{{ $t('inventory.empty') }}</p>
          </div>
        </div>

      </div>

      <!-- Panel de contexto -->
      <aside class="context-panel" :class="{ 'has-sale': saleCart.length }">

        <!-- Sale cart (shown while there are items in the cart) -->
        <SaleCartPanel
          v-if="saleCart.length"
          :items="saleCart"
          :total="saleTotal"
          :subtitle="saleSubtitle"
          :error="saleError"
          :submitting="saleSubmitting"
          @remove="removeFromCart"
          @submit="openCheckout"
          @cancel="clearSaleCart"
        />

        <!-- Summary (default view, shown when no sale is in progress) -->
        <template v-else>
        <div>
          <div class="ctx-title">{{ $t('inventory.context.summary') }}</div>
          <div class="ctx-subtitle">
            {{ selectedProject ? selectedProject.nombre : $t('inventory.context.allProjects') }}
          </div>
        </div>

        <!-- Stats generales -->
        <div>
          <p class="ctx-label">{{ $t('inventory.context.atAGlance') }}</p>
          <div class="summary-grid">
            <div class="summary-card">
              <span class="s-value">{{ stats.total }}</span>
              <span class="s-label">{{ $t('inventory.context.totalProducts') }}</span>
            </div>
            <div class="summary-card">
              <span class="s-value">{{ stats.lowStock }}</span>
              <span class="s-label">{{ $t('inventory.context.lowStock') }}</span>
              <span class="s-sub gold">{{ $t('inventory.context.reorderSoon') }}</span>
            </div>
            <div class="summary-card">
              <span class="s-value">{{ stats.outOfStock }}</span>
              <span class="s-label">{{ $t('inventory.context.outOfStock') }}</span>
              <span class="s-sub red">{{ $t('inventory.context.actionNeeded') }}</span>
            </div>
            <div class="summary-card">
              <span class="s-value">${{ stats.totalValue }}</span>
              <span class="s-label">{{ $t('inventory.context.totalValue') }}</span>
            </div>
          </div>
        </div>

        <!-- Por categoría -->
        <div v-if="categoryStats.length">
          <p class="ctx-label">{{ $t('inventory.context.byCategory') }}</p>
          <template v-for="cat in categoryStats" :key="cat.name">
            <div class="cat-row">
              <span class="cat-name">{{ cat.name }}</span>
              <span class="cat-count">{{ cat.count }}</span>
            </div>
            <div class="cat-bar-bg">
              <div class="cat-bar-fill" :style="{ width: cat.pct + '%', background: cat.color }"></div>
            </div>
          </template>
        </div>

        <!-- Alertas de stock -->
        <div v-if="stockAlerts.length">
          <p class="ctx-label">{{ $t('inventory.context.stockAlerts') }}</p>
          <div v-for="alert in stockAlerts" :key="alert.id_producto" class="alert-card">
            <span class="alert-name">{{ alert.nombre }}</span>
            <span class="alert-code">{{ alert.categoria }} · {{ $t('inventory.context.unitsLeft', { count: alert.stock_actual }) }}</span>
            <span class="alert-status" :class="alert.stock_actual === 0 ? 'red' : 'gold'">
              {{ alert.stock_actual === 0 ? $t('inventory.stock.outOfStock') : alert.stock_actual <= alert.stock_minimo ? $t('inventory.context.criticalStock') : $t('inventory.context.lowStockReorder') }}
            </span>
          </div>
        </div>

        <!-- Acciones rápidas -->
        <div>
          <p class="ctx-label">{{ $t('inventory.context.quickActions') }}</p>
          <Button v-if="canCreateProduct" :label="$t('inventory.context.addProduct')" @click="openNewProduct" />
          <Button :label="$t('inventory.context.exportInventory')" @click="exportInventory" />
        </div>

        <div class="data-source">
          <div class="ds-label">{{ $t('inventory.context.dataSource') }}</div>
          <div class="ds-text">{{ $t('inventory.context.dataSourceText') }}</div>
        </div>
        </template>

      </aside>

    </template>
  </div><!-- /.inventory-layout -->

  <!-- Mobile sale bar + drawer (POS): only visible ≤900px via CSS -->
  <template v-if="saleCart.length">
    <button class="mobile-cart-bar" @click="cartExpanded = true">
      <span class="mcb-count">{{ saleItemCount }}</span>
      <span class="mcb-label">{{ $t('inventory.sale.viewSale') }}</span>
      <span class="mcb-total">${{ saleTotal.toFixed(2) }}</span>
    </button>

    <div v-if="cartExpanded" class="cart-drawer-overlay" @click.self="cartExpanded = false">
      <div class="cart-drawer">
        <div class="cart-drawer-handle" @click="cartExpanded = false"></div>
        <SaleCartPanel
          :items="saleCart"
          :total="saleTotal"
          :subtitle="saleSubtitle"
          :error="saleError"
          :submitting="saleSubmitting"
          @remove="removeFromCart"
          @submit="openCheckout"
          @cancel="clearSaleCart"
        />
      </div>
    </div>
  </template>
  </div><!-- /.inventory-root -->
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppNavbar from '../components/AppNavbar.vue'
import ErrorState from '../components/common/ErrorState.vue'
import './InventoryPage.css'
import Pill from '../components/UI/Pill/Pill.vue'
import Button from '../components/UI/Button/Button.vue'
import ProductModal from '../components/inventory/ProductModal.vue'
import RestockModal from '../components/inventory/RestockModal.vue'
import SaleCartPanel from '../components/inventory/SaleCartPanel.vue'
import BarcodeScanner from '../components/inventory/BarcodeScanner.vue'
import SaleCheckoutModal from '../components/inventory/SaleCheckoutModal.vue'
import { useAuthStore } from '@/stores/auth'
import { calcSubtotal } from '@/utils/sales.js'

const { t } = useI18n()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const products       = ref([])
const stockAlerts    = ref([])
const loading        = ref(true)
const authError      = ref(false)
const fetchError     = ref(null)
const searchQuery    = ref('')
const activeCategory = ref('All')

const projects        = ref([])
const projectsLoading = ref(false)
const selectedProject = ref(null)
const canCreateProduct = computed(() => {
  if (!selectedProject.value) return false
  if (authStore.canManageInventory) return true
  return (selectedProject.value.mis_permisos || []).includes('gestionar_inventario')
})

// Restock requires write access on the product's *own* project (works in the
// "all projects" view too, where each product carries its id_proyecto).
function canRestock(product) {
  if (authStore.canManageInventory) return true
  const proj = projects.value.find((p) => p.id_proyecto === product.id_proyecto)
  return (proj?.mis_permisos || []).includes('gestionar_inventario')
}

/* ── helpers API ── */
function authHeader(includeProyecto = false) {
  const token   = localStorage.getItem('token')
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  if (authStore.idEmpresaActual) headers['X-Company-ID'] = authStore.idEmpresaActual
  if (includeProyecto && selectedProject.value) headers['X-Project-ID'] = selectedProject.value.id_proyecto
  return headers
}

async function apiFetch(path, write = false) {
  const res = await fetch(path, { headers: authHeader(write) })
  if (res.status === 401) throw Object.assign(new Error('unauthenticated'), { status: 401 })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function loadProjects() {
  projectsLoading.value = true
  try {
    const res = await apiFetch('/api/projects?limit=100')
    const allProjects = res.data ?? []
    const inventoryProjectIds = authStore.accessContext?.inventory_project_ids ?? []

    projects.value = authStore.canManageInventory
      ? allProjects
      : allProjects.filter((project) => inventoryProjectIds.includes(project.id_proyecto))

    const queryProjectId = Number(route.query.project)
    if (queryProjectId) {
      selectedProject.value = projects.value.find(
        ({ id_proyecto }) => id_proyecto === queryProjectId
      ) ?? null
    } else if (
      selectedProject.value &&
      !projects.value.some(({ id_proyecto }) => id_proyecto === selectedProject.value.id_proyecto)
    ) {
      selectedProject.value = null
    }
  } catch {
    // non-fatal: project filter just stays empty
  } finally {
    projectsLoading.value = false
  }
}

async function loadData() {
  loading.value    = true
  authError.value  = false
  fetchError.value = null
  try {
    const params = new URLSearchParams()
    if (selectedProject.value) {
      params.set('projectId', selectedProject.value.id_proyecto)
    }
    const qs = params.toString() ? `?${params}` : ''

    const [productosRes, alertasRes] = await Promise.all([
      apiFetch(`/api/products${qs}`),
      apiFetch(`/api/products/alerts/low-stock${qs}`),
    ])
    products.value    = productosRes.data
    stockAlerts.value = alertasRes.data
  } catch (err) {
    if (err.status === 401) authError.value = true
    else fetchError.value = err.message
  } finally {
    loading.value = false
  }
}

function selectProject(p) {
  selectedProject.value = p
  activeCategory.value  = 'All'
  loadData()
}

onMounted(async () => {
  const accessEmpresaId = authStore.accessContext?.empresa?.id_empresa
  if (accessEmpresaId !== authStore.idEmpresaActual) {
    await authStore.loadAccessContext()
  }
  await loadProjects()
  await loadData()
})

watch(() => authStore.idEmpresaActual, async () => {
  selectedProject.value = null
  await authStore.loadAccessContext()
  await loadProjects()
  await loadData()
})

/* ── categorías dinámicas ── */
const categories = computed(() => {
  const unique = [...new Set(products.value.map(p => p.categoria).filter(Boolean))]
  return ['All', ...unique.sort()]
})

/* ── productos filtrados ── */
const filteredProducts = computed(() => {
  return products.value.filter(p => {
    const matchesCat = activeCategory.value === 'All' || p.categoria === activeCategory.value
    const q = searchQuery.value.toLowerCase()
    const matchesSearch = !q
      || p.nombre.toLowerCase().includes(q)
      || (p.categoria || '').toLowerCase().includes(q)
    return matchesCat && matchesSearch
  })
})

/* ── stats ── */
const stats = computed(() => {
  const total      = products.value.length
  const lowStock   = products.value.filter(p => p.stock_actual > 0 && p.stock_actual <= p.stock_minimo).length
  const outOfStock = products.value.filter(p => p.stock_actual === 0).length
  const totalVal   = products.value.reduce((acc, p) => acc + Number(p.precio_venta) * Number(p.stock_actual), 0)
  const formatted  = totalVal >= 1000 ? `${Math.round(totalVal / 1000)}K` : String(Math.round(totalVal))
  return { total, lowStock, outOfStock, totalValue: formatted }
})

/* Rampa de barras por categoría. Los tonos anteriores (#60a5fa, #a78bfa,
   #f97316, #e879f9…) eran los por defecto de Tailwind, ajenos a "Luxury Dark":
   se sustituyen por la paleta de marca. */
const CAT_COLORS = [
  'var(--k-color-primary)',
  'var(--k-color-primary-2)',
  'var(--k-color-secondary)',
  'var(--k-state-success-text)',
  'var(--k-state-error-text)',
  'var(--k-text-muted)',
  'var(--k-text-dim)',
]

const categoryStats = computed(() => {
  const totals = {}
  products.value.forEach(p => {
    const cat = p.categoria || 'Uncategorized'
    totals[cat] = (totals[cat] || 0) + 1
  })
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1])
  const max = entries[0]?.[1] || 1
  return entries.map(([name, count], i) => ({
    name, count,
    pct: Math.round((count / max) * 100),
    color: CAT_COLORS[i % CAT_COLORS.length],
  }))
})

/* ── estado de stock (usa stock_actual vs stock_minimo) ── */

/**
 * Tono semántico de un producto según SCRUM-12. Un único sitio decide el
 * estado; la etiqueta, la píldora y el color del número se derivan de él, así
 * que no pueden discrepar entre sí.
 */
function stockTone(p) {
  if (p.stock_actual === 0) return 'critical'
  if (p.stock_actual <= p.stock_minimo) return 'watching'
  return 'ok'
}

const STOCK_PILL = {
  critical: { bg: 'var(--k-alert-critical-bg)', fg: 'var(--k-alert-critical-text)' },
  watching: { bg: 'var(--k-alert-watching-bg)', fg: 'var(--k-alert-watching-text)' },
  ok:       { bg: 'var(--k-alert-ok-bg)',       fg: 'var(--k-alert-ok-text)' },
}

const STOCK_NUM_CLASS = { critical: 'red', watching: 'gold', ok: '' }

function stockPill(p) {
  return STOCK_PILL[stockTone(p)]
}

function stockLabel(p) {
  if (p.stock_actual === 0) return t('inventory.stock.outOfStock')
  if (p.stock_actual <= p.stock_minimo) return t('inventory.stock.lowStock')
  return t('inventory.stock.inStock')
}

function stockNumClass(p) {
  return STOCK_NUM_CLASS[stockTone(p)]
}

function detailLink(product) {
  const query = selectedProject.value
    ? `?project=${selectedProject.value.id_proyecto}`
    : ''
  return `/inventory/${product.id_producto}${query}`
}

function openDetail(product) {
  router.push(detailLink(product))
}

/* ── carrito de venta ── */
const saleCart        = ref([])
const saleSubmitting  = ref(false)
const saleError       = ref(null)
const cartExpanded    = ref(false)  // mobile drawer open state
const showCheckout    = ref(false)  // modal de cobro

const saleItemCount = computed(() =>
  saleCart.value.reduce((acc, item) => acc + Number(item.cantidad), 0)
)

const saleSubtitle = computed(() =>
  selectedProject.value ? selectedProject.value.nombre : t('inventory.sale.multiProject')
)

/**
 * El carrito ya no vende directamente: abre el cobro. La venta solo sale
 * cuando se confirma en el modal, que es el último punto donde el cajero ve
 * artículos y total antes de descontar stock.
 */
function openCheckout() {
  if (!saleCart.value.length) return
  saleError.value = null
  cartExpanded.value = false
  showCheckout.value = true
}

/* ── escaneo de código de barras (POS) ── */
const showScanner  = ref(false)
const scanFeedback = ref(null)
let scanFeedbackTimer = null

function openScanner() {
  if (!authStore.canSellInventory) return
  scanFeedback.value = null
  showScanner.value = true
}

// Un acierto se lee de un vistazo; un error hay que poder leerlo entero antes
// de que desaparezca, sobre todo con el código en la mano.
const SCAN_FEEDBACK_MS = { ok: 1800, warn: 3200, err: 3200 }

function flashScanFeedback(type, msg) {
  scanFeedback.value = { type, msg }
  clearTimeout(scanFeedbackTimer)
  scanFeedbackTimer = setTimeout(() => { scanFeedback.value = null }, SCAN_FEEDBACK_MS[type])
}

/**
 * Punto único de entrada del escaneo: lo llaman tanto la cámara como el campo
 * manual del panel, así que ambos caminos producen exactamente los mismos
 * estados controlados.
 *
 * Los cuatro casos que el POS tiene que distinguir:
 *  - código inexistente     → error, no se toca el carrito
 *  - producto sin stock     → error (incluye "sin permiso de venta")
 *  - código ya en la venta  → aviso, y suma una unidad más
 *  - código nuevo y vendible→ alta correcta
 */
function handleScan(code) {
  const scanned = String(code ?? '').trim()
  if (!scanned) return

  const match = products.value.find(
    (p) => p.codigo_barras && String(p.codigo_barras) === scanned
  )
  if (!match) {
    flashScanFeedback('err', t('inventory.scanner.notFound', { code: scanned }))
    return
  }
  if (!canSellProduct(match)) {
    flashScanFeedback('err', t('inventory.scanner.outOfStock', { name: match.nombre }))
    return
  }

  const existing = getCartItem(match)
  if (existing) {
    // Duplicado: el código ya está en la venta. Se suma una unidad, salvo que
    // eso pasara del stock disponible — ahí el aviso pasa a error y no se toca
    // la cantidad, porque la venta no podría cerrarse.
    if (existing.cantidad >= Number(match.stock_actual)) {
      flashScanFeedback('err', t('inventory.scanner.stockLimit', {
        name: match.nombre,
        count: match.stock_actual,
      }))
      return
    }
    incrementCart(match)
    flashScanFeedback('warn', t('inventory.scanner.duplicate', {
      name: match.nombre,
      count: existing.cantidad,
    }))
    return
  }

  addToCart(match)
  flashScanFeedback('ok', t('inventory.scanner.added', { name: match.nombre }))
}

function getCartItem(product) {
  return saleCart.value.find((item) => item.product.id_producto === product.id_producto)
}

function canSellProduct(product) {
  if (!authStore.canSellInventory) return false
  return Number(product.stock_actual) > 0
}

function addToCart(product) {
  if (!canSellProduct(product)) return
  saleError.value = null
  const existing = getCartItem(product)
  if (existing) {
    incrementCart(product)
    return
  }
  saleCart.value.push({ product, cantidad: 1 })
}

function incrementCart(product) {
  const item = getCartItem(product)
  if (!item) return
  if (item.cantidad < Number(product.stock_actual)) {
    item.cantidad += 1
  }
}

function decrementCart(product) {
  const item = getCartItem(product)
  if (!item) return
  if (item.cantidad <= 1) {
    removeFromCart(product)
    return
  }
  item.cantidad -= 1
}

function setCartQuantity(product, rawValue) {
  const item = getCartItem(product)
  if (!item) return
  const stock = Number(product.stock_actual)
  let next = Math.floor(Number(rawValue))
  if (!Number.isFinite(next) || next < 1) next = 1
  if (next > stock) next = stock
  item.cantidad = next
}

function removeFromCart(product) {
  saleCart.value = saleCart.value.filter(
    (item) => item.product.id_producto !== product.id_producto
  )
}

function clearSaleCart() {
  saleCart.value = []
  saleError.value = null
  cartExpanded.value = false
  showCheckout.value = false
}

const saleTotal = computed(() => calcSubtotal(saleCart.value))

const canSubmitSale = computed(() => saleCart.value.length > 0)

async function submitSale() {
  if (!canSubmitSale.value || saleSubmitting.value) return
  saleSubmitting.value = true
  saleError.value = null

  try {
    const items = saleCart.value.map((item) => {
      const id_proyecto = item.product.id_proyecto ?? selectedProject.value?.id_proyecto
      if (!id_proyecto) throw new Error(t('inventory.sale.errors.missingProject'))
      return {
        id_producto: item.product.id_producto,
        id_proyecto,
        cantidad: item.cantidad,
        precio_unitario: Number(item.product.precio_venta),
      }
    })

    // Single atomic request: the whole sale commits or nothing does.
    const res = await fetch('/api/inventory-movements/sale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ items, motivo: t('inventory.sale.movementReason') }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || `Error ${res.status}`)

    clearSaleCart()
    await loadData()
  } catch (err) {
    saleError.value = err.message || t('inventory.errors.networkError')
  } finally {
    saleSubmitting.value = false
  }
}

// Keep cart in sync if products list updates — drop any cart entries that no
// longer exist or refresh references so subtotal/stock checks stay correct.
watch(products, (next) => {
  if (!saleCart.value.length) return
  saleCart.value = saleCart.value
    .map((item) => {
      const fresh = next.find((p) => p.id_producto === item.product.id_producto)
      if (!fresh) return null
      const stock = Number(fresh.stock_actual)
      const cantidad = Math.max(1, Math.min(item.cantidad, stock))
      if (stock <= 0) return null
      return { product: fresh, cantidad }
    })
    .filter(Boolean)

  // Si el refresco deja el carrito vacío no queda nada que cobrar.
  if (!saleCart.value.length) showCheckout.value = false
})

/* ── modal nuevo producto ── */
const showModal    = ref(false)
const modalLoading = ref(false)
const modalError   = ref(null)

function openNewProduct() {
  if (!canCreateProduct.value) return
  modalError.value = null
  showModal.value  = true
}

async function submitProduct(formData) {
  if (!selectedProject.value) {
    modalError.value = t('inventory.errors.selectProject')
    return
  }
  modalLoading.value = true
  modalError.value   = null
  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader(true) },
      body: JSON.stringify({
        nombre:        formData.nombre,
        descripcion:   formData.descripcion || undefined,
        precio_venta:  formData.precio_venta,
        precio_costo:  formData.precio_costo,
        stock_minimo:  formData.stock_minimo ?? 0,
        stock_inicial: formData.stock_inicial ?? 0,
        codigo_barras: formData.codigo_barras || undefined,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      modalError.value = data.message || `Error ${res.status}`
      return
    }
    showModal.value = false
    await loadData()
  } catch {
    modalError.value = t('inventory.errors.networkError')
  } finally {
    modalLoading.value = false
  }
}

function exportInventory() {
  // TODO: exportar CSV
}

/* ── restock (ENTRADA) ── */
const showRestock    = ref(false)
const restockProduct = ref(null)
const restockLoading = ref(false)
const restockError   = ref(null)

function openRestock(product) {
  if (!canRestock(product)) return
  restockProduct.value = product
  restockError.value   = null
  showRestock.value    = true
}

async function submitRestock(payload) {
  const product = restockProduct.value
  if (!product) return
  restockLoading.value = true
  restockError.value   = null
  try {
    const res = await fetch('/api/inventory-movements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({
        tipo: 'ENTRADA',
        cantidad: payload.cantidad,
        precio_unitario: payload.precio_unitario,
        motivo: payload.motivo ?? t('inventory.restock.defaultReason'),
        id_producto: product.id_producto,
        id_proyecto: product.id_proyecto,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      restockError.value = data.message || `Error ${res.status}`
      return
    }
    showRestock.value = false
    await loadData()
  } catch {
    restockError.value = t('inventory.errors.networkError')
  } finally {
    restockLoading.value = false
  }
}
</script>
