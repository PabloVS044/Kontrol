<template>
  <div class="inventory-root">
    <AppNavbar />

    <!-- Modal: nuevo producto (fuera del v-if/v-else) -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-title">New product</span>
            <button class="modal-close" @click="closeModal">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3L3 13" stroke="#666" stroke-width="1.4" stroke-linecap="square"/>
              </svg>
            </button>
          </div>

          <form class="modal-form" @submit.prevent="submitProduct">

            <div class="form-field">
              <label>Name <span class="req">*</span></label>
              <input v-model="form.nombre" type="text" placeholder="Product name" required />
            </div>

            <div class="form-field">
              <label>Description</label>
              <textarea v-model="form.descripcion" placeholder="Optional description" rows="2"></textarea>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label>Sale price <span class="req">*</span></label>
                <input v-model.number="form.precio_venta" type="number" min="0" step="0.01" placeholder="0.00" required />
              </div>
              <div class="form-field">
                <label>Cost price <span class="req">*</span></label>
                <input v-model.number="form.precio_costo" type="number" min="0" step="0.01" placeholder="0.00" required />
              </div>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label>Initial stock</label>
                <input v-model.number="form.stock_inicial" type="number" min="0" placeholder="0" />
              </div>
              <div class="form-field">
                <label>Min. stock</label>
                <input v-model.number="form.stock_minimo" type="number" min="0" placeholder="0" />
              </div>
            </div>

            <p v-if="modalError" class="modal-error">{{ modalError }}</p>

            <div class="modal-actions">
              <Button label="Cancel" type="button" @click="closeModal" />
              <Button
                :label="modalLoading ? 'Saving…' : 'Save product'"
                type="submit"
                :disabled="modalLoading"
              />
            </div>

          </form>
        </div>
      </div>
    </Teleport>

    <div class="inventory-layout">

    <!-- Estado: no autenticado -->
    <div v-if="authError" class="state-screen">
      <p class="state-title">Session required</p>
      <p class="state-msg">You must be logged in to view the inventory.</p>
    </div>

    <!-- Estado: error genérico -->
    <div v-else-if="fetchError" class="state-screen">
      <p class="state-title">Could not load inventory</p>
      <p class="state-msg">{{ fetchError }}</p>
      <button class="btn-primary" style="margin-top:16px" @click="loadData">
        <span>Retry</span>
      </button>
    </div>

    <template v-else>

      <!-- Panel principal -->
      <div class="main-panel">

        <!-- Encabezado -->
        <div class="inv-header">
          <div class="inv-header-left">
            <h1 class="inv-title">Inventory</h1>
            <p class="inv-subtitle">Browse and manage your product catalogue</p>
          </div>
          <div class="inv-header-actions">
            <button class="btn-primary" @click="openNewProduct">
              <svg class="icon16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="#0a0a0a" stroke-width="1.5" stroke-linecap="square"/>
              </svg>
              <span>New product</span>
            </button>
            <button class="icon-btn" title="Configuración">
              <svg class="icon18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="2.5" stroke="#666" stroke-width="1.4"/>
                <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.697 3.697l1.414 1.414M12.889 12.889l1.414 1.414M3.697 14.303l1.414-1.414M12.889 5.111l1.414-1.414" stroke="#666" stroke-width="1.4" stroke-linecap="square"/>
              </svg>
            </button>
            <button class="icon-btn" title="Historial">
              <svg class="icon18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="7" stroke="#666" stroke-width="1.4"/>
                <path d="M9 5v4.5l3 1.5" stroke="#666" stroke-width="1.4" stroke-linecap="square"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Búsqueda -->
        <div class="search-bar">
          <svg class="icon18" viewBox="0 0 18 18" fill="none">
            <circle cx="8" cy="8" r="5.5" stroke="#666" stroke-width="1.4"/>
            <path d="M12.5 12.5L16 16" stroke="#666" stroke-width="1.4" stroke-linecap="square"/>
          </svg>
          <input
            v-model="searchQuery"
            class="search-input"
            type="text"
            placeholder="Search by name or category..."
          />
          <button class="search-submit">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="#0a0a0a" stroke-width="1.5" stroke-linecap="square"/>
            </svg>
          </button>
        </div>

        <!-- Filtros por categoría (dinámicos desde la API) -->
        <div class="filter-row">
          <span class="filter-label">Category</span>
          <button
            v-for="cat in categories"
            :key="cat"
            class="chip"
            :class="{ active: activeCategory === cat }"
            @click="activeCategory = cat"
          >{{ cat }}</button>
        </div>

        <!-- Encabezado de sección -->
        <div class="section-header">
          <span class="section-title">Product Catalogue</span>
          <span v-if="loading" class="section-meta">Loading…</span>
          <span v-else class="section-meta">
            {{ filteredProducts.length }} products · Click any card for details
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
          >
            <div class="card-img">
              <div class="img-placeholder">
                <!-- Ícono genérico de producto -->
                <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
                  <rect x="10" y="8" width="28" height="34" rx="2" stroke="#faf8f5" stroke-width="1.5"/>
                  <path d="M10 18h28M18 8v10" stroke="#faf8f5" stroke-width="1.5"/>
                </svg>
                <span>image</span>
              </div>
              <Pill
                :label="stockLabel(product)"
                :btnColor="product.stock_actual === 0 ? 'rgba(251,113,133,0.12)' : product.stock_actual <= product.stock_minimo ? 'rgba(201,169,98,0.12)' : 'rgba(52,211,153,0.12)'"
                :circleColor="product.stock_actual === 0 ? '#fb7185' : product.stock_actual <= product.stock_minimo ? '#c9a962' : '#34d399'"
                :textColor="product.stock_actual === 0 ? '#fb7185' : product.stock_actual <= product.stock_minimo ? '#c9a962' : '#34d399'"
              />
            </div>

            <div class="card-body">
              <span v-if="product.categoria" class="card-code">{{ product.categoria }}</span>
              <span class="card-name">{{ product.nombre }}</span>
              <div class="card-meta">
                <div>
                  <div class="card-price-label">Price</div>
                  <div class="card-price">${{ Number(product.precio_venta).toFixed(2) }}</div>
                </div>
                <div class="card-stock">
                  <div class="card-stock-num" :class="stockNumClass(product)">
                    {{ product.stock_actual }}
                  </div>
                  <div class="card-stock-label">units</div>
                </div>
              </div>
            </div>

            <div class="card-footer">
              <Anchor
                label="View details"
                :link="`/inventory/${product.id_producto}`"
                textColor="#c9a962"
                backColor="transparent"
                hoverColor="rgba(201,169,98,0.05)"
              />
            </div>
          </div>

          <!-- Sin resultados -->
          <div v-if="!loading && filteredProducts.length === 0" class="empty-state">
            <p>No products match your filters.</p>
          </div>
        </div>

      </div>

      <!-- Panel de contexto -->
      <aside class="context-panel">

        <div>
          <div class="ctx-title">Summary</div>
          <div class="ctx-subtitle">Inventory at a glance</div>
        </div>

        <!-- Stats generales -->
        <div>
          <p class="ctx-label">At a Glance</p>
          <div class="summary-grid">
            <div class="summary-card">
              <span class="s-value">{{ stats.total }}</span>
              <span class="s-label">Total products</span>
            </div>
            <div class="summary-card">
              <span class="s-value">{{ stats.lowStock }}</span>
              <span class="s-label">Low stock</span>
              <span class="s-sub gold">Reorder soon</span>
            </div>
            <div class="summary-card">
              <span class="s-value">{{ stats.outOfStock }}</span>
              <span class="s-label">Out of stock</span>
              <span class="s-sub red">Action needed</span>
            </div>
            <div class="summary-card">
              <span class="s-value">${{ stats.totalValue }}</span>
              <span class="s-label">Total value</span>
            </div>
          </div>
        </div>

        <!-- Por categoría -->
        <div v-if="categoryStats.length">
          <p class="ctx-label">By Category</p>
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
          <p class="ctx-label">Stock Alerts</p>
          <div v-for="alert in stockAlerts" :key="alert.id_producto" class="alert-card">
            <span class="alert-name">{{ alert.nombre }}</span>
            <span class="alert-code">{{ alert.categoria }} · {{ alert.stock_actual }} units left</span>
            <span class="alert-status" :class="alert.stock_actual === 0 ? 'red' : 'gold'">
              {{ alert.stock_actual === 0 ? 'Out of stock' : alert.stock_actual <= alert.stock_minimo ? 'Critical stock' : 'Low stock — reorder soon' }}
            </span>
          </div>
        </div>

        <!-- Acciones rápidas -->
        <div>
          <p class="ctx-label">Quick Actions</p>
          <Button label="+ Add product" @click="openNewProduct" />
          <Button label="↓ Export inventory" @click="exportInventory" />
        </div>

        <div class="data-source">
          <div class="ds-label">Data Source</div>
          <div class="ds-text">Inventory database · Live</div>
        </div>

      </aside>

    </template>
  </div><!-- /.inventory-layout -->
  </div><!-- /.inventory-root -->
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import AppNavbar from '../components/AppNavbar.vue'
import './InventoryPage.css'
import Anchor from '../components/UI/Button/Anchor.vue'
import Pill from '../components/UI/Pill/Pill.vue'
import Button from '../components/UI/Button/Button.vue'

const products    = ref([])
const stockAlerts = ref([])
const loading     = ref(true)
const authError   = ref(false)
const fetchError  = ref(null)
const searchQuery    = ref('')
const activeCategory = ref('All')

/* ── helpers API ── */
function authHeader() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function apiFetch(path) {
  const res = await fetch(path, { headers: authHeader() })
  if (res.status === 401) throw Object.assign(new Error('unauthenticated'), { status: 401 })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function loadData() {
  loading.value   = true
  authError.value = false
  fetchError.value = null
  try {
    const [productosRes, alertasRes] = await Promise.all([
      apiFetch('/api/productos'),
      apiFetch('/api/productos/alertas/stock-bajo'),
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

onMounted(loadData)

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

const CAT_COLORS = ['#c9a962', '#60a5fa', '#a78bfa', '#34d399', '#f97316', '#fb7185', '#e879f9']

const categoryStats = computed(() => {
  const totals = {}
  products.value.forEach(p => {
    const cat = p.categoria || 'Sin categoría'
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

/* ── badge helpers (usan stock_actual vs stock_minimo) ── */
function stockBadgeClass(p) {
  if (p.stock_actual === 0) return 'badge-out'
  if (p.stock_actual <= p.stock_minimo) return 'badge-low'
  return 'badge-ok'
}

function stockLabel(p) {
  if (p.stock_actual === 0) return 'Out of stock'
  if (p.stock_actual <= p.stock_minimo) return 'Low stock'
  return 'In stock'
}

function stockNumClass(p) {
  if (p.stock_actual === 0) return 'red'
  if (p.stock_actual <= p.stock_minimo) return 'gold'
  return ''
}

/* ── modal nuevo producto ── */
const showModal    = ref(false)
const modalLoading = ref(false)
const modalError   = ref(null)
const form = ref({ nombre: '', descripcion: '', precio_venta: null, precio_costo: null, stock_minimo: 0, stock_inicial: 0 })

function openNewProduct() {
  form.value       = { nombre: '', descripcion: '', precio_venta: null, precio_costo: null, stock_minimo: 0, stock_inicial: 0 }
  modalError.value = null
  showModal.value  = true
}

function closeModal() {
  showModal.value = false
}

async function submitProduct() {
  modalLoading.value = true
  modalError.value   = null
  try {
    const res = await fetch('/api/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({
        nombre:        form.value.nombre,
        descripcion:   form.value.descripcion || undefined,
        precio_venta:  form.value.precio_venta,
        precio_costo:  form.value.precio_costo,
        stock_minimo:  form.value.stock_minimo ?? 0,
        stock_inicial: form.value.stock_inicial ?? 0,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      modalError.value = data.message || `Error ${res.status}`
      return
    }
    closeModal()
    await loadData()
  } catch {
    modalError.value = 'Network error, try again.'
  } finally {
    modalLoading.value = false
  }
}

function exportInventory() {
  // TODO: exportar CSV
}
</script>
