<template>
  <div class="suppliers-root">
    <AppNavbar />
    <main class="suppliers-content">
      <header class="page-header">
        <div>
          <p class="eyebrow">Inventory / partners</p>
          <h1>Suppliers</h1>
          <p class="subtitle">Keep supplier contacts and purchasing relationships in one place.</p>
        </div>
        <button v-if="canManage" class="primary-button" type="button" @click="openCreate">Add supplier</button>
      </header>

      <div class="toolbar">
        <label class="search-field">
          <span>Search suppliers</span>
          <input v-model="searchQuery" type="search" placeholder="Name, contact or email" />
        </label>
        <span class="result-count">{{ filteredSuppliers.length }} suppliers</span>
      </div>

      <p v-if="loading" class="state-message">Loading suppliers...</p>
      <p v-else-if="error" class="state-message state-error">{{ error }}</p>
      <div v-else-if="!filteredSuppliers.length" class="empty-state">
        <h2>No suppliers found</h2>
        <p>{{ searchQuery ? 'Try another search.' : 'Add your first supplier to start organizing purchasing contacts.' }}</p>
      </div>
      <section v-else class="supplier-grid" aria-label="Supplier list">
        <article v-for="supplier in filteredSuppliers" :key="supplier.id_proveedor" class="supplier-card">
          <div class="card-heading">
            <div>
              <p class="supplier-id">SUP-{{ String(supplier.id_proveedor).padStart(3, '0') }}</p>
              <h2>{{ supplier.nombre }}</h2>
            </div>
            <button v-if="canManage" class="icon-button" type="button" title="Edit supplier" @click="openEdit(supplier)">Edit</button>
          </div>
          <dl class="contact-list">
            <div><dt>Contact</dt><dd>{{ supplier.contacto_nombre || 'Not provided' }}</dd></div>
            <div><dt>Phone</dt><dd>{{ supplier.telefono || 'Not provided' }}</dd></div>
            <div><dt>Email</dt><dd>{{ supplier.email || 'Not provided' }}</dd></div>
          </dl>
          <button class="details-link" type="button" @click="openDetails(supplier)">View details <span aria-hidden="true">-></span></button>
        </article>
      </section>
    </main>

    <div v-if="modalOpen" class="modal-backdrop" @click.self="closeModal">
      <form class="supplier-modal" @submit.prevent="saveSupplier">
        <div class="modal-heading">
          <div>
            <p class="eyebrow">Supplier record</p>
            <h2>{{ editingSupplier ? 'Edit supplier' : 'Add supplier' }}</h2>
          </div>
          <button class="close-button" type="button" aria-label="Close" @click="closeModal">x</button>
        </div>
        <label>Supplier name<input v-model.trim="form.nombre" required maxlength="255" /></label>
        <label>Contact name<input v-model.trim="form.contacto_nombre" maxlength="255" /></label>
        <div class="form-row">
          <label>Phone<input v-model.trim="form.telefono" maxlength="20" /></label>
          <label>Email<input v-model.trim="form.email" type="email" /></label>
        </div>
        <p v-if="formError" class="state-error">{{ formError }}</p>
        <div class="modal-actions">
          <button class="secondary-button" type="button" @click="closeModal">Cancel</button>
          <button class="primary-button" type="submit" :disabled="saving">{{ saving ? 'Saving...' : 'Save supplier' }}</button>
        </div>
      </form>
    </div>

    <div v-if="detailsSupplier" class="modal-backdrop" @click.self="detailsSupplier = null">
      <section class="supplier-modal details-modal">
        <div class="modal-heading">
          <div><p class="eyebrow">Supplier record</p><h2>{{ detailsSupplier.nombre }}</h2></div>
          <button class="close-button" type="button" aria-label="Close" @click="detailsSupplier = null">x</button>
        </div>
        <p class="details-copy">Use this supplier when registering inventory movements or linking product quotes.</p>
        <dl class="contact-list details-list">
          <div><dt>Contact</dt><dd>{{ detailsSupplier.contacto_nombre || 'Not provided' }}</dd></div>
          <div><dt>Phone</dt><dd>{{ detailsSupplier.telefono || 'Not provided' }}</dd></div>
          <div><dt>Email</dt><dd>{{ detailsSupplier.email || 'Not provided' }}</dd></div>
        </dl>
        <div v-if="canManage" class="modal-actions">
          <button class="danger-button" type="button" @click="removeSupplier(detailsSupplier)">Delete supplier</button>
          <button class="secondary-button" type="button" @click="detailsSupplier = null">Close</button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import AppNavbar from '../components/AppNavbar.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const suppliers = ref([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const formError = ref('')
const searchQuery = ref('')
const modalOpen = ref(false)
const editingSupplier = ref(null)
const detailsSupplier = ref(null)
const form = reactive({ nombre: '', contacto_nombre: '', telefono: '', email: '' })
const canManage = computed(() => authStore.canManageInventory)

const filteredSuppliers = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return suppliers.value
  return suppliers.value.filter((supplier) => [supplier.nombre, supplier.contacto_nombre, supplier.email, supplier.telefono].some((value) => value?.toLowerCase().includes(query)))
})

function headers() {
  const token = localStorage.getItem('token')
  const result = token ? { Authorization: `Bearer ${token}` } : {}
  if (authStore.idEmpresaActual) result['X-Company-ID'] = authStore.idEmpresaActual
  return { ...result, 'Content-Type': 'application/json' }
}

async function loadSuppliers() {
  loading.value = true
  error.value = ''
  try {
    if (!authStore.user) await authStore.fetchMe()
    if (!authStore.accessContext) await authStore.loadAccessContext()
    const response = await fetch('/api/suppliers', { headers: headers() })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.message || `Unable to load suppliers (${response.status})`)
    suppliers.value = payload.data ?? []
  } catch (err) {
    error.value = err.message || 'Unable to load suppliers.'
  } finally {
    loading.value = false
  }
}

function resetForm() {
  Object.assign(form, { nombre: '', contacto_nombre: '', telefono: '', email: '' })
  formError.value = ''
}

function openCreate() {
  editingSupplier.value = null
  resetForm()
  modalOpen.value = true
}

function openEdit(supplier) {
  editingSupplier.value = supplier
  Object.assign(form, { nombre: supplier.nombre, contacto_nombre: supplier.contacto_nombre || '', telefono: supplier.telefono || '', email: supplier.email || '' })
  formError.value = ''
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  editingSupplier.value = null
}

function openDetails(supplier) {
  detailsSupplier.value = supplier
}

async function saveSupplier() {
  saving.value = true
  formError.value = ''
  const id = editingSupplier.value?.id_proveedor
  try {
    const response = await fetch(id ? `/api/suppliers/${id}` : '/api/suppliers', {
      method: id ? 'PUT' : 'POST',
      headers: headers(),
      body: JSON.stringify(form),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.message || 'Unable to save supplier.')
    await loadSuppliers()
    closeModal()
  } catch (err) {
    formError.value = err.message || 'Unable to save supplier.'
  } finally {
    saving.value = false
  }
}

async function removeSupplier(supplier) {
  if (!window.confirm(`Delete ${supplier.nombre}?`)) return
  try {
    const response = await fetch(`/api/suppliers/${supplier.id_proveedor}`, { method: 'DELETE', headers: headers() })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.message || 'Unable to delete supplier.')
    detailsSupplier.value = null
    await loadSuppliers()
  } catch (err) {
    error.value = err.message || 'Unable to delete supplier.'
  }
}

onMounted(loadSuppliers)
</script>

<style scoped>
.suppliers-root { min-height: 100vh; background: var(--k-color-bg); color: var(--k-color-text); font-family: var(--k-font-sans); }
.suppliers-content { max-width: 1240px; margin: 0 auto; padding: 104px var(--k-space-6) var(--k-space-8); }
.page-header, .toolbar, .card-heading, .modal-heading, .modal-actions { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--k-space-4); }
.page-header { margin-bottom: var(--k-space-6); }
.eyebrow { color: var(--k-color-primary); font-size: var(--k-font-size-caption); letter-spacing: var(--k-tracking-caps); text-transform: uppercase; }
h1, h2 { font-family: var(--k-font-display); font-weight: var(--k-font-weight-regular); }
h1 { margin: var(--k-space-2) 0; font-size: var(--k-font-size-display-2); }
h2 { font-size: var(--k-font-size-heading-1); }
.subtitle, .details-copy { color: var(--k-text-muted); }
.toolbar { align-items: end; padding: var(--k-space-4) 0; border-top: var(--k-border-width) solid var(--k-color-border); border-bottom: var(--k-border-width) solid var(--k-color-border); margin-bottom: var(--k-space-5); }
.search-field { display: grid; gap: var(--k-space-2); color: var(--k-text-muted); font-size: var(--k-font-size-caption); }
.search-field input, label input { border: var(--k-border-width) solid var(--k-color-border); background: var(--k-form-input-bg); color: var(--k-color-text); padding: var(--k-space-3); font: inherit; min-width: 260px; }
input:focus { border-color: var(--k-color-primary); outline: none; }
.result-count, .supplier-id { color: var(--k-text-muted); font-size: var(--k-font-size-caption-lg); }
.primary-button, .secondary-button, .danger-button, .icon-button, .close-button { min-height: var(--k-target-min-size); border: var(--k-border-width) solid transparent; padding: 0 var(--k-space-4); cursor: pointer; font: inherit; }
.primary-button { background: var(--k-color-primary); color: var(--k-form-btn-text); }
.secondary-button, .icon-button { background: var(--k-shade-3); border-color: var(--k-color-border); color: var(--k-color-text); }
.danger-button { background: transparent; border-color: var(--k-state-error-text); color: var(--k-state-error-text); }
.icon-button, .close-button { min-height: 32px; padding: 0 var(--k-space-2); }
.primary-button:disabled { opacity: .55; cursor: not-allowed; }
.supplier-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--k-space-4); }
.supplier-card { background: var(--k-shade-2); border: var(--k-border-width) solid var(--k-color-border); padding: var(--k-space-5); display: grid; gap: var(--k-space-4); }
.supplier-card h2 { margin-top: var(--k-space-2); }
.contact-list { display: grid; gap: var(--k-space-3); margin: 0; }
.contact-list div { display: grid; gap: var(--k-space-1); }
dt { color: var(--k-text-muted); font-size: var(--k-font-size-caption); text-transform: uppercase; letter-spacing: var(--k-tracking-caps); }
dd { margin: 0; overflow-wrap: anywhere; }
.details-link { background: none; border: 0; border-top: var(--k-border-width) solid var(--k-color-border); color: var(--k-color-primary); padding: var(--k-space-3) 0 0; text-align: left; cursor: pointer; }
.empty-state, .state-message { padding: var(--k-space-8); text-align: center; color: var(--k-text-muted); }
.state-error { color: var(--k-state-error-text); }
.modal-backdrop { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: var(--k-space-4); background: rgba(var(--k-color-black-rgb), .78); }
.supplier-modal { width: min(100%, 560px); display: grid; gap: var(--k-space-4); background: var(--k-shade-2); border: var(--k-border-width) solid var(--k-color-border); padding: var(--k-space-5); }
.supplier-modal label { display: grid; gap: var(--k-space-2); color: var(--k-text-muted); font-size: var(--k-font-size-caption); }
.supplier-modal label input { min-width: 0; width: 100%; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--k-space-3); }
.close-button { background: transparent; color: var(--k-text-muted); }
.details-list { padding: var(--k-space-4) 0; }
@media (max-width: 900px) { .supplier-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 620px) { .suppliers-content { padding: 88px var(--k-space-4) var(--k-space-6); } .page-header, .toolbar { flex-direction: column; align-items: stretch; } .supplier-grid, .form-row { grid-template-columns: 1fr; } .search-field input { min-width: 0; } }
</style>
