<template>
  <div class="inventory-layout">

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
          placeholder="Search by name, code or category..."
        />
        <button class="search-submit">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="#0a0a0a" stroke-width="1.5" stroke-linecap="square"/>
          </svg>
        </button>
      </div>

      <!-- Filtros por categoría -->
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
        <span class="section-meta">{{ filteredProducts.length }} products · Click any card for details</span>
      </div>

      <!-- Grid de productos -->
      <div class="product-grid">
        <div
          v-for="product in filteredProducts"
          :key="product.code"
          class="product-card"
          @click="selectedProduct = product"
        >
          <div class="card-img">
            <div class="img-placeholder">
              <svg width="40" height="40" viewBox="0 0 48 48" fill="none" v-html="product.svgIcon"></svg>
              <span>image</span>
            </div>
            <span class="stock-badge" :class="stockBadgeClass(product.stock)">
              {{ stockLabel(product.stock) }}
            </span>
          </div>

          <div class="card-body">
            <span class="card-code">{{ product.code }}</span>
            <span class="card-name">{{ product.name }}</span>
            <div class="card-meta">
              <div>
                <div class="card-price-label">Price</div>
                <div class="card-price">${{ product.price.toFixed(2) }}</div>
              </div>
              <div class="card-stock">
                <div class="card-stock-num" :class="stockNumClass(product.stock)">{{ product.stock }}</div>
                <div class="card-stock-label">units</div>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <!-- Reutiliza Anchor para navegar al detalle del producto -->
            <Anchor
              :label="'View details'"
              :link="`/inventory/${product.code}`"
              textColor="#c9a962"
              backColor="transparent"
              hoverColor="rgba(201,169,98,0.05)"
            />
          </div>
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
            <span class="s-sub green">+12 this month</span>
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
            <span class="s-sub green">+6.4%</span>
          </div>
        </div>
      </div>

      <!-- Por categoría -->
      <div>
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
      <div>
        <p class="ctx-label">Stock Alerts</p>
        <div v-for="alert in stockAlerts" :key="alert.code" class="alert-card">
          <span class="alert-name">{{ alert.name }}</span>
          <span class="alert-code">{{ alert.code }} · {{ alert.stock }} units left</span>
          <span class="alert-status" :class="alert.stock === 0 ? 'red' : 'gold'">{{ alert.message }}</span>
        </div>
      </div>

      <!-- Acciones rápidas -->
      <div>
        <p class="ctx-label">Quick Actions</p>
        <button class="ctx-btn-primary" @click="openNewProduct">
          <svg class="icon16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="#0a0a0a" stroke-width="1.5" stroke-linecap="square"/>
          </svg>
          <span>Add product</span>
        </button>
        <button class="ctx-btn-secondary" @click="exportInventory">
          <svg class="icon16" viewBox="0 0 16 16" fill="none">
            <path d="M3 12h10M8 3v7M5 7l3 3 3-3" stroke="#faf8f5" stroke-width="1.4" stroke-linecap="square"/>
          </svg>
          <span>Export inventory</span>
        </button>
      </div>

      <div class="data-source">
        <div class="ds-label">Data Source</div>
        <div class="ds-text">Inventory database · Last sync: 3 min ago</div>
      </div>

    </aside>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import './InventoryPage.css'
import Anchor from '../components/UI/Button/Anchor.vue'

const searchQuery = ref('')
const activeCategory = ref('All')
const selectedProduct = ref(null)

const categories = ['All', 'Notebooks', 'Writing', 'Art', 'Organization', 'Technology', 'Books']

const products = ref([
  {
    code: 'NB-001', name: 'Moleskine Classic Notebook A5', category: 'Notebooks',
    price: 18.90, stock: 64,
    svgIcon: '<rect x="10" y="8" width="28" height="34" rx="2" stroke="#faf8f5" stroke-width="1.5"/><path d="M10 14h28M16 8v34" stroke="#faf8f5" stroke-width="1.5"/>',
  },
  {
    code: 'WR-014', name: 'Stabilo Point 88 Fineliner Set x30', category: 'Writing',
    price: 24.50, stock: 41,
    svgIcon: '<path d="M12 36V14a2 2 0 012-2h20a2 2 0 012 2v22" stroke="#faf8f5" stroke-width="1.5"/><path d="M8 36h32M20 22h8M20 28h5" stroke="#faf8f5" stroke-width="1.5"/>',
  },
  {
    code: 'ART-032', name: 'Winsor & Newton Watercolours 24 Set', category: 'Art',
    price: 67.00, stock: 5,
    svgIcon: '<rect x="8" y="16" width="32" height="20" rx="2" stroke="#faf8f5" stroke-width="1.5"/><path d="M16 16V12a4 4 0 018 0v4" stroke="#faf8f5" stroke-width="1.5"/><circle cx="24" cy="26" r="3" stroke="#faf8f5" stroke-width="1.5"/>',
  },
  {
    code: 'ORG-007', name: 'Leuchtturm1917 Weekly Planner A5', category: 'Organization',
    price: 32.00, stock: 28,
    svgIcon: '<rect x="10" y="10" width="28" height="28" rx="2" stroke="#faf8f5" stroke-width="1.5"/><path d="M10 18h28M18 10v28" stroke="#faf8f5" stroke-width="1.5"/>',
  },
  {
    code: 'BK-088', name: 'Atomic Habits — James Clear', category: 'Books',
    price: 14.99, stock: 0,
    svgIcon: '<path d="M10 38V10l7 5 7-5 7 5 7-5v28l-7-5-7 5-7-5-7 5z" stroke="#faf8f5" stroke-width="1.5" stroke-linejoin="round"/>',
  },
  {
    code: 'WR-029', name: 'Faber-Castell Colour Pencils 60 pc', category: 'Writing',
    price: 45.00, stock: 19,
    svgIcon: '<rect x="12" y="8" width="24" height="32" rx="2" stroke="#faf8f5" stroke-width="1.5"/><path d="M12 16h24M12 24h24M12 32h16" stroke="#faf8f5" stroke-width="1.5"/>',
  },
  {
    code: 'TEC-003', name: 'Wacom Intuos S Graphics Tablet', category: 'Technology',
    price: 89.99, stock: 3,
    svgIcon: '<rect x="8" y="14" width="32" height="22" rx="2" stroke="#faf8f5" stroke-width="1.5"/><path d="M16 14v-4M32 14v-4M8 22h32" stroke="#faf8f5" stroke-width="1.5" stroke-linecap="square"/>',
  },
  {
    code: 'ORG-019', name: 'Bamboo Desk Organiser', category: 'Organization',
    price: 29.90, stock: 33,
    svgIcon: '<path d="M14 10h20v28H14z" stroke="#faf8f5" stroke-width="1.5"/><path d="M10 14h4M10 24h4M10 34h4M34 14h4M34 24h4M34 34h4" stroke="#faf8f5" stroke-width="1.5" stroke-linecap="square"/>',
  },
])

const filteredProducts = computed(() => {
  return products.value.filter(p => {
    const matchesCat = activeCategory.value === 'All' || p.category === activeCategory.value
    const q = searchQuery.value.toLowerCase()
    const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    return matchesCat && matchesSearch
  })
})

const stats = computed(() => ({
  total: products.value.length,
  lowStock: products.value.filter(p => p.stock > 0 && p.stock <= 5).length,
  outOfStock: products.value.filter(p => p.stock === 0).length,
  totalValue: Math.round(products.value.reduce((acc, p) => acc + p.price * p.stock, 0) / 1000) + 'K',
}))

const categoryStats = computed(() => {
  const colors = { Writing: '#c9a962', Notebooks: '#60a5fa', Art: '#a78bfa', Books: '#34d399', Organization: '#f97316', Technology: '#fb7185' }
  const totals = {}
  products.value.forEach(p => { totals[p.category] = (totals[p.category] || 0) + 1 })
  const max = Math.max(...Object.values(totals))
  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count, pct: Math.round((count / max) * 100), color: colors[name] || '#888' }))
})

const stockAlerts = computed(() =>
  products.value
    .filter(p => p.stock <= 5)
    .sort((a, b) => a.stock - b.stock)
    .map(p => ({
      name: p.name.length > 24 ? p.name.slice(0, 24) + '…' : p.name,
      code: p.code,
      stock: p.stock,
      message: p.stock === 0 ? 'Out of stock' : p.stock <= 3 ? 'Critical stock' : 'Low stock — reorder soon',
    }))
)

function stockBadgeClass(stock) {
  if (stock === 0) return 'badge-out'
  if (stock <= 5) return 'badge-low'
  return 'badge-ok'
}

function stockLabel(stock) {
  if (stock === 0) return 'Out of stock'
  if (stock <= 5) return 'Low stock'
  return 'In stock'
}

function stockNumClass(stock) {
  if (stock === 0) return 'red'
  if (stock <= 5) return 'gold'
  return ''
}

function openNewProduct() {
  // TODO: abrir modal/form para nuevo producto
}

function exportInventory() {
  // TODO: exportar CSV
}
</script>
