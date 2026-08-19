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
        <p class="state-title">{{ $t('projects.detail.error.title') }}</p>
        <p class="state-msg">{{ error }}</p>
        <button class="btn-primary" style="margin-top: 20px" @click="loadAll">
          {{ $t('projects.detail.error.retry') }}
        </button>
      </div>

      <template v-else-if="project">
        <!-- ── Header ── -->
        <header class="pd-header">
          <RouterLink to="/projects" class="pd-back">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M9 2L4 7l5 5"
                stroke="var(--k-gray-3)"
                stroke-width="1.4"
                stroke-linecap="square"
              />
            </svg>
            {{ $t('projects.detail.back') }}
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
                      stroke="var(--k-gray-3)"
                      stroke-width="1.2"
                    />
                    <path
                      d="M1 5h10M4 1v2M8 1v2"
                      stroke="var(--k-gray-3)"
                      stroke-width="1.2"
                      stroke-linecap="square"
                    />
                  </svg>
                  {{ formatDate(project.fecha_inicio) }}
                  <template v-if="project.fecha_fin_planificada">
                    &rarr; {{ formatDate(project.fecha_fin_planificada) }}
                  </template>
                </span>
                <!-- TODO SCRUM-16: #f97316 (aviso) no tiene token en la paleta v2 -->
                <span
                  v-if="daysRemaining !== null"
                  class="pd-meta-item"
                  :style="{
                    color:
                      daysRemaining < 0
                        ? 'var(--k-state-error-text)'
                        : daysRemaining <= 7
                          ? '#f97316'
                          : 'var(--k-gray-3)',
                  }"
                >
                  {{
                    daysRemaining < 0
                      ? $t('projects.detail.overdue', { n: Math.abs(daysRemaining) })
                      : $t('projects.detail.remaining', { n: daysRemaining })
                  }}
                </span>
              </div>

              <p v-if="project.descripcion" class="pd-desc">
                {{ project.descripcion }}
              </p>
            </div>

            <div class="pd-header-right">
              <div class="pd-nav-actions">
                <button class="pd-nav-btn" @click="goToBudget">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.2"/>
                    <path d="M6.5 4v.8M6.5 8.2V9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                    <path d="M5 7.8c0 .7.7 1.2 1.5 1.2S8 8.5 8 7.8C8 6.4 5 6.7 5 5.4 5 4.7 5.7 4.2 6.5 4.2S8 4.7 8 5.4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
                  </svg>
                  {{ $t('projects.detail.nav.budget') }}
                </button>
                <button class="pd-nav-btn" @click="goToReports">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M2 11V7M4.5 11V4.5M7 11V2M9.5 11V6" stroke="currentColor" stroke-width="1.3" stroke-linecap="square"/>
                    <path d="M1 12h11" stroke="currentColor" stroke-width="1.3" stroke-linecap="square"/>
                  </svg>
                  {{ $t('projects.detail.nav.reports') }}
                </button>
              </div>
              <div class="budget-card" data-birdie="budget-control">
                <div class="budget-card-top">
                  <span class="budget-label">{{ $t('projects.budget') }}</span>
                  <span class="budget-pct" :style="{ color: budgetColor }"
                    >{{ budgetPct }}%</span
                  >
                </div>
                <ProgressBar :pct="budgetPct" :color="budgetColor" />
                <div class="budget-amounts">
                  <span
                    >${{ formatMoney(spentBudget) }}
                    <small>{{ $t('projects.detail.spent') }}</small></span
                  >
                  <span
                    >${{ formatMoney(totalBudget) }}
                    <small>{{ $t('projects.detail.total') }}</small></span
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
            :data-birdie="tab.id === 'tasks' ? 'tasks-tab' : (tab.id === 'members' ? 'invite-members' : null)"
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
              <p class="metric-kicker">{{ $t('projects.detail.overview.taskProgress') }}</p>
              <p class="metric-total">{{ $t('projects.detail.overview.tasksTotal', { count: totalTasks }) }}</p>
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

            <!-- Project progress -->
            <div class="metric-card">
              <p class="metric-kicker">{{ $t('projects.detail.overview.projectProgress') }}</p>
              <div class="progress-overview-head">
                <div>
                  <div class="progress-overview-value">{{ progressPercentage }}%</div>
                  <div class="progress-overview-sub">{{ progressSourceLabel }}</div>
                </div>
                <span
                  class="status-badge small"
                  :style="{
                    color: progressSignalColor,
                    borderColor: `${progressSignalColor}44`,
                    background: `${progressSignalColor}14`,
                  }"
                >
                  {{ progressEntriesTotal ? $t('projects.detail.overview.updates', { count: progressEntriesTotal }) : $t('projects.detail.overview.noUpdates') }}
                </span>
              </div>
              <ProgressBar :pct="progressPercentage" :color="progressSignalColor" />
              <div class="progress-overview-meta">
                <span>{{ $t('projects.detail.overview.tasksDone', { pct: taskCompletionPercentage }) }}</span>
                <span>{{ $t('projects.detail.overview.milestones', { count: progressMilestones }) }}</span>
                <span>{{ $t('projects.detail.overview.blockers', { count: progressBlockers }) }}</span>
              </div>
              <p class="metric-total">{{ progressLastUpdateLabel }}</p>
            </div>

            <!-- Budget detail -->
            <div class="metric-card">
              <p class="metric-kicker">{{ $t('projects.detail.overview.budgetOverview') }}</p>
              <div class="budget-detail-row">
                <div class="budget-detail-cell">
                  <div class="budget-detail-val">
                    ${{ formatMoney(totalBudget) }}
                  </div>
                  <div class="budget-detail-sub">{{ $t('projects.detail.overview.totalBudget') }}</div>
                </div>
                <div class="budget-detail-cell">
                  <div
                    class="budget-detail-val"
                    :style="{ color: budgetColor }"
                  >
                    ${{ formatMoney(spentBudget) }}
                  </div>
                  <div class="budget-detail-sub">{{ $t('projects.detail.overview.budgetSpent') }}</div>
                </div>
                <div class="budget-detail-cell">
                  <div
                    class="budget-detail-val"
                    :style="{
                      color: budgetRemaining < 0 ? 'var(--k-state-error-text)' : 'var(--k-state-success-text)',
                    }"
                  >
                    ${{ formatMoney(Math.abs(budgetRemaining)) }}
                  </div>
                  <div class="budget-detail-sub">{{ budgetRemaining < 0 ? $t('projects.detail.overview.budgetOverrun') : $t('projects.detail.overview.available') }}</div>
                </div>
              </div>
              <ProgressBar :pct="budgetPct" :color="budgetColor" style="margin-top:16px" />
            </div>

            <!-- Inventory movements -->
            <div class="metric-card">
              <p class="metric-kicker">{{ $t('projects.detail.overview.inventoryActivity') }}</p>
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
              <p v-else class="empty-hint">{{ $t('projects.detail.overview.noMovements') }}</p>
            </div>

            <!-- Team -->
            <div class="metric-card">
              <p class="metric-kicker">{{ $t('projects.detail.overview.teamBreakdown') }}</p>
              <template v-if="metrics?.equipo?.length">
                <div v-for="role in metrics.equipo" :key="role.rol" class="team-role-row">
                  <div class="team-role-avatar">{{ role.total }}</div>
                  <div>
                    <div class="team-role-name">{{ role.rol }}</div>
                    <div class="team-role-sub">
                      {{ role.total === 1 ? $t('projects.detail.overview.memberSingular') : $t('projects.detail.overview.memberPlural', { count: role.total }) }}
                    </div>
                  </div>
                </div>
              </template>
              <p v-else class="empty-hint">{{ $t('projects.detail.overview.noRoles') }}</p>
            </div>
          </div>
        </section>

        <!-- ── TASKS ── -->
        <section v-if="activeTab === 'tasks'" class="tab-panel">
          <div class="tasks-toolbar">
            <div class="tasks-filters">
              <select v-model="taskFilterEstado" class="filter-select">
                <option value="">{{ $t('projects.tasks.allStatuses') }}</option>
                <option value="PENDIENTE">{{ $t('projects.taskStatuses.pending') }}</option>
                <option value="EN_PROGRESO">{{ $t('projects.taskStatuses.inProgress') }}</option>
                <option value="COMPLETADA">{{ $t('projects.taskStatuses.completed') }}</option>
                <option value="CANCELADA">{{ $t('projects.taskStatuses.cancelled') }}</option>
              </select>
              <select v-model="taskFilterPrioridad" class="filter-select">
                <option value="">{{ $t('projects.tasks.allPriorities') }}</option>
                <option value="CRITICA">{{ $t('projects.priorities.critical') }}</option>
                <option value="ALTA">{{ $t('projects.priorities.high') }}</option>
                <option value="MEDIA">{{ $t('projects.priorities.medium') }}</option>
                <option value="BAJA">{{ $t('projects.priorities.low') }}</option>
              </select>
              <span class="tasks-count">{{ $t('projects.tasks.count', { count: filteredTasks.length }) }}</span>
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
              {{ $t('projects.tasks.newTask') }}
            </button>
          </div>

          <div v-if="tasksLoading" class="tasks-loading">{{ $t('projects.tasks.loading') }}</div>

          <div v-else-if="filteredTasks.length === 0" class="tab-empty">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="5" y="7" width="26" height="22" rx="2" stroke="#2a2a2a" stroke-width="1.4"/>
              <path d="M5 13h26M12 7V5M24 7V5" stroke="#2a2a2a" stroke-width="1.4" stroke-linecap="square"/>
              <path d="M11 20h14M11 24.5h8" stroke="#2a2a2a" stroke-width="1.4" stroke-linecap="square"/>
            </svg>
            <p class="tab-empty-title">
              {{ taskFilterEstado || taskFilterPrioridad ? $t('projects.tasks.emptyFilter') : $t('projects.tasks.emptyNoTasks') }}
            </p>
            <p class="tab-empty-sub">
              {{ taskFilterEstado || taskFilterPrioridad ? $t('projects.tasks.emptyFilterSub') : $t('projects.tasks.emptyNoTasksSub') }}
            </p>
            <button v-if="canManageTasks && !taskFilterEstado && !taskFilterPrioridad" class="btn-primary" @click="openCreateTask">
              <svg class="icon16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="#0a0a0a" stroke-width="1.5" stroke-linecap="square"/>
              </svg>
              {{ $t('projects.tasks.emptyCta') }}
            </button>
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

        <!-- ── TEAM (TODO: reemplazar mock con endpoint real cuando exista tabla equipos en BD) ── -->
        <section v-if="activeTab === 'team'" class="tab-panel">
          <div class="tasks-toolbar">
            <div class="tasks-filters">
              <input
                v-model="teamFilterNombre"
                type="text"
                :placeholder="$t('projects.team.searchPlaceholder')"
                class="filter-input"
              />
              <select v-model="teamFilterArea" class="filter-select">
                <option value="">{{ $t('projects.team.allAreas') }}</option>
                <option v-for="area in MOCK_AREAS" :key="area" :value="area">
                  {{ area }}
                </option>
              </select>
              <span class="tasks-count">{{ $t('projects.team.count', { count: filteredTeams.length }) }}</span>
            </div>
            <button class="btn-primary" @click="openCreateTeam">
              <svg class="icon16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="var(--k-shade-1)" stroke-width="1.5" stroke-linecap="square" />
              </svg>
              {{ $t('projects.team.newTeam') }}
            </button>
          </div>

          <div v-if="filteredTeams.length === 0" class="tab-empty">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <circle cx="13" cy="12" r="5" stroke="var(--k-shade-7)" stroke-width="1.4"/>
              <path d="M3 30c0-5.5 4.5-10 10-10s10 4.5 10 10" stroke="var(--k-shade-7)" stroke-width="1.4" stroke-linecap="square"/>
              <path d="M25 16c2.8.8 5 3.4 5 6.5M33 30c0-4-2.5-7.4-6-8.5" stroke="var(--k-shade-7)" stroke-width="1.4" stroke-linecap="square"/>
            </svg>
            <p class="tab-empty-title">
              {{ teamFilterNombre || teamFilterArea ? $t('projects.team.emptyFilter') : $t('projects.team.emptyNoTeams') }}
            </p>
            <p class="tab-empty-sub">
              {{ teamFilterNombre || teamFilterArea ? $t('projects.team.emptyFilterSub') : $t('projects.team.emptyNoTeamsSub') }}
            </p>
            <button v-if="!teamFilterNombre && !teamFilterArea" class="btn-primary" @click="openCreateTeam">
              <svg class="icon16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="var(--k-shade-1)" stroke-width="1.5" stroke-linecap="square"/>
              </svg>
              {{ $t('projects.team.emptyCta') }}
            </button>
          </div>

          <div v-else class="tasks-list">
            <div class="list-header">
              <span>{{ $t('projects.team.listHeaders.team') }}</span>
              <span>{{ $t('projects.team.listHeaders.area') }}</span>
              <span>{{ $t('projects.team.listHeaders.members') }}</span>
              <span>{{ $t('projects.team.listHeaders.tasks') }}</span>
            </div>
            <div
              v-for="team in filteredTeams"
              :key="team.id"
              class="task-card list-row"
            >
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

        <!-- ── MEMBERS ── -->
        <section v-if="activeTab === 'members'" class="tab-panel">
          <ProjectMembersPanel
            :project-id="projectId"
            @updated="handleProjectMembersUpdated"
          />
        </section>

        <!-- ── PROGRESS ── -->
        <section v-if="activeTab === 'progress'" class="tab-panel">
          <ProgressTab
            :project-id="projectId"
            @updated="handleProjectProgressUpdated"
          />
        </section>

      </template>
    </div>

    <!-- ── Modals ── -->
    <TaskDetailModal
      v-model="showDetailModal"
      :task="detailTask"
      :loading="detailLoading"
    />

    <TaskModal
      v-model="showTaskModal"
      :editing-task="editingTask"
      :members="projectMembers"
      :submitting="taskSubmitting"
      :error="taskError"
      @submit="submitTask"
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppNavbar       from '../components/AppNavbar.vue'
import ProgressBar     from '../components/UI/ProgressBar/ProgressBar.vue'
import ProgressTab     from '../components/DetailProject/ProgressTab.vue'
import ProjectMembersPanel from '../components/projects/ProjectMembersPanel.vue'
import TaskCard        from '../components/projects/TaskCard.vue'
import TaskModal       from '../components/projects/TaskModal.vue'
import TaskDetailModal from '../components/projects/TaskDetailModal.vue'
import TeamModal       from '../components/projects/TeamModal.vue'
import TeamDetailModal from '../components/projects/TeamDetailModal.vue'
import { useAuthStore } from '../stores/auth'
import {
  statusStyle, statusLabel,
  formatDate, formatMoney,
} from '../utils/statusHelpers.js'
import './ProjectDetailsView.css'

const { t } = useI18n()
const route  = useRoute();
const router = useRouter();
const authStore = useAuthStore();

// ── State ─────────────────────────────────────────────────────────────────────

const project = ref(null);
const metrics = ref(null);
const budgetSummary = ref(null);
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

const projectMembers = ref([])

// ── Team (mock until tabla equipos existe en BD) ───────────────────────────────
const mockTeamsNextId = ref(6)
const mockTeams = ref([
  {
    id: 1,
    nombre: "Alpha",
    area: "Desarrollo",
    miembros: [],
    tareasAsignadas: [
      { id: 1, nombre: "Setup CI/CD pipeline", estado: "EN_PROGRESO", prioridad: "ALTA", fecha_vencimiento: "2026-05-01", asignado: "Manolo Flores" },
      { id: 2, nombre: "API integration",      estado: "PENDIENTE",   prioridad: "MEDIA", fecha_vencimiento: "2026-05-15", asignado: null },
      { id: 3, nombre: "Database migration",   estado: "COMPLETADA",  prioridad: "CRITICA", fecha_vencimiento: "2026-04-20", asignado: "Manolo Flores" },
    ],
  },
  {
    id: 2,
    nombre: "Beta",
    area: "Diseño",
    miembros: [],
    tareasAsignadas: [
      { id: 4, nombre: "UI component library", estado: "EN_PROGRESO", prioridad: "MEDIA", fecha_vencimiento: "2026-05-10", asignado: null },
      { id: 5, nombre: "Figma handoff",        estado: "PENDIENTE",   prioridad: "BAJA",  fecha_vencimiento: "2026-05-20", asignado: null },
    ],
  },
  {
    id: 3,
    nombre: "QA",
    area: "Calidad",
    miembros: [],
    tareasAsignadas: [
      { id: 6, nombre: "Write test cases",  estado: "PENDIENTE",   prioridad: "ALTA",  fecha_vencimiento: "2026-05-05", asignado: null },
      { id: 7, nombre: "Regression tests",  estado: "EN_PROGRESO", prioridad: "MEDIA", fecha_vencimiento: "2026-05-12", asignado: null },
    ],
  },
  {
    id: 4,
    nombre: "DevOps",
    area: "Infraestructura",
    miembros: [],
    tareasAsignadas: [
      { id: 8, nombre: "Server provisioning", estado: "COMPLETADA", prioridad: "CRITICA", fecha_vencimiento: "2026-04-15", asignado: null },
      { id: 9, nombre: "Monitoring setup",    estado: "PENDIENTE",  prioridad: "ALTA",    fecha_vencimiento: "2026-05-08", asignado: null },
    ],
  },
  {
    id: 5,
    nombre: "Dirección",
    area: "Gestión",
    miembros: [],
    tareasAsignadas: [
      { id: 10, nombre: "Stakeholder report", estado: "PENDIENTE", prioridad: "MEDIA", fecha_vencimiento: "2026-05-30", asignado: null },
    ],
  },
])

const MOCK_AREAS = ["Desarrollo", "Diseño", "Calidad", "Infraestructura", "Gestión"]
const teamFilterNombre = ref("")
const teamFilterArea   = ref("")
const filteredTeams = computed(() =>
  mockTeams.value.filter((t) => {
    if (teamFilterNombre.value && !t.nombre.toLowerCase().includes(teamFilterNombre.value.toLowerCase())) return false
    if (teamFilterArea.value && t.area !== teamFilterArea.value) return false
    return true
  })
)

const showTeamDetailModal = ref(false)
const detailTeam          = ref(null)
const showTeamModal       = ref(false)
const teamSubmitting      = ref(false)
const teamError           = ref(null)
const editingTeam         = ref(null)

// ── Tabs ─────────────────────────────────────────────────────────────────────
const tabs = computed(() => [
  { id: "overview", label: t('projects.detail.tabs.overview') },
  { id: "tasks",    label: t('projects.detail.tabs.tasks')    },
  { id: "team",     label: t('projects.detail.tabs.team')     },
  { id: "members",  label: t('projects.detail.tabs.members')  },
  { id: "progress", label: t('projects.detail.tabs.progress') },
]);

// ── Helpers ───────────────────────────────────────────────────────────────────

const projectId = computed(() => route.params.id);

function authHeader() {
  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  if (authStore.idEmpresaActual)
    headers["X-Company-ID"] = authStore.idEmpresaActual;
  return headers;
}

function movColor(tipo) {
  return (
    {
      ENTRADA: "var(--k-state-success-text)",
      SALIDA: "var(--k-state-error-text)",
      AJUSTE: "#60a5fa", /* cambiar a token color azul */
      GASTO_ADMIN: "#f97316",
    }[tipo] || "var(--k-gray-4)"
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
  const total = totalBudget.value;
  const spent = spentBudget.value;
  if (!total) return 0;
  return Math.round((spent / total) * 100);
});

// TODO SCRUM-16: #f97316 sin token; --k-color-warning es oscuro, para fondos.
const budgetColor = computed(() => {
  if (budgetPct.value >= 100) return "var(--k-state-error-text)";
  if (budgetPct.value >= 80) return "#f97316";
  return "var(--k-state-success-text)";
});

const budgetRemaining = computed(() => {
  if (budgetSummary.value) {
    return Number(budgetSummary.value.disponible || 0);
  }
  return totalBudget.value - spentBudget.value;
});

const totalBudget = computed(() =>
  Number((budgetSummary.value?.presupuesto_total ?? project.value?.presupuesto_total) || 0)
);

const spentBudget = computed(() =>
  Number((budgetSummary.value?.total_gastado ?? metrics.value?.presupuesto?.total_real) || 0)
);

const progressSummary = computed(() => metrics.value?.progress ?? null);

const progressPercentage = computed(() =>
  Math.round(Number(progressSummary.value?.current_percentage || 0)),
);

const taskCompletionPercentage = computed(() =>
  Math.round(Number(progressSummary.value?.task_completion_percentage || 0)),
);

const progressEntriesTotal = computed(() =>
  Number(progressSummary.value?.entries_total || 0),
);

const progressMilestones = computed(() =>
  Number(progressSummary.value?.milestones_total || 0),
);

const progressBlockers = computed(() =>
  Number(progressSummary.value?.blockers_total || 0),
);

const progressSignalColor = computed(() => {
  if (progressBlockers.value > 0) return "#fb7185";
  if (progressPercentage.value >= 100) return "#c9a962";
  if (progressPercentage.value >= 60) return "#34d399";
  if (progressPercentage.value > 0) return "#60a5fa";
  return "#666";
});

const progressSourceLabel = computed(() =>
  progressSummary.value?.derived_from === "progress_entry"
    ? t('projects.detail.overview.basedOnTimeline')
    : t('projects.detail.overview.basedOnTasks'),
);

const progressLastUpdateLabel = computed(() =>
  progressSummary.value?.last_update_at
    ? t('projects.detail.overview.latestUpdate', { date: formatDate(progressSummary.value.last_update_at) })
    : t('projects.detail.overview.noProgressYet'),
);

const TASK_STATE_META = computed(() => [
  { estado: 'PENDIENTE',   label: t('projects.taskStatuses.pending'),    color: '#60a5fa' }, /* cambiar a token color azul */
  { estado: 'EN_PROGRESO', label: t('projects.taskStatuses.inProgress'), color: 'var(--k-state-success-text)' },
  { estado: 'COMPLETADA',  label: t('projects.taskStatuses.completed'),  color: 'var(--k-color-primary)' },
  { estado: 'CANCELADA',   label: t('projects.taskStatuses.cancelled'),  color: 'var(--k-state-error-text)' },
])

const totalTasks = computed(() =>
  (metrics.value?.tareas || []).reduce((acc, t) => acc + Number(t.count), 0),
);

const taskStateRows = computed(() => {
  const total = totalTasks.value || 1;
  return TASK_STATE_META.value.map((meta) => {
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

async function loadBudgetSummary() {
  const res = await fetch(`/api/budgets/project/${projectId.value}/summary`, {
    headers: authHeader(),
  })
  if (!res.ok) {
    budgetSummary.value = null
    return
  }
  const data = await res.json()
  budgetSummary.value = data.data
}

async function loadTasks() {
  tasksLoading.value = true;
  try {
    const res = await fetch(`/api/projects/${projectId.value}/tasks`, {
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

async function loadAll() {
  loading.value = true;
  error.value = null;
  budgetSummary.value = null;
  try {
    await loadProject()
    await Promise.all([loadMetrics(), loadTasks(), loadMembers(), loadBudgetSummary()])
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
  const res  = await fetch(`/api/projects/${projectId.value}/tasks/${task.id_tarea}`, { headers: authHeader() })
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
      ? `/api/projects/${projectId.value}/tasks/${editingTask.value.id_tarea}`
      : `/api/projects/${projectId.value}/tasks`;
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
      `/api/projects/${projectId.value}/tasks/${task.id_tarea}/close`,
      { method: "PATCH", headers: authHeader() },
    );
    if (res.ok) await Promise.all([loadTasks(), loadMetrics()]);
  } finally {
    closingTaskId.value = null;
  }
}

async function handleProjectMembersUpdated() {
  await Promise.all([loadMembers(), loadMetrics()])
}

// ── Team modal ────────────────────────────────────────────────────────────────

function areaColor(area) {
  /* cambiar a token color azul */
  return ({ Desarrollo: "#60a5fa", Diseño: "#60a5fa", Calidad: "var(--k-state-success-text)", Infraestructura: "#f97316", Gestión: "var(--k-color-primary)" }[area] || "var(--k-gray-3)")
}

function openCreateTeam() {
  editingTeam.value  = null
  teamError.value    = null
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
  if (!formData.nombre.trim()) { teamError.value = "El nombre es requerido."; return }
  if (!formData.area)           { teamError.value = "El área es requerida.";   return }

  const selectedMembers = projectMembers.value.filter((m) => formData.miembros.includes(m.id_usuario))
  if (editingTeam.value) {
    const team = mockTeams.value.find((t) => t.id === editingTeam.value.id)
    team.nombre   = formData.nombre.trim()
    team.area     = formData.area
    team.miembros = selectedMembers
  } else {
    mockTeams.value.push({
      id: mockTeamsNextId.value++,
      nombre: formData.nombre.trim(),
      area: formData.area,
      miembros: selectedMembers,
      tareasAsignadas: [],
    })
  }
  showTeamModal.value = false
}

function deleteTeam(team) {
  mockTeams.value = mockTeams.value.filter((t) => t.id !== team.id)
  if (detailTeam.value?.id === team.id) {
    showTeamDetailModal.value = false
    detailTeam.value          = null
  }
}

async function handleProjectProgressUpdated() {
  await loadMetrics()
}

const TAB_NAMES = ['overview', 'tasks', 'team', 'members', 'progress']

function applyTabFromQuery() {
  const t = route.query.tab
  if (t && TAB_NAMES.includes(t)) activeTab.value = t
}

onMounted(async () => {
  await loadAll()
  applyTabFromQuery()
})

watch(() => route.params.id, loadAll)
watch(() => route.query.tab, applyTabFromQuery)

function goToBudget() {
  router.push({ name: 'budget', query: { project: projectId.value } })
}

function goToReports() {
  router.push({ name: 'reports', query: { project: projectId.value } })
}
</script>
