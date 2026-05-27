<template>
  <div class="product-detail-root">
    <AppNavbar />

    <main class="content">
      <div v-if="loading" class="state-screen">
        <p class="state-title">Loading product</p>
        <p class="state-msg">Fetching the latest inventory details.</p>
      </div>

      <div v-else-if="error" class="state-screen">
        <p class="state-title">Could not load product</p>
        <p class="state-msg">{{ error }}</p>
        <div class="state-actions">
          <RouterLink class="ghost-link" :to="backTarget">Back to inventory</RouterLink>
          <button class="btn-primary" @click="loadProduct">Retry</button>
        </div>
      </div>

      <template v-else-if="product">
        <header class="detail-header">
          <RouterLink class="ghost-link" :to="backTarget">
            <span aria-hidden="true">←</span>
            <span>Back to inventory</span>
          </RouterLink>

          <div class="detail-header-main">
            <div>
              <p class="eyebrow">{{ product.categoria || 'Uncategorized' }}</p>
              <h1 class="title">{{ product.nombre }}</h1>
              <p class="subtitle">
                {{ product.proyecto_nombre || 'Project not available' }}
              </p>
            </div>

            <div class="stock-pill" :class="stockTone">
              {{ stockLabel }}
            </div>
          </div>
        </header>

        <section class="hero-grid">
          <article class="hero-card">
            <p class="section-kicker">Overview</p>
            <p class="description">
              {{ product.descripcion || 'No description available for this product yet.' }}
            </p>

            <div class="hero-stats">
              <div class="stat-box">
                <span class="stat-label">Sale price</span>
                <strong class="stat-value">${{ formatMoney(product.precio_venta) }}</strong>
              </div>
              <div class="stat-box">
                <span class="stat-label">Cost price</span>
                <strong class="stat-value">${{ formatMoney(product.precio_costo) }}</strong>
              </div>
              <div class="stat-box">
                <span class="stat-label">Weighted avg. cost</span>
                <strong class="stat-value">${{ formatMoney(product.costo_promedio_ponderado) }}</strong>
              </div>
            </div>
          </article>

          <article class="hero-card secondary">
            <p class="section-kicker">Stock</p>
            <div class="stock-metric">
              <span class="stock-number" :class="stockTone">{{ product.stock_actual }}</span>
              <span class="stock-caption">units available</span>
            </div>

            <div class="stock-details">
              <div class="mini-stat">
                <span class="mini-label">Minimum stock</span>
                <strong class="mini-value">{{ product.stock_minimo }}</strong>
              </div>
              <div class="mini-stat">
                <span class="mini-label">Status</span>
                <strong class="mini-value">{{ stockLabel }}</strong>
              </div>
              <div class="mini-stat">
                <span class="mini-label">Project</span>
                <strong class="mini-value">{{ product.proyecto_nombre || 'N/A' }}</strong>
              </div>
            </div>
          </article>
        </section>

        <section class="suppliers-card">
          <div class="section-head">
            <div>
              <p class="section-kicker">Suppliers</p>
              <h2 class="section-title">Linked supplier quotes</h2>
            </div>
            <span class="section-count">
              {{ suppliers.length }} {{ suppliers.length === 1 ? 'supplier' : 'suppliers' }}
            </span>
          </div>

          <div v-if="!suppliers.length" class="empty-box">
            No suppliers linked to this product yet.
          </div>

          <div v-else class="supplier-list">
            <article v-for="supplier in suppliers" :key="supplier.id_proveedor" class="supplier-row">
              <div>
                <strong class="supplier-name">{{ supplier.nombre }}</strong>
                <p class="supplier-date">
                  Last quote: {{ formatDate(supplier.fecha_ultima_cotizacion) }}
                </p>
              </div>
              <div class="supplier-price">
                ${{ formatMoney(supplier.precio_unitario) }}
              </div>
            </article>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppNavbar from '../components/AppNavbar.vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const authStore = useAuthStore()

const loading = ref(true)
const error = ref(null)
const product = ref(null)

const productId = computed(() => route.params.id)
const projectQuery = computed(() => {
  const value = Number(route.query.project)
  return Number.isFinite(value) && value > 0 ? value : null
})

const backTarget = computed(() =>
  projectQuery.value
    ? { name: 'inventory', query: { project: projectQuery.value } }
    : { name: 'inventory' }
)

const suppliers = computed(() => product.value?.proveedores ?? [])

const stockLabel = computed(() => {
  if (!product.value) return ''
  if (product.value.stock_actual === 0) return 'Out of stock'
  if (product.value.stock_actual <= product.value.stock_minimo) return 'Low stock'
  return 'In stock'
})

const stockTone = computed(() => {
  if (!product.value) return ''
  if (product.value.stock_actual === 0) return 'danger'
  if (product.value.stock_actual <= product.value.stock_minimo) return 'warning'
  return 'healthy'
})

function authHeader() {
  const token = localStorage.getItem('token')
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  if (authStore.idEmpresaActual) headers['X-Company-ID'] = authStore.idEmpresaActual
  return headers
}

async function loadProduct() {
  loading.value = true
  error.value = null

  try {
    if (!authStore.user) await authStore.fetchMe()

    const accessEmpresaId = authStore.accessContext?.empresa?.id_empresa
    if (accessEmpresaId !== authStore.idEmpresaActual) {
      await authStore.loadAccessContext()
    }

    const res = await fetch(`/api/products/${productId.value}`, {
      headers: authHeader(),
    })
    const payload = await res.json().catch(() => ({}))

    if (res.status === 401) {
      throw new Error('Session required.')
    }
    if (res.status === 403) {
      throw new Error(payload.message || 'You do not have access to this product.')
    }
    if (res.status === 404) {
      throw new Error('Product not found.')
    }
    if (!res.ok) {
      throw new Error(payload.message || `HTTP ${res.status}`)
    }

    product.value = payload.data
  } catch (err) {
    product.value = null
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatDate(value) {
  if (!value) return 'No quote date'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'No quote date'
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

onMounted(loadProduct)
watch(() => route.params.id, loadProduct)
watch(() => authStore.idEmpresaActual, loadProduct)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Manrope:wght@400;500;600;700&display=swap');

.product-detail-root {
  min-height: 100vh;
  background: rgba(10, 10, 10, 0.75);
  backdrop-filter: blur(10px);
  color: #faf8f5;
  font-family: 'Manrope', sans-serif;
}

.content {
  max-width: 1180px;
  margin: 0 auto;
  padding: 84px 40px 48px;
}

.state-screen {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  text-align: center;
}

.state-title {
  font-family: 'Playfair Display', serif;
  font-size: 30px;
}

.state-msg {
  color: #9a9a9a;
  max-width: 460px;
  line-height: 1.6;
}

.state-actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.ghost-link,
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  text-decoration: none;
  font-size: 12px;
  font-weight: 600;
}

.ghost-link {
  color: #faf8f5;
  border: 1px solid #2a2a2a;
  background: #111111;
}

.btn-primary {
  border: none;
  cursor: pointer;
  background: #c9a962;
  color: #0a0a0a;
}

.detail-header {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 28px;
}

.detail-header-main {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.eyebrow,
.section-kicker {
  color: #c9a962;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.title {
  font-family: 'Playfair Display', serif;
  font-size: 44px;
  font-weight: 400;
  margin: 8px 0 6px;
}

.subtitle {
  color: #8f8f8f;
  font-size: 14px;
}

.stock-pill {
  border: 1px solid currentColor;
  padding: 8px 12px;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  background: #111111;
}

.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(300px, 0.9fr);
  gap: 24px;
  margin-bottom: 24px;
}

.hero-card,
.suppliers-card {
  background: #0f0f0f;
  border: 1px solid #1f1f1f;
  padding: 24px;
}

.hero-card.secondary {
  background: #0c0c0c;
}

.description {
  margin-top: 14px;
  color: #d2d2d2;
  line-height: 1.7;
  min-height: 72px;
}

.hero-stats {
  margin-top: 20px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.stat-box,
.mini-stat {
  background: #111111;
  border: 1px solid #1f1f1f;
  padding: 14px;
  min-width: 0;
}

.stat-label,
.mini-label {
  display: block;
  color: #8f8f8f;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.stat-value,
.mini-value {
  font-size: 20px;
  font-weight: 700;
  color: #faf8f5;
  font-variant-numeric: tabular-nums;
}

.stock-metric {
  margin-top: 14px;
  margin-bottom: 18px;
}

.stock-number {
  display: block;
  font-size: 52px;
  line-height: 1;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.stock-caption {
  display: block;
  margin-top: 6px;
  color: #8f8f8f;
}

.stock-details {
  display: grid;
  gap: 12px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.section-title {
  margin-top: 6px;
  font-family: 'Playfair Display', serif;
  font-size: 28px;
  font-weight: 400;
}

.section-count {
  color: #8f8f8f;
  font-size: 12px;
}

.supplier-list {
  display: grid;
  gap: 12px;
}

.supplier-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid #1f1f1f;
  background: #111111;
}

.supplier-name {
  color: #faf8f5;
}

.supplier-date,
.empty-box {
  margin-top: 4px;
  color: #8f8f8f;
  font-size: 13px;
}

.empty-box {
  margin-top: 0;
  padding: 20px;
  border: 1px dashed #2a2a2a;
  text-align: center;
}

.supplier-price {
  font-size: 18px;
  font-weight: 700;
  color: #34d399;
  font-variant-numeric: tabular-nums;
}

.healthy {
  color: #34d399;
}

.warning {
  color: #c9a962;
}

.danger {
  color: #fb7185;
}

@media (max-width: 900px) {
  .content {
    padding: 80px 24px 36px;
  }

  .hero-grid {
    grid-template-columns: 1fr;
  }

  .hero-stats {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .title {
    font-size: 32px;
  }

  .section-head,
  .supplier-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .stock-number {
    font-size: 40px;
  }
}
</style>
