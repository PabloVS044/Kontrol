<template>
  <div class="adm-page">
    <div class="adm-header">
      <h1 class="adm-title">{{ $t('admin.companies.title') }}</h1>
      <p class="adm-subtitle">{{ $t('admin.companies.subtitle') }}</p>

    </div>
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
        <span class="sort-count">{{ $t('admin.companies.count', { count: sorted.length }) }}</span>
      </div>

      <!-- Table -->
      <div class="tasks-list">
        <div class="list-header">
          <span>{{ $t('admin.companies.colName') }}</span>
          <span>{{ $t('admin.companies.colIndustry') }}</span>
          <span>{{ $t('admin.companies.colEmail') }}</span>
          <span class="col-center">{{ $t('admin.companies.colMembers') }}</span>
          <span class="col-center">{{ $t('admin.companies.colProjects') }}</span>
          <span class="col-center">{{ $t('admin.companies.colStatus') }}</span>
        </div>

        <div v-for="c in sorted" :key="c.id_empresa" class="task-card list-row">
          <div class="list-name-col">
            <span class="priority-bar" :class="c.activo ? '' : 'inactive'"></span>
            <div class="task-info">
              <span class="task-name">{{ c.nombre }}</span>
              <span class="task-id">ID {{ c.id_empresa }}</span>
            </div>
          </div>
          <div class="industry-col">
            <span class="industry-badge">{{ c.industria ?? '—' }}</span>
          </div>
          <span class="cell-email">{{ c.email }}</span>
          <span class="list-cell-num">{{ c.total_miembros }}</span>
          <span class="list-cell-num">{{ c.total_proyectos }}</span>
          <div class="action-col">
            <button
              class="toggle-btn"
              :class="c.activo ? 'btn-deactivate' : 'btn-activate'"
              :disabled="toggling === c.id_empresa"
              @click="toggleStatus(c)"
            >
              {{ c.activo ? $t('admin.deactivate') : $t('admin.activate') }}
            </button>
          </div>
        </div>

        <div v-if="!sorted.length" class="adm-empty">{{ $t('admin.companies.empty') }}</div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()

const authStore = useAuthStore()
const companies = ref([])
const loading   = ref(true)
const error     = ref(null)
const sortKey   = ref('id')
const sortDir   = ref('desc')
const toggling  = ref(null)

async function toggleStatus(company) {
  toggling.value = company.id_empresa
  try {
    const res = await fetch(`/api/global/companies/${company.id_empresa}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${authStore.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ activo: !company.activo }),
    })
    if (!res.ok) throw new Error()
    company.activo = !company.activo
  } catch {
    // silently ignore — button returns to previous state
  } finally {
    toggling.value = null
  }
}

const sortOptions = computed(() => [
  { key: 'nombre',          label: t('admin.companies.sortName') },
  { key: 'total_proyectos', label: t('admin.companies.sortProjects') },
  { key: 'id',              label: t('admin.companies.sortId') },
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
  const list = [...companies.value]
  const dir  = sortDir.value === 'asc' ? 1 : -1
  return list.sort((a, b) => {
    const key = sortKey.value === 'id' ? 'id_empresa' : sortKey.value
    const av  = a[key]
    const bv  = b[key]
    if (typeof av === 'string') return av.localeCompare(bv) * dir
    return (av - bv) * dir
  })
})

onMounted(async () => {
  try {
    const res  = await fetch('/api/admin/companies', {
      headers: { Authorization: `Bearer ${authStore.token}` },
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Error')
    companies.value = json.data
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.adm-page { max-width: 100%; width: 100%; }


.adm-header {  justify-content: space-between; padding-bottom: 2rem;}
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
  font-size: 14px;
  color: var(--TextMuted);
  font-family: 'DM Sans', sans-serif;
  margin: 0;
}

.adm-loading { font-size: 0.9rem; color: var(--TextMuted); font-family: 'DM Sans', sans-serif; }
.adm-error   { font-size: 0.9rem; color: var(--ErrorText); font-family: 'DM Sans', sans-serif; }

/* Sort bar */
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
  background: #111111;
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


.tasks-list { display: flex; flex-direction: column; gap: 0; }

.list-header {
  display: grid;
  grid-template-columns: 2fr 1fr 2fr 90px 90px 110px;
  gap: 12px;
  padding: 8px 16px;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--TextDim);
  font-family: 'DM Sans', sans-serif;
}

.task-card {
  background: #0f0f0f;
  border: 1px solid #1f1f1f;
  border-top: none;
  transition: border-color 0.15s;
}

.task-card:first-of-type { border-top: 1px solid var(--Border); }
.task-card:hover { border-color: var(--Background3); }

.list-row {
  display: grid;
  grid-template-columns: 2fr 1fr 2fr 90px 90px 110px;
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

/* fit-content so it doesn't stretch across the column */
.industry-col {
  display: flex;
  align-items: center;
}

.industry-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  background: rgba(96,165,250,0.08);
  border: 1px solid rgba(96,165,250,0.2);
  color: #60a5fa;
  font-size: 11px;
  font-weight: 600;
  font-family: 'DM Sans', sans-serif;
  white-space: nowrap;
  width: fit-content;
}

.cell-email {
  font-size: 12px;
  color: var(--TextMuted);
  font-family: 'DM Sans', sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.list-cell-num {
  font-size: 13px;
  color: var(--TextMuted);
  text-align: center;
  font-family: 'DM Sans', sans-serif;
}

.col-center { text-align: center; }

.action-col {
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-btn {
  font-size: 11px;
  font-weight: 600;
  font-family: 'DM Sans', sans-serif;
  letter-spacing: 0.04em;
  padding: 4px 10px;
  border: 1px solid;
  cursor: pointer;
  background: #111111;
  transition: opacity 0.15s;
}

.toggle-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-deactivate { color: var(--ErrorText); border-color: var(--ErrorText); }
.btn-activate   { color: var(--SuccessText); border-color: var(--SuccessText); }

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
