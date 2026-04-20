<template>
  <div class="pd-root">
    <AppNavbar />

    <div class="pd-layout">

      <!-- Loading -->
      <div v-if="loading" class="state-screen">
        <span class="pd-spinner" />
      </div>

      <!-- Error -->
      <div v-else-if="error" class="state-screen">
        <p class="state-title">Could not load project</p>
        <p class="state-msg">{{ error }}</p>
        <button class="btn-primary" style="margin-top:20px" @click="loadAll">Retry</button>
      </div>

      <template v-else-if="project">

        <!-- ── Header ── -->
        <header class="pd-header">
          <RouterLink to="/projects" class="pd-back">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="#555" stroke-width="1.4" stroke-linecap="square"/>
            </svg>
            Projects
          </RouterLink>

          <div class="pd-header-body">
            <div class="pd-header-left">
              <div class="pd-title-row">
                <h1 class="pd-title">{{ project.nombre }}</h1>
                <span class="status-badge" :style="statusStyle(project.estado)">
                  {{ statusLabel(project.estado) }}
                </span>
              </div>

              <div class="pd-meta-row">
                <span class="pd-meta-item">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <rect x="1" y="2" width="10" height="9" rx="1" stroke="#555" stroke-width="1.2"/>
                    <path d="M1 5h10M4 1v2M8 1v2" stroke="#555" stroke-width="1.2" stroke-linecap="square"/>
                  </svg>
                  {{ formatDate(project.fecha_inicio) }}
                  <template v-if="project.fecha_fin_planificada">
                    &rarr; {{ formatDate(project.fecha_fin_planificada) }}
                  </template>
                </span>
                <span
                  v-if="daysRemaining !== null"
                  class="pd-meta-item"
                  :style="{ color: daysRemaining < 0 ? '#fb7185' : daysRemaining <= 7 ? '#f97316' : '#555' }"
                >
                  {{ daysRemaining < 0 ? `${Math.abs(daysRemaining)}d overdue` : `${daysRemaining}d remaining` }}
                </span>
              </div>

              <p v-if="project.descripcion" class="pd-desc">{{ project.descripcion }}</p>
            </div>

            <div class="pd-header-right">
              <div class="budget-card">
                <div class="budget-card-top">
                  <span class="budget-label">Budget</span>
                  <span class="budget-pct" :style="{ color: budgetColor }">{{ budgetPct }}%</span>
                </div>
                <div class="budget-bar-bg">
                  <div
                    class="budget-bar-fill"
                    :style="{ width: Math.min(budgetPct, 100) + '%', background: budgetColor }"
                  ></div>
                </div>
                <div class="budget-amounts">
                  <span>${{ formatMoney(metrics?.presupuesto?.total_real || 0) }} <small>spent</small></span>
                  <span>${{ formatMoney(project.presupuesto_total) }} <small>total</small></span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <!-- ── Tabs ── -->
        <nav class="pd-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="pd-tab"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </nav>

        <!-- ── OVERVIEW ── -->
        <section v-if="activeTab === 'overview'" class="tab-panel">
          <div class="overview-grid">

            <!-- Task progress -->
            <div class="metric-card">
              <p class="metric-kicker">Task Progress</p>
              <p class="metric-total">{{ totalTasks }} tasks total</p>
              <div class="task-states">
                <div v-for="s in taskStateRows" :key="s.estado" class="task-state-row">
                  <div class="task-state-label">
                    <span class="task-state-dot" :style="{ background: s.color }"></span>
                    <span>{{ s.label }}</span>
                  </div>
                  <div class="task-state-bar-bg">
                    <div
                      class="task-state-bar-fill"
                      :style="{ width: s.pct + '%', background: s.color }"
                    ></div>
                  </div>
                  <span class="task-state-count">{{ s.count }}</span>
                </div>
              </div>
            </div>

            <!-- Budget detail -->
            <div class="metric-card">
              <p class="metric-kicker">Budget Overview</p>
              <div class="budget-detail-row">
                <div class="budget-detail-cell">
                  <div class="budget-detail-val">${{ formatMoney(project.presupuesto_total) }}</div>
                  <div class="budget-detail-sub">Total budget</div>
                </div>
                <div class="budget-detail-cell">
                  <div class="budget-detail-val" :style="{ color: budgetColor }">
                    ${{ formatMoney(metrics?.presupuesto?.total_real || 0) }}
                  </div>
                  <div class="budget-detail-sub">Spent</div>
                </div>
                <div class="budget-detail-cell">
                  <div
                    class="budget-detail-val"
                    :style="{ color: budgetRemaining < 0 ? '#fb7185' : '#34d399' }"
                  >
                    ${{ formatMoney(Math.abs(budgetRemaining)) }}
                  </div>
                  <div class="budget-detail-sub">{{ budgetRemaining < 0 ? 'Overrun' : 'Available' }}</div>
                </div>
              </div>
              <div class="budget-bar-bg" style="margin-top:16px">
                <div
                  class="budget-bar-fill"
                  :style="{ width: Math.min(budgetPct, 100) + '%', background: budgetColor }"
                ></div>
              </div>
            </div>

            <!-- Inventory movements -->
            <div class="metric-card">
              <p class="metric-kicker">Inventory Activity</p>
              <template v-if="metrics?.movimientos?.length">
                <div v-for="mov in metrics.movimientos" :key="mov.tipo" class="movement-row">
                  <span class="movement-dot" :style="{ background: movColor(mov.tipo) }"></span>
                  <span class="movement-tipo">{{ mov.tipo }}</span>
                  <span class="movement-count">{{ mov.count }}</span>
                  <span class="movement-total">${{ formatMoney(mov.total || 0) }}</span>
                </div>
              </template>
              <p v-else class="empty-hint">No inventory movements recorded.</p>
            </div>

            <!-- Team -->
            <div class="metric-card">
              <p class="metric-kicker">Team Breakdown</p>
              <template v-if="metrics?.equipo?.length">
                <div v-for="role in metrics.equipo" :key="role.rol" class="team-role-row">
                  <div class="team-role-avatar">
                    {{ role.total }}
                  </div>
                  <div>
                    <div class="team-role-name">{{ role.rol }}</div>
                    <div class="team-role-sub">{{ role.total === 1 ? '1 member' : `${role.total} members` }}</div>
                  </div>
                </div>
              </template>
              <p v-else class="empty-hint">No roles assigned to this project yet.</p>
            </div>

          </div>
        </section>

        <!-- ── TASKS ── -->
        <section v-if="activeTab === 'tasks'" class="tab-panel">

          <div class="tasks-toolbar">
            <div class="tasks-filters">
              <select v-model="taskFilterEstado" class="filter-select">
                <option value="">All statuses</option>
                <option value="PENDIENTE">Pending</option>
                <option value="EN_PROGRESO">In progress</option>
                <option value="COMPLETADA">Completed</option>
                <option value="CANCELADA">Cancelled</option>
              </select>
              <select v-model="taskFilterPrioridad" class="filter-select">
                <option value="">All priorities</option>
                <option value="CRITICA">Critical</option>
                <option value="ALTA">High</option>
                <option value="MEDIA">Medium</option>
                <option value="BAJA">Low</option>
              </select>
              <span class="tasks-count">{{ filteredTasks.length }} tasks</span>
            </div>

            <button v-if="canManageTasks" class="btn-primary" @click="openCreateTask">
              <svg class="icon16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="#0a0a0a" stroke-width="1.5" stroke-linecap="square"/>
              </svg>
              New task
            </button>
          </div>

          <div v-if="tasksLoading" class="tasks-loading">Loading tasks…</div>

          <div v-else-if="filteredTasks.length === 0" class="empty-state">
            <p>No tasks match your filters.</p>
          </div>

          <div v-else class="tasks-list">
            <div
              v-for="task in filteredTasks"
              :key="task.id_tarea"
              class="task-card"
              :class="{ 'task-card--done': task.estado === 'COMPLETADA' || task.estado === 'CANCELADA' }"
            >
              <div class="task-card-left">
                <span class="priority-bar" :style="{ background: priorityColor(task.prioridad) }"></span>
                <div class="task-info">
                  <span class="task-name">{{ task.nombre }}</span>
                  <span v-if="task.descripcion" class="task-desc">{{ task.descripcion }}</span>
                  <div class="task-badges">
                    <span class="status-badge small" :style="statusStyle(task.estado)">
                      {{ statusLabel(task.estado) }}
                    </span>
                    <span class="priority-badge" :style="{ color: priorityColor(task.prioridad) }">
                      {{ task.prioridad }}
                    </span>
                    <span
                      v-if="task.fecha_vencimiento"
                      class="due-badge"
                      :class="{ overdue: isOverdue(task) }"
                    >
                      Due {{ formatDate(task.fecha_vencimiento) }}
                    </span>
                  </div>
                </div>
              </div>

              <div v-if="canManageTasks" class="task-card-actions">
                <button class="task-action-btn" @click="openEditTask(task)">Edit</button>
                <button
                  v-if="task.estado !== 'COMPLETADA' && task.estado !== 'CANCELADA'"
                  class="task-action-btn task-action-btn--close"
                  :disabled="closingTaskId === task.id_tarea"
                  @click="closeTask(task)"
                >
                  {{ closingTaskId === task.id_tarea ? '…' : 'Close' }}
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- ── TEAM ── -->
        <section v-if="activeTab === 'team'" class="tab-panel">
          <p class="team-note">
            Role breakdown for this project. To manage individual members and permissions, use the
            <RouterLink to="/dashboard" class="team-note-link">Dashboard</RouterLink>.
          </p>

          <div v-if="metrics?.equipo?.length" class="team-roles-grid">
            <div v-for="role in metrics.equipo" :key="role.rol" class="team-role-card">
              <div class="role-count">{{ role.total }}</div>
              <div class="role-name">{{ role.rol }}</div>
              <div class="role-sub">{{ role.total === 1 ? 'member' : 'members' }}</div>
            </div>
          </div>

          <div v-else class="empty-state">
            <p>No team roles assigned to this project yet.</p>
          </div>
        </section>

      </template>
    </div>

    <!-- ── Task Modal ── -->
    <Teleport to="body">
      <div v-if="showTaskModal" class="modal-overlay" @click.self="closeTaskModal">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-title">{{ editingTask ? 'Edit task' : 'New task' }}</span>
            <button class="modal-close" @click="closeTaskModal">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3L3 13" stroke="#666" stroke-width="1.4" stroke-linecap="square"/>
              </svg>
            </button>
          </div>

          <form class="modal-form" @submit.prevent="submitTask">
            <div class="form-field">
              <label>Name <span class="req">*</span></label>
              <input v-model="taskForm.nombre" type="text" placeholder="Task name" required />
            </div>

            <div class="form-field">
              <label>Description</label>
              <textarea v-model="taskForm.descripcion" placeholder="Optional description" rows="2"></textarea>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label>Priority</label>
                <select v-model="taskForm.prioridad">
                  <option value="BAJA">Low</option>
                  <option value="MEDIA">Medium</option>
                  <option value="ALTA">High</option>
                  <option value="CRITICA">Critical</option>
                </select>
              </div>
              <div class="form-field">
                <label>{{ editingTask ? 'Status' : 'Initial status' }}</label>
                <select v-model="taskForm.estado">
                  <option value="PENDIENTE">Pending</option>
                  <option value="EN_PROGRESO">In progress</option>
                  <option value="COMPLETADA">Completed</option>
                  <option value="CANCELADA">Cancelled</option>
                </select>
              </div>
            </div>

            <div class="form-field">
              <label>Due date</label>
              <input v-model="taskForm.fecha_vencimiento" type="date" />
            </div>

            <p v-if="taskError" class="modal-error">{{ taskError }}</p>

            <div class="modal-actions">
              <button type="button" class="btn-secondary" @click="closeTaskModal">Cancel</button>
              <button type="submit" class="btn-primary" :disabled="taskSubmitting">
                {{ taskSubmitting ? 'Saving…' : editingTask ? 'Update task' : 'Create task' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import AppNavbar from '../components/AppNavbar.vue'
import { useAuthStore } from '../stores/auth'
import './ProjectDetailsView.css'

const route     = useRoute()
const authStore = useAuthStore()

// ── State ─────────────────────────────────────────────────────────────────────

const project      = ref(null)
const metrics      = ref(null)
const tareas       = ref([])
const loading      = ref(true)
const error        = ref(null)
const tasksLoading = ref(false)
const activeTab    = ref('overview')

const taskFilterEstado    = ref('')
const taskFilterPrioridad = ref('')

const showTaskModal  = ref(false)
const editingTask    = ref(null)
const taskSubmitting = ref(false)
const taskError      = ref(null)
const closingTaskId  = ref(null)

const taskForm = ref({
  nombre: '', descripcion: '', prioridad: 'MEDIA', estado: 'PENDIENTE', fecha_vencimiento: '',
})

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'tasks',    label: 'Tasks'    },
  { id: 'team',     label: 'Team'     },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

const projectId = computed(() => route.params.id)

function authHeader() {
  const token = localStorage.getItem('token')
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  if (authStore.idEmpresaActual) headers['X-Empresa-ID'] = authStore.idEmpresaActual
  return headers
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatMoney(val) {
  const n = Number(val || 0)
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return n.toFixed(2)
}

// ── Status / Priority helpers ─────────────────────────────────────────────────

const STATUS_COLOR = {
  PLANIFICADO: '#60a5fa',
  EN_PROGRESO: '#34d399',
  PAUSADO:     '#f97316',
  COMPLETADO:  '#c9a962',
  COMPLETADA:  '#c9a962',
  CANCELADO:   '#fb7185',
  CANCELADA:   '#fb7185',
  PENDIENTE:   '#60a5fa',
}

const STATUS_LABEL = {
  PLANIFICADO: 'Planned',
  EN_PROGRESO: 'In Progress',
  PAUSADO:     'Paused',
  COMPLETADO:  'Completed',
  COMPLETADA:  'Completed',
  CANCELADO:   'Cancelled',
  CANCELADA:   'Cancelled',
  PENDIENTE:   'Pending',
}

function statusStyle(estado) {
  const c = STATUS_COLOR[estado] || '#666'
  return { color: c, borderColor: c + '44', background: c + '14' }
}

function statusLabel(estado) {
  return STATUS_LABEL[estado] || estado
}

function priorityColor(p) {
  return { BAJA: '#555', MEDIA: '#60a5fa', ALTA: '#f97316', CRITICA: '#fb7185' }[p] || '#555'
}

function movColor(tipo) {
  return { ENTRADA: '#34d399', SALIDA: '#fb7185', AJUSTE: '#60a5fa', GASTO_ADMIN: '#f97316' }[tipo] || '#666'
}

function isOverdue(task) {
  if (!task.fecha_vencimiento) return false
  if (task.estado === 'COMPLETADA' || task.estado === 'CANCELADA') return false
  return new Date(task.fecha_vencimiento) < new Date()
}

// ── Computed ──────────────────────────────────────────────────────────────────

const canManageTasks = computed(() =>
  project.value?.mis_permisos?.includes('gestionar_tareas') ?? false
)

const daysRemaining = computed(() => {
  if (!project.value?.fecha_fin_planificada) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const end   = new Date(project.value.fecha_fin_planificada)
  return Math.round((end - today) / 86_400_000)
})

const budgetPct = computed(() => {
  const total = Number(project.value?.presupuesto_total || 0)
  const spent = Number(metrics.value?.presupuesto?.total_real || 0)
  if (!total) return 0
  return Math.round((spent / total) * 100)
})

const budgetColor = computed(() => {
  if (budgetPct.value >= 100) return '#fb7185'
  if (budgetPct.value >= 80)  return '#f97316'
  return '#34d399'
})

const budgetRemaining = computed(() => {
  const total = Number(project.value?.presupuesto_total || 0)
  const spent = Number(metrics.value?.presupuesto?.total_real || 0)
  return total - spent
})

const TASK_STATE_META = [
  { estado: 'PENDIENTE',   label: 'Pending',     color: '#60a5fa' },
  { estado: 'EN_PROGRESO', label: 'In Progress',  color: '#34d399' },
  { estado: 'COMPLETADA',  label: 'Completed',    color: '#c9a962' },
  { estado: 'CANCELADA',   label: 'Cancelled',    color: '#fb7185' },
]

const totalTasks = computed(() =>
  (metrics.value?.tareas || []).reduce((acc, t) => acc + Number(t.count), 0)
)

const taskStateRows = computed(() => {
  const total = totalTasks.value || 1
  return TASK_STATE_META.map(meta => {
    const found = (metrics.value?.tareas || []).find(t => t.estado === meta.estado)
    const count = found ? Number(found.count) : 0
    return { ...meta, count, pct: Math.round((count / total) * 100) }
  })
})

const filteredTasks = computed(() =>
  tareas.value.filter(t => {
    if (taskFilterEstado.value    && t.estado    !== taskFilterEstado.value)    return false
    if (taskFilterPrioridad.value && t.prioridad !== taskFilterPrioridad.value) return false
    return true
  })
)

// ── API calls ─────────────────────────────────────────────────────────────────

async function loadProject() {
  const res = await fetch(`/api/projects/${projectId.value}`, { headers: authHeader() })
  if (res.status === 404) throw new Error('Project not found.')
  if (!res.ok)            throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  project.value = data.data
}

async function loadMetrics() {
  const res = await fetch(`/api/projects/${projectId.value}/metrics`, { headers: authHeader() })
  if (!res.ok) return
  const data = await res.json()
  metrics.value = data.data
}

async function loadTasks() {
  tasksLoading.value = true
  try {
    const res = await fetch(`/api/projects/${projectId.value}/tareas`, { headers: authHeader() })
    if (!res.ok) return
    const data = await res.json()
    tareas.value = data.data ?? []
  } finally {
    tasksLoading.value = false
  }
}

async function loadAll() {
  loading.value = true
  error.value   = null
  try {
    await loadProject()
    await Promise.all([loadMetrics(), loadTasks()])
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// ── Task modal ────────────────────────────────────────────────────────────────

function openCreateTask() {
  editingTask.value = null
  taskForm.value    = { nombre: '', descripcion: '', prioridad: 'MEDIA', estado: 'PENDIENTE', fecha_vencimiento: '' }
  taskError.value   = null
  showTaskModal.value = true
}

function openEditTask(task) {
  editingTask.value = task
  taskForm.value    = {
    nombre:            task.nombre,
    descripcion:       task.descripcion || '',
    prioridad:         task.prioridad,
    estado:            task.estado,
    fecha_vencimiento: task.fecha_vencimiento?.substring(0, 10) || '',
  }
  taskError.value   = null
  showTaskModal.value = true
}

function closeTaskModal() {
  showTaskModal.value = false
}

async function submitTask() {
  taskError.value   = null
  taskSubmitting.value = true
  try {
    const body = {
      nombre:            taskForm.value.nombre,
      prioridad:         taskForm.value.prioridad,
      estado:            taskForm.value.estado,
      descripcion:       taskForm.value.descripcion || undefined,
      fecha_vencimiento: taskForm.value.fecha_vencimiento || undefined,
    }
    const url    = editingTask.value
      ? `/api/projects/${projectId.value}/tareas/${editingTask.value.id_tarea}`
      : `/api/projects/${projectId.value}/tareas`
    const method = editingTask.value ? 'PUT' : 'POST'

    const res  = await fetch(url, {
      method,
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) { taskError.value = data.message || `Error ${res.status}`; return }

    closeTaskModal()
    await Promise.all([loadTasks(), loadMetrics()])
  } catch {
    taskError.value = 'Network error, try again.'
  } finally {
    taskSubmitting.value = false
  }
}

async function closeTask(task) {
  closingTaskId.value = task.id_tarea
  try {
    const res = await fetch(
      `/api/projects/${projectId.value}/tareas/${task.id_tarea}/cerrar`,
      { method: 'PATCH', headers: authHeader() }
    )
    if (res.ok) await Promise.all([loadTasks(), loadMetrics()])
  } finally {
    closingTaskId.value = null
  }
}

onMounted(loadAll)
watch(() => route.params.id, loadAll)
</script>
