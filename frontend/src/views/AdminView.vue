<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import AppNavbar  from '../components/AppNavbar.vue'
import Card       from '../components/UI/Card/Card.vue'
import Button     from '../components/UI/Button/Button.vue'
import Pill       from '../components/UI/Pill/Pill.vue'
import AppInput   from '../components/UI/AppInput/AppInput.vue'
import AppSelect  from '../components/UI/AppSelect/AppSelect.vue'
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
const stats          = ref(null)
const users          = ref([])
const pagination     = ref({ page: 1, limit: 20, total: 0, totalPages: 1 })
const loading        = ref(false)
const statsLoading   = ref(false)
const actionLoading  = ref(null)
const filters        = ref({ search: '', role: '', activo: '', page: 1 })
const toast          = ref(null)

const ROLES = ['admin', 'manager', 'collaborator']

const ROLE_OPTIONS = [
  { value: '', label: 'Todos los roles' },
  ...ROLES.map(r => ({ value: r, label: r })),
]

const ACTIVO_OPTIONS = [
  { value: '',      label: 'Todos' },
  { value: 'true',  label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
]

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

let searchTimer = null
watch(() => filters.value.search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { filters.value.page = 1; loadUsers() }, 300)
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
    if (found) { found.activo = res.data.activo; found.token_version = res.data.token_version }
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
  if (user.google_auth && user.password_auth) return 'Google + Pass'
  if (user.google_auth)   return 'Google'
  if (user.password_auth) return 'Contraseña'
  return '—'
}

function authPillColor(user) {
  if (user.google_auth) return { bg: '#0d1a2a', dot: '#60a5fa', text: '#60a5fa' }
  return { bg: '#16102a', dot: '#a78bfa', text: '#a78bfa' }
}

const statCards = computed(() => {
  if (!stats.value) return []
  return [
    { label: 'Total usuarios',   value: stats.value.total,        color: '#c9a962', dot: '#c9a962' },
    { label: 'Activos',          value: stats.value.activos,      color: '#34d399', dot: '#34d399' },
    { label: 'Inactivos',        value: stats.value.inactivos,    color: '#fb7185', dot: '#fb7185' },
    { label: 'Login con Google', value: stats.value.google_users, color: '#60a5fa', dot: '#60a5fa' },
  ]
})

const isSelf = (user) => user.id_usuario === authStore.idUsuario
</script>

<template>
  <div class="admin-layout">
    <AppNavbar />

    <main class="admin-main">

      <header class="admin-header">
        <h1 class="admin-title">Panel de Administración</h1>
        <p class="admin-sub">Gestión de usuarios y sesiones</p>
      </header>

      <!-- Stats usando Card + Pill -->
      <section class="stats-grid">
        <Card
          v-for="card in statCards"
          :key="card.label"
          :title="statsLoading ? '—' : String(card.value)"
          :subtitle="card.label"
          :titleColor="card.color"
          back="rgba(12,12,12,0.9)"
          borderColor="#1f1f1f"
          shadowColor="rgba(0,0,0,0.4)"
        >
          <Pill
            :label="card.label"
            :btnColor="card.color + '15'"
            :circleColor="card.dot"
            :textColor="card.color"
          />
        </Card>
      </section>

      <!-- Filtros usando AppInput + AppSelect -->
      <section class="filters-row">
        <AppInput
          v-model="filters.search"
          placeholder="Buscar por nombre o email…"
          class="filter-search"
        />
        <AppSelect
          v-model="filters.role"
          :options="ROLE_OPTIONS"
          class="filter-select"
        />
        <AppSelect
          v-model="filters.activo"
          :options="ACTIVO_OPTIONS"
          class="filter-select"
        />
      </section>

      <!-- Tabla de usuarios -->
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
              <td class="td-muted">{{ user.id_usuario }}</td>

              <td>
                <span class="user-name">{{ user.nombre }} {{ user.apellido }}</span>
              </td>

              <td class="td-muted td-email">{{ user.email }}</td>

              <td>
                <Pill
                  :label="authMethod(user)"
                  :btnColor="authPillColor(user).bg"
                  :circleColor="authPillColor(user).dot"
                  :textColor="authPillColor(user).text"
                />
              </td>

              <td>
                <AppSelect
                  :modelValue="user.nombre_rol"
                  :options="ROLES"
                  :disabled="actionLoading === `role-${user.id_usuario}` || isSelf(user)"
                  class="role-select"
                  @update:modelValue="onChangeRole(user, $event)"
                />
              </td>

              <td>
                <Pill
                  :label="user.activo ? 'Activo' : 'Inactivo'"
                  :btnColor="user.activo ? '#0d2418' : '#2a0d0d'"
                  :circleColor="user.activo ? '#34d399' : '#fb7185'"
                  :textColor="user.activo ? '#34d399' : '#fb7185'"
                />
              </td>

              <td class="td-muted td-version">v{{ user.token_version }}</td>

              <td class="td-actions">
                <Button
                  label="Revocar"
                  variant="warning"
                  :disabled="actionLoading !== null || isSelf(user)"
                  :title="isSelf(user) ? 'No puedes revocar tu propia sesión' : 'Revocar sesiones activas'"
                  @click="onRevokeToken(user)"
                />
                <Button
                  :label="user.activo ? 'Desactivar' : 'Activar'"
                  :variant="user.activo ? 'danger' : 'success'"
                  :disabled="actionLoading !== null || isSelf(user)"
                  :title="isSelf(user) ? 'No puedes modificar tu propia cuenta' : ''"
                  @click="onToggleActive(user)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Paginación usando Button -->
      <div v-if="!loading && pagination.totalPages > 1" class="pagination">
        <Button
          label="← Anterior"
          variant="ghost"
          :disabled="filters.page <= 1"
          @click="goToPage(filters.page - 1)"
        />
        <span class="page-info">
          Página {{ pagination.page }} de {{ pagination.totalPages }}
          ({{ pagination.total }} usuarios)
        </span>
        <Button
          label="Siguiente →"
          variant="ghost"
          :disabled="filters.page >= pagination.totalPages"
          @click="goToPage(filters.page + 1)"
        />
      </div>

    </main>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toast" class="toast" :class="`toast--${toast.type}`">
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.admin-layout {
  min-height: 100vh;
  background: var(--Background, #000);
  color: var(--Text, #faf8f5);
  font-family: 'Manrope', 'DM Sans', sans-serif;
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
  color: var(--Text, #faf8f5);
  letter-spacing: 0.02em;
  margin: 0 0 4px;
}

.admin-sub {
  font-size: 13px;
  color: var(--TextMuted, #8a8070);
  margin: 0;
}

/* ── Stats grid ──
   Overrides Card's default margin/max-width for grid layout */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  margin-bottom: 32px;
}

.stats-grid :deep(.card) {
  margin: 0;
  max-width: none;
  border-radius: 0;
  border-right: none;
}

.stats-grid :deep(.card:last-child) {
  border-right: 0.01px solid #1f1f1f;
}

.stats-grid :deep(.card-title) {
  font-size: 28px;
}

.stats-grid :deep(.card-subtitle) {
  font-size: 12px;
  color: var(--TextMuted, #8a8070);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* Pill inside Card: reduce size a bit */
.stats-grid :deep(.pill) {
  height: 28px;
  padding: 0 10px;
  margin-top: 12px;
}

.stats-grid :deep(.pill-text) {
  font-size: 11px;
}

.stats-grid :deep(.dot) {
  width: 8px;
  height: 8px;
  margin-right: 8px;
}

/* ── Filters ── */
.filters-row {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  align-items: flex-end;
}

.filter-search {
  flex: 1;
  min-width: 220px;
}

.filter-select {
  min-width: 160px;
}

/* ── Table ── */
.table-wrapper {
  background: var(--Background2, #120f07);
  border: 1px solid var(--Border, #312713);
  overflow-x: auto;
}

.table-loading {
  padding: 48px;
  text-align: center;
  color: var(--TextMuted, #8a8070);
  font-size: 14px;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.users-table th {
  background: rgba(255,255,255,0.02);
  color: var(--TextMuted, #8a8070);
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--Border, #312713);
  white-space: nowrap;
}

.users-table td {
  padding: 10px 16px;
  border-bottom: 1px solid rgba(49,39,19,0.4);
  vertical-align: middle;
  color: var(--Text, #faf8f5);
}

.users-table tr:last-child td {
  border-bottom: none;
}

.users-table tr:hover td {
  background: rgba(255,255,255,0.015);
}

.row-inactive {
  opacity: 0.45;
}

.empty-row {
  text-align: center;
  color: var(--TextMuted, #8a8070) !important;
  padding: 48px !important;
}

.td-muted {
  color: var(--TextDim, #5a5040);
  font-size: 12px;
}

.td-email {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.td-version {
  font-variant-numeric: tabular-nums;
}

.user-name {
  font-weight: 500;
}

/* Pill in table rows: compact */
.users-table :deep(.pill) {
  height: 24px;
  padding: 0 8px;
}

.users-table :deep(.pill-text) {
  font-size: 11px;
}

.users-table :deep(.dot) {
  width: 7px;
  height: 7px;
  margin-right: 7px;
}

/* Role AppSelect inside table */
.role-select {
  min-width: 130px;
}

.role-select :deep(.app-select) {
  padding: 5px 30px 5px 10px;
  font-size: 12px;
}

/* Action buttons: smaller in table */
.td-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.td-actions :deep(.btn) {
  padding: 5px 12px;
  font-size: 11px;
}

/* ── Pagination ── */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-top: 24px;
}

.page-info {
  font-size: 12px;
  color: var(--TextMuted, #8a8070);
  margin: 0;
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
  font-family: 'Manrope', 'DM Sans', sans-serif;
}

.toast--success {
  background: #0d2418;
  border-color: #1a4030;
  color: #34d399;
}

.toast--error {
  background: var(--Error, #800d0d);
  border-color: #4a1a1a;
  color: var(--ErrorText, #e05252);
}

.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from, .toast-leave-to       { opacity: 0; transform: translateY(12px); }

/* ── Responsive ── */
@media (max-width: 900px) {
  .admin-main   { padding: 80px 16px 48px; }
  .stats-grid   { grid-template-columns: repeat(2, 1fr); }
  .stats-grid :deep(.card:nth-child(2)) { border-right: 0.01px solid #1f1f1f; }
  .stats-grid :deep(.card:nth-child(4)) { border-right: 0.01px solid #1f1f1f; }
}

@media (max-width: 640px) {
  .stats-grid    { grid-template-columns: repeat(2, 1fr); }
  .filters-row   { flex-direction: column; }
  .filter-search { min-width: unset; }
}
</style>
