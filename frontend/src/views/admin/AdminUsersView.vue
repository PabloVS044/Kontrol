<template>
  <div class="adm-page">
    <h1 class="adm-title">Users</h1>
    <p class="adm-subtitle">All platform users and their system role</p>

    <div v-if="loading" class="adm-loading">Loading...</div>
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
        <span class="sort-count">{{ sorted.length }} users</span>
      </div>

      <!-- Table -->
      <div class="tasks-list">
        <div class="list-header">
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span class="col-center">Companies</span>
          <span class="col-center">Status</span>
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
            <span class="role-pill" :class="u.nombre_rol">{{ u.nombre_rol }}</span>
          </div>
          <span class="list-cell-num">{{ u.total_empresas }}</span>
          <div class="status-col">
            <span class="status-badge" :class="u.activo ? 'active' : 'inactive'">
              {{ u.activo ? 'Active' : 'Inactive' }}
            </span>
          </div>
        </div>

        <div v-if="!sorted.length" class="adm-empty">No users found.</div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const users     = ref([])
const loading   = ref(true)
const error     = ref(null)
const sortKey   = ref('id')
const sortDir   = ref('desc')

const sortOptions = [
  { key: 'nombre',          label: 'Name' },
  { key: 'id',              label: 'ID' },
  { key: 'total_empresas',  label: 'Companies' },
  { key: 'activo',          label: 'Status' },
]

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
    const res  = await fetch('/api/admin/users', {
      headers: { Authorization: `Bearer ${authStore.token}` },
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
  font-size: 48px;
  font-weight: 400;
  color: var(--Text);
  line-height: 1.1;
  margin: 0;
}

.adm-subtitle {
  padding-top: 0.5rem;
  padding-bottom: 2rem;
  font-size: 14px;
  color: var(--TextMuted);
  font-family: 'DM Sans', sans-serif;
  margin: 0;
}

.adm-loading { font-size: 0.9rem; color: var(--TextMuted); font-family: 'DM Sans', sans-serif; }
.adm-error   { font-size: 0.9rem; color: var(--ErrorText); font-family: 'DM Sans', sans-serif; }

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
  background: transparent;
  border: 1px solid var(--Border);
  color: var(--TextMuted);
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 8px 18px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.sort-btn:hover { border-color: var(--Background3); color: var(--Text); }

.sort-btn.active {
  border-color: var(--Secondary);
  color: var(--Primary);
}

.sort-arrow { font-size: 11px; }

.sort-count {
  font-size: 12px;
  color: var(--TextDim);
  margin-left: 4px;
  font-family: 'DM Sans', sans-serif;
}

/* Table */
.tasks-list { display: flex; flex-direction: column; gap: 0; }

.list-header {
  display: grid;
  grid-template-columns: 2fr 2fr 100px 90px 90px;
  gap: 12px;
  padding: 8px 16px;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--TextDim);
  font-family: 'DM Sans', sans-serif;
}

.task-card {
  background: rgba(15,15,15,0.7);
  border: 1px solid #1f1f1f;
  border-top: none;
  transition: border-color 0.15s;
}

.task-card:first-of-type { border-top: 1px solid var(--Border); }
.task-card:hover { border-color: var(--Background3); }

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
  background: var(--Primary);
}

.priority-bar.inactive { background: var(--TextDim); }

.task-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.task-name {
  font-size: 13px;
  font-family: 'DM Sans', sans-serif;
  font-weight: 600;
  color: var(--Text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-id {
  font-size: 11px;
  color: var(--TextDim);
  font-family: 'DM Sans', sans-serif;
}

.cell-email {
  font-size: 12px;
  color: var(--TextMuted);
  font-family: 'DM Sans', sans-serif;
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
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 3px 8px;
  background: var(--PillBack);
  border: 1px solid var(--Border);
  color: var(--TextMuted);
  font-family: 'DM Sans', sans-serif;
  width: fit-content;
}

.role-pill.super_user {
  color: var(--Primary);
  border-color: var(--Secondary);
  background: var(--Background2);
}

.list-cell-num {
  font-size: 13px;
  color: var(--TextMuted);
  text-align: center;
  font-family: 'DM Sans', sans-serif;
}

.col-center { text-align: center; }

.status-col {
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-badge {
  display: inline-flex;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  font-family: 'DM Sans', sans-serif;
  width: fit-content;
}

.status-badge.active {
  color: var(--SuccessText);
  background: var(--Success);
}

.status-badge.inactive {
  color: var(--ErrorText);
  background: var(--Error);
}

.adm-empty {
  text-align: center;
  color: var(--TextDim);
  padding: 40px;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  background: var(--Background2);
  border: 1px solid var(--Border);
}
</style>
