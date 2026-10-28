<template>
  <div class="adm-page">
    <h1 class="adm-title">{{ $t('admin.users.title') }}</h1>
    <p class="adm-subtitle">{{ $t('admin.users.subtitle') }}</p>

    <div v-if="loading" class="adm-loading">{{ $t('admin.loading') }}</div>
    <div v-else-if="error" class="adm-error">{{ error }}</div>

    <template v-else>
      <!-- Sort controls -->
      <div class="sort-bar">
        <button
          v-for="opt in sortOptions"
          :key="opt.key"
          class="sort-btn"
          :class="{ active: sortKey === opt.key }"
          @click="toggleSort(opt.key)"
        >
          {{ opt.label }}
          <span v-if="sortKey === opt.key" class="sort-arrow">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
        </button>
        <span class="sort-count">{{ $t('admin.users.count', { count: sorted.length }) }}</span>
      </div>

      <!-- Table -->
      <div class="tasks-list">
        <div class="list-header">
          <span>{{ $t('admin.users.colName') }}</span>
          <span>{{ $t('admin.users.colEmail') }}</span>
          <span>{{ $t('admin.users.colRole') }}</span>
          <span class="col-center">{{ $t('admin.users.colCompanies') }}</span>
          <span class="col-center">{{ $t('admin.users.colStatus') }}</span>
        </div>

        <div v-for="u in sorted" :key="u.id_usuario" class="task-card list-row">
          <div class="list-name-col">
            <span class="priority-bar" :class="u.activo ? '' : 'inactive'"></span>
            <div class="task-info">
              <span class="task-name">{{ u.nombre }} {{ u.apellido }}</span>
              <span class="task-id">ID {{ u.id_usuario }}</span>
            </div>
          </div>
          <span class="cell-email">{{ u.email }}</span>
          <div class="role-col">
            <span class="role-pill" :class="u.nombre_rol">{{ roleLabel(u.nombre_rol) }}</span>
          </div>
          <span class="list-cell-num">{{ u.total_empresas }}</span>
          <div class="action-col">
            <button
              class="toggle-btn"
              :class="u.activo ? 'btn-deactivate' : 'btn-activate'"
              :disabled="toggling === u.id_usuario"
              @click="toggleStatus(u)"
            >
              {{ u.activo ? $t('admin.deactivate') : $t('admin.activate') }}
            </button>
          </div>
        </div>

        <div v-if="!sorted.length" class="adm-empty">{{ $t('admin.users.empty') }}</div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { apiFetch as requestApi } from '@/services/api.js'
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { translateRole } from '@/utils/roles.js'

const { t, te } = useI18n()

// El rol llega en inglés desde la base de datos: es un valor del esquema.
const roleLabel = (rol) => translateRole(rol, { t, te })

const users     = ref([])
const loading   = ref(true)
const error     = ref(null)
const sortKey   = ref('id')
const sortDir   = ref('desc')
const toggling  = ref(null)

async function toggleStatus(user) {
  toggling.value = user.id_usuario
  try {
    const res = await requestApi(`/api/admin/users/${user.id_usuario}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ activo: !user.activo }),
    })
    if (!res.ok) throw new Error()
    user.activo = !user.activo
  } catch {
    // silently ignore
  } finally {
    toggling.value = null
  }
}

const sortOptions = computed(() => [
  { key: 'nombre',          label: t('admin.users.sortName') },
  { key: 'id',              label: t('admin.users.sortId') },
  { key: 'total_empresas',  label: t('admin.users.sortCompanies') },
  { key: 'activo',          label: t('admin.users.sortStatus') },
])

function toggleSort(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

const sorted = computed(() => {
  const list = [...users.value]
  const dir  = sortDir.value === 'asc' ? 1 : -1
  return list.sort((a, b) => {
    if (sortKey.value === 'id')     return (a.id_usuario - b.id_usuario) * dir
    if (sortKey.value === 'nombre') return `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`) * dir
    if (sortKey.value === 'activo') return (Number(a.activo) - Number(b.activo)) * dir
    return (a[sortKey.value] - b[sortKey.value]) * dir
  })
})

onMounted(async () => {
  try {
    const res  = await requestApi('/api/admin/users', {
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Error')
    users.value = json.data
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.adm-page { max-width: 100%; width: 100%; }

.adm-title {
  font-family: 'Playfair Display', serif;
  font-size: 3rem;
  font-weight: 400;
  color: var(--k-color-text);
  line-height: 1.1;
  margin: 0;
}

.adm-subtitle {
  padding-top: 0.5rem;
  padding-bottom: 2rem;
  font-size: 0.875rem;
  color: var(--k-text-muted);
  font-family: var(--font-sans);
  margin: 0;
}

.adm-loading { font-size: 0.9rem; color: var(--k-text-muted); font-family: var(--font-sans); }
.adm-error   { font-size: 0.9rem; color: var(--k-state-error-text); font-family: var(--font-sans); }

/* Sort bar — identical to Companies view */
.sort-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.sort-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: var(--k-shade-3);
  border: 1px solid var(--k-color-border);
  color: var(--k-text-muted);
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 8px 18px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.sort-btn:hover { border-color: var(--k-color-bg-3); color: var(--k-color-text); }

.sort-btn.active {
  border-color: var(--k-color-secondary);
  color: var(--k-color-primary);
}

.sort-arrow { font-size: 0.6875rem; }

.sort-count {
  font-size: 0.75rem;
  color: var(--k-text-dim);
  margin-left: 4px;
  font-family: var(--font-sans);
}

/* Table */
.tasks-list { display: flex; flex-direction: column; gap: 0; }

.list-header {
  display: grid;
  grid-template-columns: 2fr 2fr 100px 90px 90px;
  gap: 12px;
  padding: 8px 16px;
  font-size: 0.6875rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--k-text-dim);
  font-family: var(--font-sans);
}

.task-card {
  background: var(--k-shade-2);
  border: 1px solid var(--k-shade-6);
  border-top: none;
  transition: border-color 0.15s;
}

.task-card:first-of-type { border-top: 1px solid var(--k-color-border); }
.task-card:hover { border-color: var(--k-color-bg-3); }

.list-row {
  display: grid;
  grid-template-columns: 2fr 2fr 100px 90px 90px;
  gap: 12px;
  align-items: center;
  padding: 12px 16px;
}

.list-name-col {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.priority-bar {
  width: 3px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 2px;
  background: var(--k-color-primary);
}

.priority-bar.inactive { background: var(--k-text-dim); }

.task-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.task-name {
  font-size: 0.8125rem;
  font-family: var(--font-sans);
  font-weight: 600;
  color: var(--k-color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-id {
  font-size: 0.6875rem;
  color: var(--k-text-dim);
  font-family: var(--font-sans);
}

.cell-email {
  font-size: 0.75rem;
  color: var(--k-text-muted);
  font-family: var(--font-sans);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.role-col {
  display: flex;
  align-items: center;
}

.role-pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 3px 8px;
  background: var(--k-color-pill-back);
  border: 1px solid var(--k-color-border);
  color: var(--k-text-muted);
  font-family: var(--font-sans);
  width: fit-content;
}

.role-pill.super_user {
  color: var(--k-color-primary);
  border-color: var(--k-color-secondary);
  background: var(--k-color-bg-2);
}

.list-cell-num {
  font-size: 0.8125rem;
  color: var(--k-text-muted);
  text-align: center;
  font-family: var(--font-sans);
}

.col-center { text-align: center; }

.action-col {
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-btn {
  font-size: 0.6875rem;
  font-weight: 600;
  font-family: var(--font-sans);
  letter-spacing: 0.04em;
  padding: 4px 10px;
  border: 1px solid;
  cursor: pointer;
  background: var(--k-shade-3);
  transition: opacity 0.15s;
}

.toggle-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-deactivate { color: var(--k-state-error-text); border-color: var(--k-state-error-text); }
.btn-activate   { color: var(--k-state-success-text); border-color: var(--k-state-success-text); }

.adm-empty {
  text-align: center;
  color: var(--k-text-dim);
  padding: 40px;
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  background: var(--k-surface-card);
  border: 1px solid var(--k-color-border);
}

/* Móvil: la tabla de usuarios hace scroll horizontal en vez de comprimirse. */
@media (max-width: 720px) {
  .tasks-list { overflow-x: auto; }
  .list-header,
  .task-card { min-width: 560px; }
}
</style>
