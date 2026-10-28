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
      <div class="sort-bar" role="group" :aria-label="$t('admin.companies.sortBy')">
        <span class="sort-label">{{ $t('admin.companies.sortBy') }}</span>
        <button
          v-for="opt in sortOptions"
          :key="opt.key"
          type="button"
          class="sort-btn"
          :class="{ active: sortKey === opt.key }"
          :aria-pressed="sortKey === opt.key"
          @click="toggleSort(opt.key)"
        >
          {{ opt.label }}
          <span class="sort-arrow" aria-hidden="true">{{ sortKey === opt.key ? (sortDir === 'asc' ? '↑' : '↓') : '↕' }}</span>
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
import { apiFetch as requestApi } from '@/services/api.js'
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const companies = ref([])
const loading   = ref(true)
const error     = ref(null)
const sortKey   = ref('id')
const sortDir   = ref('desc')
const toggling  = ref(null)

async function toggleStatus(company) {
  toggling.value = company.id_empresa
  try {
    const res = await requestApi(`/api/global/companies/${company.id_empresa}/status`, {
      method: 'PATCH',
      headers: {
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
    const res  = await requestApi('/api/admin/companies', {
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
  font-size: 3rem;
  font-weight: 400;
  color: var(--k-color-text);
  line-height: 1.1;
  margin: 0;
}

.adm-subtitle {
  padding-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--k-text-muted);
  font-family: var(--font-sans);
  margin: 0;
}

.adm-loading { font-size: 0.9rem; color: var(--k-text-muted); font-family: var(--font-sans); }
.adm-error   { font-size: 0.9rem; color: var(--k-state-error-text); font-family: var(--font-sans); }

/* Sort bar */
.sort-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.sort-label {
  font-size: 0.75rem;
  color: var(--k-text-muted);
  font-family: var(--font-sans);
}

.sort-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: var(--k-shade-4);
  border: 1px solid var(--k-shade-8);
  border-radius: 6px;
  box-shadow: 0 1px 0 rgba(var(--k-ink-rgb), 0.04) inset, 0 1px 2px rgba(var(--k-color-black-rgb), 0.5);
  color: var(--k-text-soft);
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 8px 18px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.sort-btn:hover { border-color: var(--k-shade-8); background: var(--k-shade-6); color: var(--k-color-text); }

.sort-btn:focus-visible { outline: 2px solid var(--k-color-primary); outline-offset: 2px; }

.sort-btn.active {
  border-color: var(--k-color-secondary);
  background: rgba(var(--k-color-primary-rgb), 0.1);
  color: var(--k-color-primary);
}

.sort-arrow { font-size: 0.6875rem; opacity: 0.6; }
.sort-btn.active .sort-arrow { opacity: 1; }

.sort-count {
  font-size: 0.75rem;
  color: var(--k-text-dim);
  margin-left: 4px;
  font-family: var(--font-sans);
}


.tasks-list { display: flex; flex-direction: column; gap: 0; }

.list-header {
  display: grid;
  grid-template-columns: 2fr 1fr 2fr 90px 90px 110px;
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

/* fit-content so it doesn't stretch across the column */
.industry-col {
  display: flex;
  align-items: center;
}

.industry-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  background: rgba(var(--k-hue-blue-rgb), 0.08);
  border: 1px solid rgba(var(--k-hue-blue-rgb), 0.2);
  color: var(--k-hue-blue);
  font-size: 0.6875rem;
  font-weight: 600;
  font-family: var(--font-sans);
  white-space: nowrap;
  width: fit-content;
}

.cell-email {
  font-size: 0.75rem;
  color: var(--k-text-muted);
  font-family: var(--font-sans);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

/* Móvil: la tabla de empresas hace scroll horizontal en vez de comprimirse. */
@media (max-width: 760px) {
  .tasks-list { overflow-x: auto; }
  .list-header,
  .task-card { min-width: 640px; }
}
</style>
