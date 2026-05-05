<template>
  <div class="inventory-root">
    <AppNavbar />

    <ProductModal
      v-model="showModal"
      :submitting="modalLoading"
      :error="modalError"
      @submit="submitProduct"
    />

    <div class="inventory-layout">

      <ErrorState 
        v-if="authError" 
        title="Session required"
        message="You must be logged in to view the inventory."
      />

      <ErrorState 
        v-else-if="fetchError" 
        title="Could not load inventory"
        message=""
      >
        <button class="btn-primary" style="margin-top:16px" @click="loadData">
          <span>Retry</span>
        </button>
      </ErrorState>

      <template v-else>

        <div class="main-panel">

          <PageHeader title="Inventory" subtitle="Browse and manage your product catalogue">
            <button
              class="btn-primary"
              :class="{ 'btn-disabled': !canCreateProduct }"
              :title="canCreateProduct ? '' : selectedProject ? 'You do not have write access in this project' : 'Select project first'"
              @click="canCreateProduct ? openNewProduct() : null"
            >
              <svg class="icon16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="#0a0a0a" stroke-width="1.5" stroke-linecap="square"/>
              </svg>
              <span>{{ canCreateProduct ? 'New product' : selectedProject ? 'No write access' : 'Select project first' }}</span>
            </button>
            <button class="icon-btn" title="Settings">
              <svg class="icon18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="2.5" stroke="#666" stroke-width="1.4"/>
                <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.697 3.697l1.414 1.414M12.889 12.889l1.414 1.414M3.697 14.303l1.414-1.414M12.889 5.111l1.414-1.414" stroke="#666" stroke-width="1.4" stroke-linecap="square"/>
              </svg>
            </button>
            <button class="icon-btn" title="History">
              <svg class="icon18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="7" stroke="#666" stroke-width="1.4"/>
                <path d="M9 5v4.5l3 1.5" stroke="#666" stroke-width="1.4" stroke-linecap="square"/>
              </svg>
            </button>
          </PageHeader>

        <!-- Selector de proyecto -->
        <div class="project-filter">
          <span class="pf-label">Project</span>
          <div class="pf-tabs">
            <button
              class="pf-tab"
              :class="{ active: !selectedProject }"
              @click="selectProject(null)"
            >All projects</button>
            <button
              v-for="p in projects"
              :key="p.id_proyecto"
              class="pf-tab"
              :class="{ active: selectedProject?.id_proyecto === p.id_proyecto }"
              @click="selectProject(p)"
            >{{ p.nombre }}</button>
          </div>
          <span v-if="projectsLoading" class="pf-loading">Loading…</span>
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

        <LoadingSkeleton 
          v-if="loading" 
          :count="8" 
          card-class="product-card skeleton"
        />

        <div v-else class="product-grid">
          <ProductCard
            v-for="product in filteredProducts"
            :key="product.id_producto"
            :product="product"
            :show-project-tag="!selectedProject"
            :show-usage="!!selectedProject"
          />

          <div v-if="filteredProducts.length === 0" class="empty-state">
            <p>No products match your filters.</p>
          </div>
        </div>

      </div>

      <InventorySummaryPanel
        :stats="stats"
        :category-stats="categoryStats"
        :stock-alerts="stockAlerts"
        :selected-project="selectedProject"
        :can-create-product="canCreateProduct"
        @add-product="openNewProduct"
        @export="exportInventory"
      />

    </template>
  </div><!-- /.inventory-layout -->
  </div><!-- /.inventory-root -->
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import AppNavbar from '../components/AppNavbar.vue'
import './InventoryPage.css'
import Anchor from '../components/UI/Button/Anchor.vue'
import Pill from '../components/UI/Pill/Pill.vue'
import Button from '../components/UI/Button/Button.vue'
import ProductModal from '../components/inventory/ProductModal.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

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

    if (
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
  await Promise.all([loadData(), loadProjects()])
})

watch(() => authStore.idEmpresaActual, async () => {
  selectedProject.value = null
  await authStore.loadAccessContext()
  await Promise.all([loadData(), loadProjects()])
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

const CAT_COLORS = ['#c9a962', '#60a5fa', '#a78bfa', '#34d399', '#f97316', '#fb7185', '#e879f9']

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

function openNewProduct() {
  if (!canCreateProduct.value) return
  modalError.value = null
  showModal.value  = true
}

async function submitProduct(formData) {
  if (!selectedProject.value) {
    modalError.value = 'Select a project before adding a product.'
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
    modalError.value = 'Network error, try again.'
  } finally {
    modalLoading.value = false
  }
}

function exportInventory() {
  // TODO: exportar CSV
}
</script>
