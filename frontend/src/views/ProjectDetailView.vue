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
        <button class="btn-primary" style="margin-top: 20px" @click="loadAll">
          Retry
        </button>
      </div>

      <template v-else-if="project">
        <!-- ── Header ── -->
        <header class="pd-header">
          <RouterLink to="/projects" class="pd-back">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M9 2L4 7l5 5"
                stroke="#555"
                stroke-width="1.4"
                stroke-linecap="square"
              />
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
                    <rect
                      x="1"
                      y="2"
                      width="10"
                      height="9"
                      rx="1"
                      stroke="#555"
                      stroke-width="1.2"
                    />
                    <path
                      d="M1 5h10M4 1v2M8 1v2"
                      stroke="#555"
                      stroke-width="1.2"
                      stroke-linecap="square"
                    />
                  </svg>
                  {{ formatDate(project.fecha_inicio) }}
                  <template v-if="project.fecha_fin_planificada">
                    &rarr; {{ formatDate(project.fecha_fin_planificada) }}
                  </template>
                </span>
                <span
                  v-if="daysRemaining !== null"
                  class="pd-meta-item"
                  :style="{
                    color:
                      daysRemaining < 0
                        ? '#fb7185'
                        : daysRemaining <= 7
                          ? '#f97316'
                          : '#555',
                  }"
                >
                  {{
                    daysRemaining < 0
                      ? `${Math.abs(daysRemaining)}d overdue`
                      : `${daysRemaining}d remaining`
                  }}
                </span>
              </div>

              <p v-if="project.descripcion" class="pd-desc">
                {{ project.descripcion }}
              </p>
            </div>

            <div class="pd-header-right">
              <div class="budget-card">
                <div class="budget-card-top">
                  <span class="budget-label">Budget</span>
                  <span class="budget-pct" :style="{ color: budgetColor }"
                    >{{ budgetPct }}%</span
                  >
                </div>
                <ProgressBar :pct="budgetPct" :color="budgetColor" />
                <div class="budget-amounts">
                  <span
                    >${{ formatMoney(metrics?.presupuesto?.total_real || 0) }}
                    <small>spent</small></span
                  >
                  <span
                    >${{ formatMoney(project.presupuesto_total) }}
                    <small>total</small></span
                  >
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
                <div
                  v-for="s in taskStateRows"
                  :key="s.estado"
                  class="task-state-row"
                >
                  <div class="task-state-label">
                    <span
                      class="task-state-dot"
                      :style="{ background: s.color }"
                    ></span>
                    <span>{{ s.label }}</span>
                  </div>
                  <ProgressBar :pct="s.pct" :color="s.color" style="flex:1" />
                  <span class="task-state-count">{{ s.count }}</span>
                </div>
              </div>
            </div>

            <!-- Budget detail -->
            <div class="metric-card">
              <p class="metric-kicker">Budget Overview</p>
              <div class="budget-detail-row">
                <div class="budget-detail-cell">
                  <div class="budget-detail-val">
                    ${{ formatMoney(project.presupuesto_total) }}
                  </div>
                  <div class="budget-detail-sub">Total budget</div>
                </div>
                <div class="budget-detail-cell">
                  <div
                    class="budget-detail-val"
                    :style="{ color: budgetColor }"
                  >
                    ${{ formatMoney(metrics?.presupuesto?.total_real || 0) }}
                  </div>
                  <div class="budget-detail-sub">Spent</div>
                </div>
                <div class="budget-detail-cell">
                  <div
                    class="budget-detail-val"
                    :style="{
                      color: budgetRemaining < 0 ? '#fb7185' : '#34d399',
                    }"
                  >
                    ${{ formatMoney(Math.abs(budgetRemaining)) }}
                  </div>
                  <div class="budget-detail-sub">{{ budgetRemaining < 0 ? 'Overrun' : 'Available' }}</div>
                </div>
              </div>
              <ProgressBar :pct="budgetPct" :color="budgetColor" style="margin-top:16px" />
            </div>

            <!-- Inventory movements -->
            <div class="metric-card">
              <p class="metric-kicker">Inventory Activity</p>
              <template v-if="metrics?.movimientos?.length">
                <div
                  v-for="mov in metrics.movimientos"
                  :key="mov.tipo"
                  class="movement-row"
                >
                  <span
                    class="movement-dot"
                    :style="{ background: movColor(mov.tipo) }"
                  ></span>
                  <span class="movement-tipo">{{ mov.tipo }}</span>
                  <span class="movement-count">{{ mov.count }}</span>
                  <span class="movement-total"
                    >${{ formatMoney(mov.total || 0) }}</span
                  >
                </div>
              </template>
              <p v-else class="empty-hint">No inventory movements recorded.</p>
            </div>

            <!-- Team -->
            <div class="metric-card">
              <p class="metric-kicker">Team Breakdown</p>
              <template v-if="metrics?.equipo?.length">
                <div v-for="role in metrics.equipo" :key="role.rol" class="team-role-row">
                  <div class="team-role-avatar">{{ role.total }}</div>
                  <div>
                    <div class="team-role-name">{{ role.rol }}</div>
                    <div class="team-role-sub">
                      {{
                        role.total === 1 ? "1 member" : `${role.total} members`
                      }}
                    </div>
                  </div>
                </div>
              </template>
              <p v-else class="empty-hint">
                No roles assigned to this project yet.
              </p>
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

            <button
              v-if="canManageTasks"
              class="btn-primary"
              @click="openCreateTask"
            >
              <svg class="icon16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 3v10M3 8h10"
                  stroke="#0a0a0a"
                  stroke-width="1.5"
                  stroke-linecap="square"
                />
              </svg>
              New task
            </button>
          </div>

          <div v-if="tasksLoading" class="tasks-loading">Loading tasks…</div>

          <div v-else-if="filteredTasks.length === 0" class="empty-state">
            <p>No tasks match your filters.</p>
          </div>

          <div v-else class="tasks-list">
            <TaskCard
              v-for="task in filteredTasks"
              :key="task.id_tarea"
              :task="task"
              :can-edit="canManageTasks"
              :closing="closingTaskId === task.id_tarea"
              @click-detail="openTaskDetail"
              @click-edit="openEditTask"
              @click-close="closeTask"
            />
          </div>
        </section>

        <!-- ── TEAM ── -->
        <!-- TODO: reemplazar MOCK_TEAMS con endpoint real cuando exista tabla equipos en BD -->
        <section v-if="activeTab === 'team'" class="tab-panel">
          <div class="tasks-toolbar">
            <div class="tasks-filters">
              <input v-model="teamFilterNombre" type="text" placeholder="Search by name…" class="filter-input" />
              <select v-model="teamFilterArea" class="filter-select">
                <option value="">All areas</option>
                <option v-for="area in MOCK_AREAS" :key="area" :value="area">{{ area }}</option>
              </select>
              <span class="tasks-count">{{ filteredTeams.length }} teams</span>
            </div>
            <button class="btn-primary" @click="openCreateTeam">
              <svg class="icon16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="#0a0a0a" stroke-width="1.5" stroke-linecap="square"/>
              </svg>
              New team
            </button>
          </div>

          <div v-if="filteredTeams.length === 0" class="empty-state">
            <p>No teams match your filters.</p>
          </div>

          <div v-else class="tasks-list">
            <div class="list-header">
              <span>Team</span><span>Area</span><span>Members</span><span>Tasks</span>
            </div>
            <div v-for="team in filteredTeams" :key="team.id" class="task-card list-row">
              <div class="list-name-col">
                <span class="priority-bar" :style="{ background: areaColor(team.area) }"></span>
                <span class="task-name task-name-link" @click="openTeamDetail(team)">{{ team.nombre }}</span>
              </div>
              <span><span class="area-badge">{{ team.area }}</span></span>
              <span class="list-cell-num">{{ team.miembros.length }}</span>
              <span class="list-cell-num">{{ team.tareasAsignadas.length }}</span>
            </div>
          </div>
        </section>

      </template>
    </div>

    <!-- ── Modals ── -->
    <TaskDetailModal
      v-model="showDetailModal"
      :task="detailTask"
      :loading="detailLoading"
    />

    <TeamDetailModal
      v-model="showTeamDetailModal"
      :team="detailTeam"
      @edit="handleTeamDetailEdit"
      @delete="deleteTeam"
    />

    <TeamModal
      v-model="showTeamModal"
      :editing-team="editingTeam"
      :members="projectMembers"
      :submitting="teamSubmitting"
      :error="teamError"
      @submit="submitTeam"
    />

    <TaskModal
      v-model="showTaskModal"
      :editing-task="editingTask"
      :members="projectMembers"
      :submitting="taskSubmitting"
      :error="taskError"
      @submit="submitTask"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import AppNavbar       from '../components/AppNavbar.vue'
import ProgressBar     from '../components/UI/ProgressBar/ProgressBar.vue'
import TaskCard        from '../components/projects/TaskCard.vue'
import TaskModal       from '../components/projects/TaskModal.vue'
import TaskDetailModal from '../components/projects/TaskDetailModal.vue'
import TeamModal       from '../components/projects/TeamModal.vue'
import TeamDetailModal from '../components/projects/TeamDetailModal.vue'
import { useAuthStore } from '../stores/auth'
import {
  statusStyle, statusLabel, priorityColor,
  formatDate, formatMoney, isOverdue,
} from '../utils/statusHelpers.js'

const route = useRoute();
const authStore = useAuthStore();

// ── State ─────────────────────────────────────────────────────────────────────

const project = ref(null);
const metrics = ref(null);
const tareas = ref([]);
const loading = ref(true);
const error = ref(null);
const tasksLoading = ref(false);
const activeTab = ref("overview");

const taskFilterEstado = ref("");
const taskFilterPrioridad = ref("");

const showTaskModal = ref(false);
const editingTask = ref(null);
const taskSubmitting = ref(false);
const taskError = ref(null);
const closingTaskId = ref(null);

const showDetailModal = ref(false)
const detailTask      = ref(null)
const detailLoading   = ref(false)

const showTeamDetailModal = ref(false)
const detailTeam          = ref(null)
const showTeamModal       = ref(false)
const teamSubmitting      = ref(false)
const teamError           = ref(null)
const editingTeam         = ref(null)

const projectMembers = ref([])

// TODO: reemplazar con endpoint real cuando exista tabla equipos en BD
const mockTeamsNextId = ref(6)
const mockTeams = ref([
  { id: 1, nombre: 'Alpha', area: 'Desarrollo',
    miembros: [], tareasAsignadas: [
      { id: 1, nombre: 'Setup CI/CD pipeline', estado: 'EN_PROGRESO', prioridad: 'ALTA', fecha_vencimiento: '2026-05-01', asignado: 'Manolo Flores' },
      { id: 2, nombre: 'API integration',      estado: 'PENDIENTE',   prioridad: 'MEDIA', fecha_vencimiento: '2026-05-15', asignado: null },
      { id: 3, nombre: 'Database migration',   estado: 'COMPLETADA',  prioridad: 'CRITICA', fecha_vencimiento: '2026-04-20', asignado: 'Manolo Flores' },
    ]
  },
  { id: 2, nombre: 'Beta', area: 'Diseño',
    miembros: [], tareasAsignadas: [
      { id: 4, nombre: 'UI component library', estado: 'EN_PROGRESO', prioridad: 'MEDIA', fecha_vencimiento: '2026-05-10', asignado: null },
      { id: 5, nombre: 'Figma handoff',        estado: 'PENDIENTE',   prioridad: 'BAJA',  fecha_vencimiento: '2026-05-20', asignado: null },
    ]
  },
  { id: 3, nombre: 'QA', area: 'Calidad',
    miembros: [], tareasAsignadas: [
      { id: 6, nombre: 'Write test cases', estado: 'PENDIENTE',   prioridad: 'ALTA',  fecha_vencimiento: '2026-05-05', asignado: null },
      { id: 7, nombre: 'Regression tests', estado: 'EN_PROGRESO', prioridad: 'MEDIA', fecha_vencimiento: '2026-05-12', asignado: null },
    ]
  },
  { id: 4, nombre: 'DevOps', area: 'Infraestructura',
    miembros: [], tareasAsignadas: [
      { id: 8, nombre: 'Server provisioning', estado: 'COMPLETADA', prioridad: 'CRITICA', fecha_vencimiento: '2026-04-15', asignado: null },
      { id: 9, nombre: 'Monitoring setup',    estado: 'PENDIENTE',  prioridad: 'ALTA',   fecha_vencimiento: '2026-05-08', asignado: null },
    ]
  },
  { id: 5, nombre: 'Dirección', area: 'Gestión',
    miembros: [], tareasAsignadas: [
      { id: 10, nombre: 'Stakeholder report', estado: 'PENDIENTE', prioridad: 'MEDIA', fecha_vencimiento: '2026-05-30', asignado: null },
    ]
  },
])

const MOCK_AREAS = ['Desarrollo', 'Diseño', 'Calidad', 'Infraestructura', 'Gestión']
const teamFilterNombre = ref('')
const teamFilterArea   = ref('')
const filteredTeams = computed(() =>
  mockTeams.value.filter(t => {
    if (teamFilterNombre.value && !t.nombre.toLowerCase().includes(teamFilterNombre.value.toLowerCase())) return false
    if (teamFilterArea.value   && t.area !== teamFilterArea.value) return false
    return true
  })
)

// ── Tabs ─────────────────────────────────────────────────────────────────────
const tabs = [
  { id: "overview", label: "Overview" },
  { id: "tasks", label: "Tasks" },
  { id: "team", label: "Team" },
  { id: "progress", label: "Progress" }, // Placeholder for future feature
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const projectId = computed(() => route.params.id);

function authHeader() {
  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  if (authStore.idEmpresaActual)
    headers["X-Empresa-ID"] = authStore.idEmpresaActual;
  return headers;
}

function areaColor(area) {
  return {
    'Desarrollo':      '#60a5fa',
    'Diseño':          '#60a5fa',
    'Calidad':         '#34d399',
    'Infraestructura': '#f97316',
    'Gestión':         '#c9a962',
  }[area] || '#555'
}

function movColor(tipo) {
  return (
    {
      ENTRADA: "#34d399",
      SALIDA: "#fb7185",
      AJUSTE: "#60a5fa",
      GASTO_ADMIN: "#f97316",
    }[tipo] || "#666"
  );
}

// ── Computed ──────────────────────────────────────────────────────────────────

const canManageTasks = computed(
  () => project.value?.mis_permisos?.includes("gestionar_tareas") ?? false,
);

const daysRemaining = computed(() => {
  if (!project.value?.fecha_fin_planificada) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(project.value.fecha_fin_planificada);
  return Math.round((end - today) / 86_400_000);
});

const budgetPct = computed(() => {
  const total = Number(project.value?.presupuesto_total || 0);
  const spent = Number(metrics.value?.presupuesto?.total_real || 0);
  if (!total) return 0;
  return Math.round((spent / total) * 100);
});

const budgetColor = computed(() => {
  if (budgetPct.value >= 100) return "#fb7185";
  if (budgetPct.value >= 80) return "#f97316";
  return "#34d399";
});

const budgetRemaining = computed(() => {
  const total = Number(project.value?.presupuesto_total || 0);
  const spent = Number(metrics.value?.presupuesto?.total_real || 0);
  return total - spent;
});

const TASK_STATE_META = [
  { estado: 'PENDIENTE',   label: 'Pending',    color: '#60a5fa' },
  { estado: 'EN_PROGRESO', label: 'In Progress', color: '#34d399' },
  { estado: 'COMPLETADA',  label: 'Completed',   color: '#c9a962' },
  { estado: 'CANCELADA',   label: 'Cancelled',   color: '#fb7185' },
]

const totalTasks = computed(() =>
  (metrics.value?.tareas || []).reduce((acc, t) => acc + Number(t.count), 0),
);

const taskStateRows = computed(() => {
  const total = totalTasks.value || 1;
  return TASK_STATE_META.map((meta) => {
    const found = (metrics.value?.tareas || []).find(
      (t) => t.estado === meta.estado,
    );
    const count = found ? Number(found.count) : 0;
    return { ...meta, count, pct: Math.round((count / total) * 100) };
  });
});

const filteredTasks = computed(() =>
  tareas.value.filter((t) => {
    if (taskFilterEstado.value && t.estado !== taskFilterEstado.value)
      return false;
    if (taskFilterPrioridad.value && t.prioridad !== taskFilterPrioridad.value)
      return false;
    return true;
  }),
);

// ── API calls ─────────────────────────────────────────────────────────────────

async function loadProject() {
  const res = await fetch(`/api/projects/${projectId.value}`, {
    headers: authHeader(),
  });
  if (res.status === 404) throw new Error("Project not found.");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  project.value = data.data;
}

async function loadMetrics() {
  const res = await fetch(`/api/projects/${projectId.value}/metrics`, {
    headers: authHeader(),
  });
  if (!res.ok) return;
  const data = await res.json();
  metrics.value = data.data;
}

async function loadTasks() {
  tasksLoading.value = true;
  try {
    const res = await fetch(`/api/projects/${projectId.value}/tareas`, {
      headers: authHeader(),
    });
    if (!res.ok) return;
    const data = await res.json();
    tareas.value = data.data ?? [];
  } finally {
    tasksLoading.value = false;
  }
}

async function loadMembers() {
  const res = await fetch(`/api/projects/${projectId.value}/members`, { headers: authHeader() })
  if (!res.ok) return
  const data = await res.json()
  projectMembers.value = data.data ?? []
}

async function loadMembers() {
  const res = await fetch(`/api/projects/${projectId.value}/members`, { headers: authHeader() })
  if (!res.ok) return
  const data = await res.json()
  projectMembers.value = data.data ?? []
}

async function loadAll() {
  loading.value = true;
  error.value = null;
  try {
    await loadProject()
    await Promise.all([loadMetrics(), loadTasks(), loadMembers()])
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

// ── Task modal ────────────────────────────────────────────────────────────────

function openCreateTask() {
  editingTask.value   = null
  taskError.value     = null
  showTaskModal.value = true
}

function openEditTask(task) {
  editingTask.value   = task
  taskError.value     = null
  showTaskModal.value = true
}

async function openTaskDetail(task) {
  showDetailModal.value = true
  detailLoading.value   = true
  detailTask.value      = null
  const res  = await fetch(`/api/projects/${projectId.value}/tareas/${task.id_tarea}`, { headers: authHeader() })
  const data = await res.json()
  detailTask.value    = data.data
  detailLoading.value = false
}

async function submitTask(formData) {
  taskError.value      = null
  taskSubmitting.value = true
  try {
    const body = {
      nombre:            formData.nombre,
      prioridad:         formData.prioridad,
      estado:            formData.estado,
      descripcion:       formData.descripcion || undefined,
      fecha_vencimiento: formData.fecha_vencimiento || undefined,
      id_asignado: formData.id_asignado ? Number(formData.id_asignado) : (editingTask.value ? null : undefined),
    }
    const url    = editingTask.value
      ? `/api/projects/${projectId.value}/tareas/${editingTask.value.id_tarea}`
      : `/api/projects/${projectId.value}/tareas`;
    const method = editingTask.value ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      taskError.value = data.message || `Error ${res.status}`;
      return;
    }

    showTaskModal.value = false
    await Promise.all([loadTasks(), loadMetrics()])
  } catch {
    taskError.value = "Network error, try again.";
  } finally {
    taskSubmitting.value = false;
  }
}

async function closeTask(task) {
  closingTaskId.value = task.id_tarea;
  try {
    const res = await fetch(
      `/api/projects/${projectId.value}/tareas/${task.id_tarea}/cerrar`,
      { method: "PATCH", headers: authHeader() },
    );
    if (res.ok) await Promise.all([loadTasks(), loadMetrics()]);
  } finally {
    closingTaskId.value = null;
  }
}

// ── Team modal ────────────────────────────────────────────────────────────────

function openCreateTeam() {
  editingTeam.value   = null
  teamError.value     = null
  showTeamModal.value = true
}

function openTeamDetail(team) {
  detailTeam.value          = team
  showTeamDetailModal.value = true
}

function handleTeamDetailEdit(team) {
  showTeamDetailModal.value = false
  editingTeam.value         = team
  teamError.value           = null
  showTeamModal.value       = true
}

function submitTeam(formData) {
  if (!formData.nombre.trim()) { teamError.value = 'El nombre es requerido.'; return }
  if (!formData.area)          { teamError.value = 'El área es requerida.'; return }

  const selectedMembers = projectMembers.value.filter(m => formData.miembros.includes(m.id_usuario))
  if (editingTeam.value) {
    const team = mockTeams.value.find(t => t.id === editingTeam.value.id)
    team.nombre   = formData.nombre.trim()
    team.area     = formData.area
    team.miembros = selectedMembers
  } else {
    mockTeams.value.push({
      id: mockTeamsNextId.value++,
      nombre:          formData.nombre.trim(),
      area:            formData.area,
      miembros:        selectedMembers,
      tareasAsignadas: [],
    })
  }
  showTeamModal.value = false
}

function deleteTeam(team) {
  mockTeams.value = mockTeams.value.filter(t => t.id !== team.id)
  if (detailTeam.value?.id === team.id) {
    showTeamDetailModal.value = false
    detailTeam.value          = null
  }
}

onMounted(loadAll)
watch(() => route.params.id, loadAll)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Manrope:wght@400;500;600;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.pd-root {
  background: transparent;
  min-height: 100vh;
}

.pd-layout {
  font-family: 'Manrope', sans-serif;
  color: #faf8f5;
  min-height: calc(100vh - 56px);
  margin-top: 56px;
  background: rgba(10,10,10,0.82);
  display: flex;
  flex-direction: column;
}

/* ── State screens ── */
.state-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.state-title { font-family: 'Playfair Display', serif; font-size: 24px; color: #faf8f5; }
.state-msg   { font-size: 14px; color: #888; }

.pd-spinner {
  display: inline-block;
  width: 32px; height: 32px;
  border: 2px solid rgba(255,255,255,0.1);
  border-top-color: #c9a962;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Header ── */
.pd-header {
  padding: 40px 56px 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  border-bottom: 1px solid #1a1a1a;
}

.pd-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #555;
  text-decoration: none;
  transition: color 0.15s;
  width: fit-content;
}
.pd-back:hover { color: #888; }

.pd-header-body {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 40px;
  padding-bottom: 32px;
}

.pd-header-left {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.pd-title-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.pd-title {
  font-family: 'Playfair Display', serif;
  font-size: 42px;
  font-weight: 400;
  color: #faf8f5;
  line-height: 1.1;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border: 1px solid;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  flex-shrink: 0;
}
.status-badge.small {
  font-size: 10px;
  padding: 2px 8px;
}

.pd-meta-row {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.pd-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #555;
}

.pd-desc {
  font-size: 14px;
  color: #888;
  line-height: 1.6;
  max-width: 640px;
}

/* Budget card in header */
.pd-header-right { flex-shrink: 0; }

.budget-card {
  background: rgba(15,15,15,0.8);
  border: 1px solid #1f1f1f;
  padding: 20px 24px;
  min-width: 260px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.budget-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.budget-label { font-size: 10px; letter-spacing: 0.1em; color: #444; text-transform: uppercase; }
.budget-pct   { font-size: 20px; font-weight: 700; }

.budget-bar-bg {
  height: 4px;
  background: #1a1a1a;
}
.budget-bar-fill {
  height: 100%;
  transition: width 0.5s ease;
}

.budget-amounts {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #888;
}
.budget-amounts small { font-size: 10px; color: #555; }

/* ── Tabs ── */
.pd-tabs {
  display: flex;
  gap: 32px;
  padding: 0 56px;
  border-bottom: 1px solid #1f1f1f;
}

.pd-tab {
  background: none;
  border: none;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  color: #555;
  padding: 16px 0;
  border-bottom: 2px solid transparent;
  transition: color 0.15s;
}
.pd-tab.active { color: #c9a962; border-bottom-color: #c9a962; }
.pd-tab:hover:not(.active) { color: #888; }

/* ── Tab panels ── */
.tab-panel {
  padding: 40px 56px;
  flex: 1;
}

/* ── Overview grid ── */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.metric-card {
  background: rgba(15,15,15,0.7);
  border: 1px solid #1f1f1f;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.metric-kicker {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #c9a962;
}

.metric-total { font-size: 13px; color: #555; }

/* Task states */
.task-states { display: flex; flex-direction: column; gap: 10px; }

.task-state-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.task-state-label {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 110px;
  flex-shrink: 0;
  font-size: 12px;
  color: #888;
}
.task-state-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.task-state-bar-bg {
  flex: 1;
  height: 4px;
  background: #1a1a1a;
}
.task-state-bar-fill {
  height: 100%;
  transition: width 0.4s;
}
.task-state-count {
  font-size: 12px;
  color: #555;
  width: 20px;
  text-align: right;
  flex-shrink: 0;
}

/* Budget detail */
.budget-detail-row {
  display: flex;
  gap: 24px;
}
.budget-detail-cell { flex: 1; }
.budget-detail-val { font-size: 22px; font-weight: 700; line-height: 1; }
.budget-detail-sub { font-size: 11px; color: #555; margin-top: 4px; }

/* Movements */
.movement-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #111;
}
.movement-row:last-child { border-bottom: none; }
.movement-dot  { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.movement-tipo { font-size: 12px; color: #faf8f5; flex: 1; }
.movement-count { font-size: 11px; color: #555; }
.movement-total { font-size: 12px; color: #888; min-width: 60px; text-align: right; }

/* Team roles */
.team-role-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 0;
  border-bottom: 1px solid #111;
}
.team-role-row:last-child { border-bottom: none; }
.team-role-avatar {
  width: 36px; height: 36px;
  background: rgba(201,169,98,0.1);
  border: 1px solid rgba(201,169,98,0.2);
  color: #c9a962;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}
.team-role-name { font-size: 13px; color: #faf8f5; }
.team-role-sub  { font-size: 11px; color: #555; margin-top: 2px; }

.empty-hint { font-size: 13px; color: #444; }

/* ── Tasks tab ── */
.tasks-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
}

.tasks-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-select {
  appearance: none;
  background: #0a0a0a;
  border: 1px solid #1f1f1f;
  color: #faf8f5;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  padding: 8px 12px;
  outline: none;
  transition: border-color 0.15s;
  cursor: pointer;
}
.filter-select:focus { border-color: #c9a962; }
.filter-select option { background: #0f0f0f; }

.tasks-count { font-size: 12px; color: #444; }

.tasks-loading { font-size: 13px; color: #555; padding: 32px 0; }

.tasks-list { display: flex; flex-direction: column; gap: 8px; }

.task-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: rgba(15,15,15,0.7);
  border: 1px solid #1f1f1f;
  transition: border-color 0.15s;
}
.task-card:hover { border-color: #2a2a2a; }
.task-card--done { opacity: 0.55; }

.task-card-left {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.priority-bar {
  width: 3px;
  min-height: 36px;
  flex-shrink: 0;
  align-self: stretch;
}

.task-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.task-name {
  font-size: 14px;
  color: #faf8f5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-desc {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.priority-badge {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
}

.due-badge {
  font-size: 11px;
  color: #555;
}
.due-badge.overdue { color: #fb7185; }

.task-card-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.task-action-btn {
  background: transparent;
  border: 1px solid #1f1f1f;
  color: #888;
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  padding: 6px 12px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.task-action-btn:hover { border-color: #333; color: #faf8f5; }
.task-action-btn--close { border-color: rgba(52,211,153,0.2); color: #34d399; }
.task-action-btn--close:hover { border-color: rgba(52,211,153,0.4); }
.task-action-btn:disabled { opacity: 0.5; cursor: wait; }

/* ── Team tab ── */
.team-note {
  font-size: 13px;
  color: #666;
  margin-bottom: 32px;
  line-height: 1.6;
}
.team-note-link { color: #c9a962; text-decoration: none; }
.team-note-link:hover { text-decoration: underline; }

.team-roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.team-role-card {
  background: rgba(15,15,15,0.7);
  border: 1px solid #1f1f1f;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
}
.role-count {
  font-family: 'Playfair Display', serif;
  font-size: 42px;
  color: #c9a962;
  line-height: 1;
}
.role-name { font-size: 14px; color: #faf8f5; }
.role-sub  { font-size: 11px; color: #555; }

/* ── Shared ── */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #c9a962;
  border: none;
  padding: 10px 18px;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #0a0a0a;
  white-space: nowrap;
  transition: filter 0.15s;
}
.btn-primary:hover { filter: brightness(1.1); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-secondary {
  background: transparent;
  border: 1px solid #1f1f1f;
  color: #faf8f5;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  padding: 10px 18px;
  cursor: pointer;
  transition: border-color 0.15s;
}
.btn-secondary:hover { border-color: #333; }

.empty-state { text-align: center; padding: 60px 0; color: #555; font-size: 14px; }

.icon16 { width: 16px; height: 16px; flex-shrink: 0; }

/* ── Modal ── */
.modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
}
.modal {
  background: #0f0f0f;
  border: 1px solid #1f1f1f;
  width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto;
}
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20px 24px; border-bottom: 1px solid #1a1a1a;
}
.modal-title { font-family: 'Playfair Display', serif; font-size: 20px; color: #faf8f5; }
.modal-close { background: none; border: none; cursor: pointer; padding: 4px; }
.modal-form  { padding: 24px; display: flex; flex-direction: column; gap: 16px; }

.form-field { display: flex; flex-direction: column; gap: 6px; }
.form-field label { font-size: 11px; color: #888; letter-spacing: 0.05em; }
.form-field input,
.form-field textarea,
.form-field select {
  background: #0a0a0a; border: 1px solid #1f1f1f;
  color: #faf8f5; font-family: 'Manrope', sans-serif; font-size: 13px;
  padding: 10px 12px; outline: none; resize: none;
  transition: border-color 0.15s;
}
.form-field input:focus,
.form-field textarea:focus,
.form-field select:focus { border-color: #c9a962; }
.form-field select option { background: #0f0f0f; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.req { color: #c9a962; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
.modal-error   { font-size: 12px; color: #fb7185; }

/* ── Responsive ── */
@media (max-width: 1100px) {
  .pd-header,
  .pd-tabs,
  .tab-panel { padding-left: 40px; padding-right: 40px; }
  .overview-grid { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 900px) {
  .pd-header,
  .pd-tabs,
  .tab-panel { padding-left: 28px; padding-right: 28px; }
  .pd-header-body { flex-direction: column; gap: 24px; }
  .budget-card { min-width: unset; width: 100%; }
  .pd-title { font-size: 32px; }
}

@media (max-width: 640px) {
  .pd-header,
  .pd-tabs,
  .tab-panel { padding-left: 16px; padding-right: 16px; }
  .pd-title { font-size: 26px; }
  .overview-grid { grid-template-columns: 1fr; }
  .tasks-toolbar { flex-direction: column; align-items: flex-start; }
  .task-card { flex-direction: column; align-items: flex-start; }
  .task-card-actions { align-self: flex-end; }
  .pd-tabs { gap: 20px; overflow-x: auto; }
}
</style>
