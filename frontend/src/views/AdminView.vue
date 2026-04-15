<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import AppNavbar from '../components/AppNavbar.vue'
import { useAuthStore } from '../stores/auth'
import {
  fetchAdminStats,
  fetchAdminUsers,
  revokeUserToken,
  toggleUserActive,
  changeUserRole,
} from '../services/admin'

const authStore = useAuthStore()

// ── State ──────────────────────────────────────────────────────────────────────
const stats   = ref(null)
const users   = ref([])
const pagination = ref({ page: 1, limit: 20, total: 0, totalPages: 1 })

const loading      = ref(false)
const statsLoading = ref(false)
const actionLoading = ref(null) // user id currently performing an action

const filters = ref({ search: '', role: '', activo: '', page: 1 })
const toast   = ref(null) // { message, type: 'success' | 'error' }

const ROLES = ['admin', 'manager', 'collaborator']

// ── Data fetching ──────────────────────────────────────────────────────────────
async function loadStats() {
  statsLoading.value = true
  try {
    const res = await fetchAdminStats(authStore.token)
    stats.value = res.data
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    statsLoading.value = false
  }
}

async function loadUsers() {
  loading.value = true
  try {
    const res = await fetchAdminUsers(authStore.token, {
      page:   filters.value.page,
      limit:  pagination.value.limit,
      role:   filters.value.role   || undefined,
      activo: filters.value.activo !== '' ? filters.value.activo : undefined,
      search: filters.value.search || undefined,
    })
    users.value      = res.data
    pagination.value = res.pagination
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadStats()
  loadUsers()
})

// Re-fetch users when filters change (debounce the search field)
let searchTimer = null
watch(() => filters.value.search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    filters.value.page = 1
    loadUsers()
  }, 300)
})

watch([() => filters.value.role, () => filters.value.activo], () => {
  filters.value.page = 1
  loadUsers()
})

// ── Actions ────────────────────────────────────────────────────────────────────
async function onRevokeToken(user) {
  if (!confirm(`¿Revocar todas las sesiones activas de ${user.nombre} ${user.apellido}?`)) return
  actionLoading.value = `revoke-${user.id_usuario}`
  try {
    const res = await revokeUserToken(authStore.token, user.id_usuario)
    showToast(res.message, 'success')
    // Bump local token_version so the table reflects the change immediately
    const found = users.value.find(u => u.id_usuario === user.id_usuario)
    if (found) found.token_version = res.data.token_version
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    actionLoading.value = null
  }
}

async function onToggleActive(user) {
  const verb = user.activo ? 'desactivar' : 'activar'
  if (!confirm(`¿Deseas ${verb} la cuenta de ${user.nombre} ${user.apellido}?`)) return
  actionLoading.value = `toggle-${user.id_usuario}`
  try {
    const res = await toggleUserActive(authStore.token, user.id_usuario)
    showToast(res.message, 'success')
    const found = users.value.find(u => u.id_usuario === user.id_usuario)
    if (found) {
      found.activo        = res.data.activo
      found.token_version = res.data.token_version
    }
  } catch (e) {
    showToast(e.message, 'error')
  } finally {
    actionLoading.value = null
    loadStats()
  }
}

async function onChangeRole(user, newRole) {
  if (newRole === user.nombre_rol) return
  actionLoading.value = `role-${user.id_usuario}`
  try {
    const res = await changeUserRole(authStore.token, user.id_usuario, newRole)
    showToast(res.message, 'success')
    const found = users.value.find(u => u.id_usuario === user.id_usuario)
    if (found) found.nombre_rol = newRole
  } catch (e) {
    showToast(e.message, 'error')
    // Reload to revert the optimistic UI change
    loadUsers()
  } finally {
    actionLoading.value = null
    loadStats()
  }
}

// ── Pagination ─────────────────────────────────────────────────────────────────
function goToPage(p) {
  if (p < 1 || p > pagination.value.totalPages) return
  filters.value.page = p
  loadUsers()
}

// ── Toast ──────────────────────────────────────────────────────────────────────
let toastTimer = null
function showToast(message, type = 'success') {
  toast.value = { message, type }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = null }, 3500)
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function authMethod(user) {
  if (user.google_auth && user.password_auth) return 'Google + Contraseña'
  if (user.google_auth)   return 'Google'
  if (user.password_auth) return 'Contraseña'
  return '—'
}

const statCards = computed(() => {
  if (!stats.value) return []
  return [
    { label: 'Total usuarios',    value: stats.value.total,        color: '#c9a962' },
    { label: 'Activos',           value: stats.value.activos,      color: '#34d399' },
    { label: 'Inactivos',         value: stats.value.inactivos,    color: '#fb7185' },
    { label: 'Login con Google',  value: stats.value.google_users, color: '#60a5fa' },
  ]
})
</script>

<template>
  <div class="admin-layout">
    <AppNavbar />

    <main class="admin-main">
      <header class="admin-header">
        <div>
          <h1 class="admin-title">Panel de Administración</h1>
          <p class="admin-sub">Gestión de usuarios y sesiones</p>
        </div>
      </header>

      <!-- Stats cards -->
      <section class="stats-grid">
        <div
          v-for="card in statCards"
          :key="card.label"
          class="stat-card"
        >
          <span class="stat-value" :style="{ color: card.color }">
            {{ statsLoading ? '—' : card.value }}
          </span>
          <span class="stat-label">{{ card.label }}</span>
        </div>
      </section>

      <!-- Filters -->
      <section class="filters-row">
        <input
          v-model="filters.search"
          class="filter-input"
          placeholder="Buscar por nombre o email..."
          type="text"
        />

        <select v-model="filters.role" class="filter-select">
          <option value="">Todos los roles</option>
          <option v-for="r in ROLES" :key="r" :value="r">{{ r }}</option>
        </select>

        <select v-model="filters.activo" class="filter-select">
          <option value="">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
      </section>

      <!-- Users table -->
      <section class="table-wrapper">
        <div v-if="loading" class="table-loading">Cargando usuarios…</div>

        <table v-else class="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Usuario</th>
              <th>Email</th>
              <th>Método auth</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Token v.</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="users.length === 0">
              <td colspan="8" class="empty-row">No se encontraron usuarios.</td>
            </tr>
            <tr
              v-for="user in users"
              :key="user.id_usuario"
              :class="{ 'row-inactive': !user.activo }"
            >
              <td class="td-id">{{ user.id_usuario }}</td>

              <td>
                <div class="user-name">{{ user.nombre }} {{ user.apellido }}</div>
              </td>

              <td class="td-email">{{ user.email }}</td>

              <td>
                <span
                  class="badge"
                  :class="user.google_auth ? 'badge-google' : 'badge-pass'"
                >
                  {{ authMethod(user) }}
                </span>
              </td>

              <td>
                <select
                  class="role-select"
                  :value="user.nombre_rol"
                  :disabled="actionLoading === `role-${user.id_usuario}` || user.id_usuario === authStore.idUsuario"
                  @change="onChangeRole(user, $event.target.value)"
                >
                  <option v-for="r in ROLES" :key="r" :value="r">{{ r }}</option>
                </select>
              </td>

              <td>
                <span class="badge" :class="user.activo ? 'badge-active' : 'badge-inactive'">
                  {{ user.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </td>

              <td class="td-version">v{{ user.token_version }}</td>

              <td class="td-actions">
                <!-- Revoke token -->
                <button
                  class="action-btn btn-revoke"
                  :disabled="actionLoading !== null || user.id_usuario === authStore.idUsuario"
                  :title="user.id_usuario === authStore.idUsuario ? 'No puedes revocar tu propia sesión' : 'Revocar sesiones activas'"
                  @click="onRevokeToken(user)"
                >
                  <span v-if="actionLoading === `revoke-${user.id_usuario}`">…</span>
                  <span v-else>Revocar</span>
                </button>

                <!-- Toggle active -->
                <button
                  class="action-btn"
                  :class="user.activo ? 'btn-deactivate' : 'btn-activate'"
                  :disabled="actionLoading !== null || user.id_usuario === authStore.idUsuario"
                  :title="user.id_usuario === authStore.idUsuario ? 'No puedes desactivar tu propia cuenta' : (user.activo ? 'Desactivar cuenta' : 'Activar cuenta')"
                  @click="onToggleActive(user)"
                >
                  <span v-if="actionLoading === `toggle-${user.id_usuario}`">…</span>
                  <span v-else>{{ user.activo ? 'Desactivar' : 'Activar' }}</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Pagination -->
      <div v-if="!loading && pagination.totalPages > 1" class="pagination">
        <button class="page-btn" :disabled="filters.page <= 1" @click="goToPage(filters.page - 1)">
          ← Anterior
        </button>
        <span class="page-info">
          Página {{ pagination.page }} de {{ pagination.totalPages }}
          ({{ pagination.total }} usuarios)
        </span>
        <button class="page-btn" :disabled="filters.page >= pagination.totalPages" @click="goToPage(filters.page + 1)">
          Siguiente →
        </button>
      </div>
    </main>

    <!-- Toast notification -->
    <Transition name="toast">
      <div v-if="toast" class="toast" :class="`toast-${toast.type}`">
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.admin-layout {
  min-height: 100vh;
  background: #080808;
  color: #faf8f5;
  font-family: 'Manrope', sans-serif;
}

.admin-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 88px 32px 64px;
}

/* ── Header ── */
.admin-header {
  margin-bottom: 32px;
}

.admin-title {
  font-size: 22px;
  font-weight: 700;
  color: #faf8f5;
  letter-spacing: 0.02em;
  margin: 0 0 4px;
}

.admin-sub {
  font-size: 13px;
  color: #555;
  margin: 0;
}

/* ── Stats ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: #0f0f0f;
  border: 1px solid #1f1f1f;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: 11px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* ── Filters ── */
.filters-row {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-input,
.filter-select {
  background: #0f0f0f;
  border: 1px solid #2a2a2a;
  color: #faf8f5;
  padding: 8px 12px;
  font-size: 13px;
  font-family: 'Manrope', sans-serif;
  outline: none;
  transition: border-color 0.15s;
}

.filter-input {
  flex: 1;
  min-width: 220px;
}

.filter-input:focus,
.filter-select:focus {
  border-color: #c9a962;
}

.filter-select option {
  background: #0f0f0f;
}

/* ── Table ── */
.table-wrapper {
  background: #0a0a0a;
  border: 1px solid #1f1f1f;
  overflow-x: auto;
}

.table-loading {
  padding: 48px;
  text-align: center;
  color: #555;
  font-size: 14px;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.users-table th {
  background: #111;
  color: #666;
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #1f1f1f;
  white-space: nowrap;
}

.users-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #141414;
  vertical-align: middle;
  color: #ccc;
}

.users-table tr:last-child td {
  border-bottom: none;
}

.users-table tr:hover td {
  background: #0e0e0e;
}

.row-inactive td {
  opacity: 0.5;
}

.empty-row {
  text-align: center;
  color: #444;
  padding: 48px !important;
}

.td-id {
  color: #444;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.user-name {
  font-weight: 500;
  color: #e8e8e8;
}

.td-email {
  color: #888;
  font-size: 12px;
}

.td-version {
  color: #555;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

/* ── Badges ── */
.badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  border-radius: 2px;
}

.badge-google   { background: #1a2a3a; color: #60a5fa; }
.badge-pass     { background: #1a1a2a; color: #a78bfa; }
.badge-active   { background: #0d2418; color: #34d399; }
.badge-inactive { background: #2a0d0d; color: #fb7185; }

/* ── Role select ── */
.role-select {
  background: #141414;
  border: 1px solid #2a2a2a;
  color: #c9a962;
  padding: 4px 8px;
  font-size: 12px;
  font-family: 'Manrope', sans-serif;
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s;
}

.role-select:hover:not(:disabled) {
  border-color: #c9a962;
}

.role-select:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.role-select option {
  background: #141414;
}

/* ── Action buttons ── */
.td-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.action-btn {
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  font-family: 'Manrope', sans-serif;
  border: 1px solid transparent;
  cursor: pointer;
  transition: opacity 0.15s, background 0.15s;
  white-space: nowrap;
}

.action-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.btn-revoke {
  background: #1a1200;
  border-color: #3a2900;
  color: #c9a962;
}

.btn-revoke:hover:not(:disabled) {
  background: #2a1e00;
}

.btn-deactivate {
  background: #2a0d0d;
  border-color: #4a1a1a;
  color: #fb7185;
}

.btn-deactivate:hover:not(:disabled) {
  background: #3a1212;
}

.btn-activate {
  background: #0d2418;
  border-color: #1a4030;
  color: #34d399;
}

.btn-activate:hover:not(:disabled) {
  background: #112e1e;
}

/* ── Pagination ── */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-top: 24px;
}

.page-btn {
  background: #111;
  border: 1px solid #2a2a2a;
  color: #c9a962;
  padding: 6px 14px;
  font-size: 12px;
  font-family: 'Manrope', sans-serif;
  cursor: pointer;
  transition: border-color 0.15s;
}

.page-btn:hover:not(:disabled) {
  border-color: #c9a962;
}

.page-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.page-info {
  font-size: 12px;
  color: #555;
}

/* ── Toast ── */
.toast {
  position: fixed;
  bottom: 32px;
  right: 32px;
  padding: 12px 20px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid transparent;
  z-index: 9999;
  max-width: 380px;
}

.toast-success {
  background: #0d2418;
  border-color: #1a4030;
  color: #34d399;
}

.toast-error {
  background: #2a0d0d;
  border-color: #4a1a1a;
  color: #fb7185;
}

.toast-enter-active,
.toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from   { opacity: 0; transform: translateY(12px); }
.toast-leave-to     { opacity: 0; transform: translateY(12px); }

/* ── Responsive ── */
@media (max-width: 900px) {
  .admin-main { padding: 80px 16px 48px; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .filters-row { flex-direction: column; }
}
</style>
