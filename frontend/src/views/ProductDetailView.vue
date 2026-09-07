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

            <div class="barcode-editor">
              <span class="stat-label">Barcode</span>
              <div class="barcode-edit-row">
                <input v-model="barcodeInput" class="barcode-input" placeholder="No barcode assigned" />
                <button type="button" class="barcode-scan-btn" title="Scan" @click="showScanner = true">
                  <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                    <path d="M2 5V3a1 1 0 0 1 1-1h2M16 5V3a1 1 0 0 0-1-1h-2M2 13v2a1 1 0 0 0 1 1h2M16 13v2a1 1 0 0 1-1 1h-2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                    <path d="M4.5 6v6M7 6v6M9.5 6v6M12 6v6M13.5 6v6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                  </svg>
                </button>
                <button
                  type="button"
                  class="barcode-save-btn"
                  :disabled="savingBarcode || barcodeInput.trim() === (product.codigo_barras || '')"
                  @click="saveBarcode"
                >{{ savingBarcode ? 'Saving…' : 'Save' }}</button>
              </div>
              <p v-if="barcodeMsg" class="barcode-msg" :class="barcodeMsgType">{{ barcodeMsg }}</p>
            </div>
          </article>

          <BarcodeScanner v-model="showScanner" @detected="onBarcodeDetected" />

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
import BarcodeScanner from '../components/inventory/BarcodeScanner.vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const authStore = useAuthStore()

const loading = ref(true)
const error = ref(null)
const product = ref(null)

// Barcode assignment for an existing product
const barcodeInput = ref('')
const savingBarcode = ref(false)
const barcodeMsg = ref('')
const barcodeMsgType = ref('ok')
const showScanner = ref(false)

function onBarcodeDetected(code) {
  barcodeInput.value = code
  showScanner.value = false
}

async function saveBarcode() {
  if (!product.value) return
  savingBarcode.value = true
  barcodeMsg.value = ''
  try {
    const value = barcodeInput.value.trim()
    const res = await fetch(`/api/products/${productId.value}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ codigo_barras: value || null }),
    })
    const payload = await res.json().catch(() => ({}))
    if (res.status === 409) { barcodeMsg.value = payload.message || 'That barcode is already in use.'; barcodeMsgType.value = 'err'; return }
    if (res.status === 403) { barcodeMsg.value = 'You do not have permission to edit this product.'; barcodeMsgType.value = 'err'; return }
    if (!res.ok) { barcodeMsg.value = payload.message || `Error ${res.status}`; barcodeMsgType.value = 'err'; return }
    product.value.codigo_barras = value || null
    barcodeMsg.value = 'Barcode saved.'
    barcodeMsgType.value = 'ok'
  } catch {
    barcodeMsg.value = 'Network error, try again.'
    barcodeMsgType.value = 'err'
  } finally {
    savingBarcode.value = false
  }
}

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
    barcodeInput.value = payload.data?.codigo_barras || ''
    barcodeMsg.value = ''
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
.product-detail-root {
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  color: var(--k-color-text);
  font-family: var(--k-font-sans);
}

.product-detail-root::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  background: rgba(var(--k-color-black-rgb), 0.75);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  pointer-events: none;
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
  font-family: var(--k-font-display);
  font-size: var(--k-font-size-heading-1);
}

.state-msg {
  color: var(--k-text-muted);
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
  font-size: var(--k-font-size-caption-lg);
  font-weight: var(--k-font-weight-semibold);
}

.ghost-link {
  color: var(--k-color-text);
  border: var(--k-border-width) solid var(--k-shade-7);
  background: var(--k-shade-3);
}

.btn-primary {
  border: none;
  cursor: pointer;
  background: var(--k-color-primary);
  color: var(--k-form-btn-text);
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
  color: var(--k-color-primary);
  font-size: var(--k-font-size-caption);
  letter-spacing: var(--k-tracking-caps);
  text-transform: uppercase;
}

.title {
  font-family: var(--k-font-display);
  font-size: var(--k-font-size-display-2);
  font-weight: var(--k-font-weight-regular);
  margin: 8px 0 6px;
}

.subtitle {
  color: var(--k-text-muted);
  font-size: var(--k-font-size-body-main);
}

.stock-pill {
  border: 1px solid currentColor;
  padding: 8px 12px;
  font-size: var(--k-font-size-caption);
  letter-spacing: var(--k-tracking-caps);
  text-transform: uppercase;
  background: var(--k-shade-3);
}

.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(300px, 0.9fr);
  gap: 24px;
  margin-bottom: 24px;
}

.hero-card,
.suppliers-card {
  background: var(--k-shade-2);
  border: var(--k-border-width) solid var(--k-color-border);
  padding: var(--k-space-5);
}

.hero-card.secondary {
  background: var(--k-shade-1);
}

.description {
  margin-top: 14px;
  color: var(--k-text-soft);
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
  background: var(--k-shade-3);
  border: var(--k-border-width) solid var(--k-color-border);
  padding: var(--k-space-3);
  min-width: 0;
}

.stat-label,
.mini-label {
  display: block;
  color: var(--k-text-muted);
  font-size: var(--k-font-size-caption);
  letter-spacing: var(--k-tracking-caps);
  text-transform: uppercase;
  margin-bottom: 8px;
}

.stat-value,
.mini-value {
  font-size: var(--k-font-size-heading-2);
  font-weight: var(--k-font-weight-bold);
  color: var(--k-color-text);
  font-variant-numeric: tabular-nums;
}

.barcode-editor {
  margin-top: 18px;
  padding-top: 18px;
  border-top: var(--k-border-width) solid var(--k-color-border);
}
.barcode-edit-row {
  display: flex;
  gap: 8px;
  align-items: stretch;
}
.barcode-input {
  flex: 1;
  background: var(--k-shade-1);
  border: var(--k-border-width) solid var(--k-color-border);
  color: var(--k-color-text);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-main);
  padding: 10px 12px;
  outline: none;
  min-width: 0;
}
.barcode-input:focus { border-color: var(--k-color-primary); }
.barcode-scan-btn {
  flex: 0 0 auto;
  width: 44px;
  background: var(--k-shade-1);
  border: var(--k-border-width) solid var(--k-color-border);
  color: var(--k-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color .15s, color .15s;
}
.barcode-scan-btn:hover { border-color: var(--k-color-primary); color: var(--k-color-primary); }
.barcode-save-btn {
  flex: 0 0 auto;
  background: var(--k-color-primary);
  border: none;
  color: var(--k-form-btn-text);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  font-weight: var(--k-font-weight-bold);
  padding: 0 16px;
  cursor: pointer;
  transition: filter .15s;
}
.barcode-save-btn:hover:not(:disabled) { filter: brightness(1.08); }
.barcode-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.barcode-msg {
  margin-top: 8px;
  font-size: var(--k-font-size-caption-lg);
  font-family: var(--k-font-sans);
}
.barcode-msg.ok { color: var(--k-state-success-text); }
.barcode-msg.err { color: var(--k-state-error-text); }

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
  color: var(--k-text-muted);
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
  font-family: var(--k-font-display);
  font-size: var(--k-font-size-heading-1);
  font-weight: var(--k-font-weight-regular);
}

.section-count {
  color: var(--k-text-muted);
  font-size: var(--k-font-size-caption-lg);
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
  border: var(--k-border-width) solid var(--k-color-border);
  background: var(--k-shade-3);
}

.supplier-name {
  color: var(--k-color-text);
}

.supplier-date,
.empty-box {
  margin-top: 4px;
  color: var(--k-text-muted);
  font-size: var(--k-font-size-body-small);
}

.empty-box {
  margin-top: 0;
  padding: 20px;
  border: 1px dashed var(--k-shade-7);
  text-align: center;
}

.supplier-price {
  font-size: 18px;
  font-weight: 700;
  color: var(--k-state-success-text);
  font-variant-numeric: tabular-nums;
}

.healthy {
  color: var(--k-state-success-text);
}

.warning {
  color: var(--Primary);
}

.danger {
  color: var(--k-state-error-text);
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
