<template>
  <div class="projects-root">
    <AppNavbar />

    <BaseModal v-model="showModal" title="New project">
      <form class="modal-form" @submit.prevent="submitProject">

        <div class="form-field">
          <label>Name <span class="req">*</span></label>
          <input v-model="form.nombre" type="text" placeholder="Project name" required />
        </div>

        <div class="form-field">
          <label>Description</label>
          <textarea v-model="form.descripcion" placeholder="Optional description" rows="2" />
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>Start date <span class="req">*</span></label>
            <input v-model="form.fecha_inicio" type="date" required />
          </div>
          <div class="form-field">
            <label>End date</label>
            <input v-model="form.fecha_fin_planificada" type="date" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>Budget <span class="req">*</span></label>
            <input v-model.number="form.presupuesto_total" type="number" min="0" step="0.01" placeholder="0.00" required />
          </div>
          <div class="form-field">
            <label>Status</label>
            <select v-model="form.estado">
              <option v-for="e in ESTADOS" :key="e.value" :value="e.value">{{ e.label }}</option>
            </select>
          </div>
        </div>

        <p v-if="modalError" class="modal-error">{{ modalError }}</p>

        <div class="modal-actions">
          <Button label="Cancel" type="button" @click="showModal = false" />
          <Button
            :label="modalLoading ? 'Saving…' : 'Save project'"
            type="submit"
            :disabled="modalLoading"
          />
        </div>
      </form>
    </BaseModal>

    <div class="projects-layout">

      <!-- Auth error -->
      <div v-if="authError" class="state-screen">
        <p class="state-title">Session required</p>
        <p class="state-msg">You must be logged in to view your projects.</p>
      </div>

      <!-- Fetch error -->
      <div v-else-if="fetchError" class="state-screen">
        <p class="state-title">Could not load projects</p>
        <p class="state-msg">{{ fetchError }}</p>
        <button class="btn-primary" style="margin-top:16px" @click="loadData">
          <span>Retry</span>
        </button>
      </div>

      <template v-else>
        <!-- Main panel -->
        <div class="main-panel">

          <!-- Header -->
          <div class="proj-header">
            <div class="proj-header-left">
              <h1 class="proj-title">My Projects</h1>
              <p class="proj-subtitle">Projects you are enrolled in as admin or member</p>
            </div>
            <div class="proj-header-actions">
              <button v-if="authStore.canCreateProjects" class="btn-primary" @click="openModal">
                <svg class="icon16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v10M3 8h10" stroke="#0a0a0a" stroke-width="1.5" stroke-linecap="square"/>
                </svg>
                <span>New project</span>
              </button>
              <button class="icon-btn" title="Settings">
                <svg class="icon18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="2.5" stroke="#666" stroke-width="1.4"/>
                  <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.697 3.697l1.414 1.414M12.889 12.889l1.414 1.414M3.697 14.303l1.414-1.414M12.889 5.111l1.414-1.414" stroke="#666" stroke-width="1.4" stroke-linecap="square"/>
                </svg>
              </button>
              <button class="icon-btn" title="History">
                <svg class="icon18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="7" stroke="#666" stroke-width="1.4"/>
                  <path d="M9 5v4.5l3 1.5" stroke="#666" stroke-width="1.4" stroke-linecap="square"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Tabs -->
          <div class="tabs">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              class="tab"
              :class="{ active: activeTab === tab.key }"
              @click="activeTab = tab.key"
            >
              {{ tab.label }} ({{ tab.count }})
            </button>
          </div>

          <!-- Section label + controls -->
          <div class="section-header">
            <span class="section-title">
              {{ activeTab === 'all' ? 'All Projects' :
                 activeTab === 'active' ? 'Active Projects' :
                 activeTab === 'risk' ? 'At Risk' :
                 activeTab === 'completed' ? 'Completed' : 'Projects' }}
            </span>
            <div class="section-controls">
              <div class="search-wrap">
                <svg class="search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" stroke-width="1.3"/>
                  <path d="M9 9l3.5 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="square"/>
                </svg>
                <input
                  v-model="searchQuery"
                  class="search-input"
                  placeholder="Buscar proyecto…"
                  @keydown.escape="searchQuery = ''"
                />
                <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">×</button>
              </div>
              <div class="view-toggle">
                <button class="vt-btn" :class="{ active: viewMode === 'grid' }" @click="viewMode = 'grid'" title="Vista grid">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="1" width="5" height="5" stroke="currentColor" stroke-width="1.2"/>
                    <rect x="8" y="1" width="5" height="5" stroke="currentColor" stroke-width="1.2"/>
                    <rect x="1" y="8" width="5" height="5" stroke="currentColor" stroke-width="1.2"/>
                    <rect x="8" y="8" width="5" height="5" stroke="currentColor" stroke-width="1.2"/>
                  </svg>
                </button>
                <button class="vt-btn" :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'" title="Vista lista">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M1 3h12M1 7h12M1 11h12" stroke="currentColor" stroke-width="1.3" stroke-linecap="square"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <p class="section-meta">
            <span v-if="loading">Cargando…</span>
            <span v-else>{{ filteredProjects.length }} proyecto{{ filteredProjects.length !== 1 ? 's' : '' }}</span>
          </p>

          <!-- Skeleton -->
          <div v-if="loading" class="project-grid">
            <div v-for="n in 6" :key="n" class="project-card skeleton">
              <div class="skeleton-accent"></div>
              <div class="skeleton-body">
                <div class="skeleton-line short"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line mid"></div>
              </div>
            </div>
          </div>

          <!-- List view -->
          <div v-else-if="viewMode === 'list'" class="project-list">
            <!-- Column headers -->
            <div class="list-header">
              <div class="lh-spacer"></div>
              <div class="lh-col">Proyecto</div>
              <div class="lh-col">Progreso</div>
              <div class="lh-col">Presupuesto</div>
              <div class="lh-col">Vence</div>
              <div class="lh-col lh-center">Acciones</div>
              <div class="lh-col lh-center">Rol</div>
            </div>

            <div
              v-for="project in filteredProjects"
              :key="project.id_proyecto"
              class="list-row"
              @click="router.push(`/projects/${project.id_proyecto}`)"
            >
              <div class="lr-accent" :style="{ backgroundColor: statusColor(project.estado) }"></div>

              <!-- Name + status + desc -->
              <div class="lr-info">
                <p class="lr-name">{{ project.nombre }}</p>
                <div class="lr-meta">
                  <span class="lr-dot" :style="{ backgroundColor: statusColor(project.estado) }"></span>
                  <span class="lr-status-text" :style="{ color: statusColor(project.estado) }">{{ statusLabel(project.estado) }}</span>
                  <span class="lr-meta-sep">·</span>
                  <span class="lr-desc">{{ project.descripcion || 'Sin descripción.' }}</span>
                </div>
              </div>

              <!-- Progress -->
              <div class="lr-progress-col">
                <div class="lr-bar-wrap">
                  <div class="lr-bar-fill" :style="{ width: statusProgress(project.estado) + '%', backgroundColor: statusColor(project.estado) }"></div>
                </div>
                <span class="lr-pct">{{ statusProgress(project.estado) }}%</span>
              </div>

              <!-- Budget -->
              <div class="lr-budget-col">
                <span class="lr-budget-spent">${{ budgetSpent(project) }}</span>
                <span class="lr-budget-sep">/</span>
                <span>${{ budgetTotal(project) }}</span>
              </div>

              <!-- Due date -->
              <div class="lr-due-col">{{ project.fecha_fin_planificada ? formatDate(project.fecha_fin_planificada) : '—' }}</div>

              <!-- Quick actions -->
              <div class="lr-actions" @click.stop>
                <button class="lr-btn" title="Tareas" @click="router.push(`/projects/${project.id_proyecto}?tab=tasks`)">
                  <svg width="14" height="14" viewBox="0 0 13 13" fill="none">
                    <path d="M1.5 3.5h10M1.5 6.5h7M1.5 9.5h5" stroke="currentColor" stroke-width="1.3" stroke-linecap="square"/>
                  </svg>
                </button>
                <button class="lr-btn" title="Equipo" @click="router.push(`/projects/${project.id_proyecto}?tab=team`)">
                  <svg width="14" height="14" viewBox="0 0 13 13" fill="none">
                    <circle cx="4.5" cy="4" r="2" stroke="currentColor" stroke-width="1.2"/>
                    <path d="M1 11.5c0-1.9 1.6-3.5 3.5-3.5S8 9.6 8 11.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="square"/>
                    <path d="M9 5.5c1.1.3 2 1.3 2 2.5M11 11.5c0-1.4-.9-2.6-2.5-3" stroke="currentColor" stroke-width="1.2" stroke-linecap="square"/>
                  </svg>
                </button>
                <button class="lr-btn" title="Presupuesto" @click="openBudget(project)">
                  <svg width="14" height="14" viewBox="0 0 13 13" fill="none">
                    <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.2"/>
                    <path d="M6.5 4v.8M6.5 8.2V9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                    <path d="M5 7.8c0 .7.7 1.2 1.5 1.2S8 8.5 8 7.8C8 6.4 5 6.7 5 5.4 5 4.7 5.7 4.2 6.5 4.2S8 4.7 8 5.4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
                  </svg>
                </button>
                <button class="lr-btn" title="Reportes" @click="router.push({ name: 'reports', query: { project: project.id_proyecto } })">
                  <svg width="14" height="14" viewBox="0 0 13 13" fill="none">
                    <path d="M2 11V7M4.5 11V4.5M7 11V2M9.5 11V6" stroke="currentColor" stroke-width="1.3" stroke-linecap="square"/>
                    <path d="M1 12h11" stroke="currentColor" stroke-width="1.3" stroke-linecap="square"/>
                  </svg>
                </button>
              </div>

              <!-- Role pill -->
              <div class="lr-pill-col" @click.stop>
                <Pill
                  :label="isAdmin(project) ? 'ADMIN' : 'MEMBER'"
                  :btnColor="isAdmin(project) ? 'rgba(201,169,98,0.12)' : 'rgba(96,165,250,0.08)'"
                  :circleColor="isAdmin(project) ? '#c9a962' : '#60a5fa'"
                  :textColor="isAdmin(project) ? '#c9a962' : '#60a5fa'"
                />
              </div>
            </div>
            <div v-if="filteredProjects.length === 0" class="empty-state">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect x="6" y="10" width="28" height="22" rx="2" stroke="#2a2a2a" stroke-width="1.5"/>
                <path d="M6 15h28M13 10V8M27 10V8" stroke="#2a2a2a" stroke-width="1.5" stroke-linecap="square"/>
                <path d="M13 22h14M13 27h8" stroke="#2a2a2a" stroke-width="1.5" stroke-linecap="square"/>
              </svg>
              <p class="empty-title">Sin proyectos aquí</p>
              <p class="empty-sub">{{ searchQuery ? 'Ningún proyecto coincide con la búsqueda.' : 'Cambia el filtro o crea un nuevo proyecto.' }}</p>
              <button v-if="authStore.canCreateProjects && !searchQuery" class="btn-primary empty-cta" @click="openModal">
                <span>+ Nuevo proyecto</span>
              </button>
            </div>
          </div>

          <!-- Grid view -->
          <div v-else class="project-grid">
            <div
              v-for="project in filteredProjects"
              :key="project.id_proyecto"
              class="project-card"
            >
              <!-- Accent bar -->
              <div class="card-accent" :style="{ backgroundColor: statusColor(project.estado) }"></div>

              <!-- Status + Role -->
              <div class="card-status-row">
                <div class="card-status-left">
                  <span class="card-status-dot" :style="{ backgroundColor: statusColor(project.estado) }"></span>
                  <span class="card-status-text" :style="{ color: statusColor(project.estado) }">{{ statusLabel(project.estado) }}</span>
                </div>
                <Pill
                  :label="isAdmin(project) ? 'ADMIN' : 'MEMBER'"
                  :btnColor="isAdmin(project) ? 'rgba(201,169,98,0.12)' : 'rgba(96,165,250,0.08)'"
                  :circleColor="isAdmin(project) ? '#c9a962' : '#60a5fa'"
                  :textColor="isAdmin(project) ? '#c9a962' : '#60a5fa'"
                />
              </div>

              <!-- Name + Description (clickable → project detail) -->
              <div class="card-main" @click="router.push(`/projects/${project.id_proyecto}`)">
                <p class="card-name">{{ project.nombre }}</p>
                <p class="card-desc">{{ project.descripcion || 'Sin descripción.' }}</p>
              </div>

              <!-- Progress + Budget + Footer -->
              <div class="card-body">
                <div class="progress-wrap">
                  <div class="progress-bg" style="flex:1">
                    <div class="progress-fill" :style="{ width: statusProgress(project.estado) + '%', backgroundColor: statusColor(project.estado) }"></div>
                  </div>
                  <span class="progress-val">{{ statusProgress(project.estado) }}%</span>
                </div>

                <div class="budget-line">
                  <div class="budget-labels">
                    <span>Budget</span>
                    <span class="budget-val">${{ budgetSpent(project) }} / ${{ budgetTotal(project) }}</span>
                  </div>
                  <div class="progress-bg">
                    <div class="progress-fill" :style="{ width: budgetPct(project) + '%', backgroundColor: budgetColor(project) }"></div>
                  </div>
                  <div class="budget-meta">
                    <span :style="{ color: budgetColor(project) }">{{ budgetPct(project) }}% used</span>
                    <span v-if="budgetByProj[project.id_proyecto]?.alerta_nivel"
                          class="alert-pill"
                          :class="isCriticalBudgetLevel(budgetByProj[project.id_proyecto].alerta_nivel) ? 'critical' : 'warn'">
                      {{ isCriticalBudgetLevel(budgetByProj[project.id_proyecto].alerta_nivel) ? 'OVERRUN' : 'WARNING' }}
                    </span>
                  </div>
                </div>

                <div class="card-footer-row">
                  <template v-if="canEditStatus(project)">
                    <div class="status-select-wrap" :style="{ '--status-color': statusColor(project.estado) }">
                      <span class="status-dot-mark" :style="{ backgroundColor: statusColor(project.estado) }"></span>
                      <select
                        class="status-select"
                        :value="project.estado"
                        :disabled="statusUpdating[project.id_proyecto]"
                        @change="updateProjectStatus(project, $event.target.value)"
                      >
                        <option v-for="e in ESTADOS" :key="e.value" :value="e.value">{{ e.label }}</option>
                      </select>
                    </div>
                  </template>
                  <Pill
                    v-else
                    :label="statusLabel(project.estado)"
                    :btnColor="statusColor(project.estado) + '18'"
                    :circleColor="statusColor(project.estado)"
                    :textColor="statusColor(project.estado)"
                  />
                  <span class="due-date">
                    {{ project.fecha_fin_planificada ? 'Due ' + formatDate(project.fecha_fin_planificada) : 'No due date' }}
                  </span>
                </div>
                <p v-if="statusError[project.id_proyecto]" class="status-error">
                  {{ statusError[project.id_proyecto] }}
                </p>
              </div>

              <!-- Quick access row -->
              <div class="card-quick-row">
                <button class="quick-btn" @click="router.push(`/projects/${project.id_proyecto}?tab=tasks`)">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M1.5 3.5h10M1.5 6.5h7M1.5 9.5h5" stroke="currentColor" stroke-width="1.3" stroke-linecap="square"/>
                  </svg>
                  <span>Tareas</span>
                </button>
                <button class="quick-btn" @click="router.push(`/projects/${project.id_proyecto}?tab=team`)">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <circle cx="4.5" cy="4" r="2" stroke="currentColor" stroke-width="1.2"/>
                    <path d="M1 11.5c0-1.9 1.6-3.5 3.5-3.5S8 9.6 8 11.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="square"/>
                    <path d="M9 5.5c1.1.3 2 1.3 2 2.5M11 11.5c0-1.4-.9-2.6-2.5-3" stroke="currentColor" stroke-width="1.2" stroke-linecap="square"/>
                  </svg>
                  <span>Equipo</span>
                </button>
                <button class="quick-btn" @click="openBudget(project)">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.2"/>
                    <path d="M6.5 4v.8M6.5 8.2V9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                    <path d="M5 7.8c0 .7.7 1.2 1.5 1.2S8 8.5 8 7.8C8 6.4 5 6.7 5 5.4 5 4.7 5.7 4.2 6.5 4.2S8 4.7 8 5.4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
                  </svg>
                  <span>Presupuesto</span>
                </button>
                <button class="quick-btn" @click="router.push({ name: 'reports', query: { project: project.id_proyecto } })">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M2 11V7M4.5 11V4.5M7 11V2M9.5 11V6" stroke="currentColor" stroke-width="1.3" stroke-linecap="square"/>
                    <path d="M1 12h11" stroke="currentColor" stroke-width="1.3" stroke-linecap="square"/>
                  </svg>
                  <span>Reportes</span>
                </button>
              </div>
            </div>

            <!-- Empty state -->
            <div v-if="filteredProjects.length === 0" class="empty-state">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect x="6" y="10" width="28" height="22" rx="2" stroke="#2a2a2a" stroke-width="1.5"/>
                <path d="M6 15h28M13 10V8M27 10V8" stroke="#2a2a2a" stroke-width="1.5" stroke-linecap="square"/>
                <path d="M13 22h14M13 27h8" stroke="#2a2a2a" stroke-width="1.5" stroke-linecap="square"/>
              </svg>
              <p class="empty-title">Sin proyectos aquí</p>
              <p class="empty-sub">{{ searchQuery ? 'Ningún proyecto coincide con la búsqueda.' : 'Cambia el filtro o crea un nuevo proyecto.' }}</p>
              <button v-if="authStore.canCreateProjects && !searchQuery" class="btn-primary empty-cta" @click="openModal">
                <span>+ Nuevo proyecto</span>
              </button>
            </div>
          </div>

        </div>

        <!-- Context panel -->
        <aside class="context-panel">
          <div class="ctx-title">Overview</div>
          <div class="ctx-subtitle">Your project summary</div>

          <div>
            <p class="ctx-label">AT A GLANCE</p>
            <div class="summary-grid">
              <div class="summary-card">
                <span class="s-value">{{ projects.length }}</span>
                <span class="s-label">Total projects</span>
                <span class="s-sub">{{ asAdminCount }} as admin</span>
              </div>
              <div class="summary-card">
                <span class="s-value" style="color:#fb7185">{{ atRiskCount }}</span>
                <span class="s-label">At risk</span>
                <span class="s-sub red">Needs attention</span>
              </div>
              <div class="summary-card">
                <span class="s-value">{{ completedCount }}</span>
                <span class="s-label">Completed</span>
                <span class="s-sub">This quarter</span>
              </div>
              <div class="summary-card">
                <span class="s-value">{{ pausedCount }}</span>
                <span class="s-label">Paused</span>
                <span class="s-sub gold">Awaiting budget</span>
              </div>
            </div>
          </div>

          <div>
            <p class="ctx-label">QUICK ACTIONS</p>
            <Button v-if="authStore.canCreateProjects" label="+ Create new project" @click="openModal" />
            <Button label="↓ Export summary" />
          </div>

          <div class="data-source">
            <div class="ds-label">DATA SOURCE</div>
            <div class="ds-text">Projects database · Last sync: {{ lastSync }}</div>
          </div>
        </aside>
      </template>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppNavbar from '../components/AppNavbar.vue'
import BaseModal from '../components/UI/Modal/BaseModal.vue'
import Pill      from '../components/UI/Pill/Pill.vue'
import Button    from '../components/UI/Button/Button.vue'
import { statusLabel, formatDate } from '../utils/statusHelpers.js'

const router = useRouter()

const authStore    = useAuthStore()
const projects     = ref([])
const searchQuery  = ref('')
const viewMode     = ref(localStorage.getItem('projects-view-mode') || 'grid')
watch(viewMode, (v) => localStorage.setItem('projects-view-mode', v))
const budgetByProj = ref({}) // id_proyecto -> summary
const loading      = ref(true)
const authError  = ref(false)
const fetchError = ref(null)
const activeTab  = ref('all')
const lastSync   = ref('—')

const ESTADOS = [
  { value: 'PLANIFICADO', label: 'Planned'    },
  { value: 'EN_PROGRESO', label: 'In Progress'},
  { value: 'PAUSADO',     label: 'Paused'     },
  { value: 'COMPLETADO',  label: 'Completed'  },
  { value: 'CANCELADO',   label: 'Cancelled'  },
]

const STATUS_COLOR = {
  PLANIFICADO: '#60a5fa',
  EN_PROGRESO: '#34d399',
  PAUSADO:     '#f97316',
  COMPLETADO:  '#c9a962',
  CANCELADO:   '#fb7185',
}
const STATUS_PROGRESS = {
  PLANIFICADO: 10,
  EN_PROGRESO: 60,
  PAUSADO:     35,
  COMPLETADO:  100,
  CANCELADO:   5,
}

const statusColor    = (e) => STATUS_COLOR[e]    || '#666'
const statusProgress = (e) => STATUS_PROGRESS[e] ?? 0
const isAdmin        = (p) => p.id_encargado === authStore.idUsuario

function isCriticalBudgetLevel(level) {
  return ['CRITICO', 'EXCEDIDO'].includes(level)
}

function isWarningBudgetLevel(level) {
  return ['PRECAUCION', 'ADVERTENCIA'].includes(level)
}

// ── Budget helpers ────────────────────────────────────────────────────────────
const money = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const budgetTotal  = (p) => money(budgetByProj.value[p.id_proyecto]?.presupuesto_total ?? p.presupuesto_total)
const budgetSpent  = (p) => money(budgetByProj.value[p.id_proyecto]?.total_gastado ?? 0)
const budgetPct    = (p) => budgetByProj.value[p.id_proyecto]?.porcentaje_completado ?? 0
const budgetColor  = (p) => {
  const lvl = budgetByProj.value[p.id_proyecto]?.alerta_nivel
  if (isCriticalBudgetLevel(lvl)) return '#fb7185'
  if (isWarningBudgetLevel(lvl)) return '#f97316'
  return '#c9a962'
}
function openBudget(p) {
  router.push({ name: 'budget', query: { project: p.id_proyecto } })
}
// ── API ───────────────────────────────────────────────────────────────────────

function authHeader() {
  const token   = localStorage.getItem('token')
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  if (authStore.idEmpresaActual) headers['X-Company-ID'] = authStore.idEmpresaActual
  return headers
}

async function apiFetch(path, options = {}) {
  const res = await fetch(path, { headers: { ...authHeader(), ...options.headers }, ...options })
  if (res.status === 401) throw Object.assign(new Error('unauthenticated'), { status: 401 })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function loadData() {
  loading.value    = true
  authError.value  = false
  fetchError.value = null
  try {
    if (!authStore.user) await authStore.fetchMe()

    const params = new URLSearchParams({ limit: 100 })
    const res = await apiFetch(`/api/projects?${params}`)
    projects.value = res.data
    lastSync.value = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

    // Load budget summaries in parallel (best-effort)
    const summaries = await Promise.allSettled(
      projects.value.map(p =>
        apiFetch(`/api/budgets/project/${p.id_proyecto}/summary`).then(r => [p.id_proyecto, r.data])
      )
    )
    const map = {}
    for (const s of summaries) {
      if (s.status === 'fulfilled') { map[s.value[0]] = s.value[1] }
    }
    budgetByProj.value = map
  } catch (err) {
    if (err.status === 401) authError.value = true
    else fetchError.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
watch(() => authStore.idEmpresaActual, loadData)

// ── Computed counts ───────────────────────────────────────────────────────────

const asAdminCount   = computed(() => projects.value.filter(p => isAdmin(p)).length)
const atRiskCount    = computed(() => projects.value.filter(p => ['PAUSADO', 'CANCELADO'].includes(p.estado)).length)
const completedCount = computed(() => projects.value.filter(p => p.estado === 'COMPLETADO').length)
const pausedCount    = computed(() => projects.value.filter(p => p.estado === 'PAUSADO').length)

const tabs = computed(() => [
  { key: 'all',       label: 'All',       count: projects.value.length },
  { key: 'active',    label: 'Active',    count: projects.value.filter(p => p.estado === 'EN_PROGRESO').length },
  { key: 'risk',      label: 'At Risk',   count: atRiskCount.value },
  { key: 'completed', label: 'Completed', count: completedCount.value },
])

const filteredProjects = computed(() => {
  let list = projects.value
  if (activeTab.value === 'active')         list = list.filter(p => p.estado === 'EN_PROGRESO')
  else if (activeTab.value === 'risk')      list = list.filter(p => ['PAUSADO', 'CANCELADO'].includes(p.estado))
  else if (activeTab.value === 'completed') list = list.filter(p => p.estado === 'COMPLETADO')
  const q = searchQuery.value.trim().toLowerCase()
  if (q) list = list.filter(p => p.nombre.toLowerCase().includes(q))
  return list
})

// ── Modal ─────────────────────────────────────────────────────────────────────

const showModal    = ref(false)
const modalLoading = ref(false)
const modalError   = ref(null)

const emptyForm = () => ({
  nombre:               '',
  descripcion:          '',
  fecha_inicio:         new Date().toISOString().split('T')[0],
  fecha_fin_planificada:'',
  presupuesto_total:    null,
  estado:               'PLANIFICADO',
})

const form = ref(emptyForm())

function openModal() {
  if (!authStore.canCreateProjects) return
  form.value       = emptyForm()
  modalError.value = null
  showModal.value  = true
}

const statusUpdating = ref({}) // id_proyecto -> bool
const statusError    = ref({}) // id_proyecto -> message

function canEditStatus(p) {
  if (isAdmin(p)) return true
  const role = authStore.empresaActual?.rol
  return ['owner', 'admin', 'manager'].includes(role)
}

async function updateProjectStatus(project, newEstado) {
  if (!newEstado || newEstado === project.estado) return
  statusUpdating.value = { ...statusUpdating.value, [project.id_proyecto]: true }
  statusError.value = { ...statusError.value, [project.id_proyecto]: null }
  const previous = project.estado
  project.estado = newEstado // optimistic
  try {
    const res = await fetch(`/api/projects/${project.id_proyecto}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ estado: newEstado }),
    })
    const data = await res.json()
    if (!res.ok) {
      project.estado = previous
      statusError.value = { ...statusError.value, [project.id_proyecto]: data.message || `Error ${res.status}` }
    }
  } catch {
    project.estado = previous
    statusError.value = { ...statusError.value, [project.id_proyecto]: 'Network error' }
  } finally {
    statusUpdating.value = { ...statusUpdating.value, [project.id_proyecto]: false }
  }
}
async function submitProject() {
  modalLoading.value = true
  modalError.value   = null
  try {
    const body = {
      nombre:            form.value.nombre,
      descripcion:       form.value.descripcion || undefined,
      fecha_inicio:      form.value.fecha_inicio,
      presupuesto_total: form.value.presupuesto_total,
      estado:            form.value.estado,
    }
    if (form.value.fecha_fin_planificada) {
      body.fecha_fin_planificada = form.value.fecha_fin_planificada
    }

    const res = await fetch('/api/projects', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body:    JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) {
      modalError.value = data.message || `Error ${res.status}`
      return
    }
    showModal.value = false
    await loadData()
  } catch {
    modalError.value = 'Network error, try again.'
  } finally {
    modalLoading.value = false
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Manrope:wght@400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.projects-root { background: transparent; min-height: 100vh; }

.projects-layout {
  font-family: 'Manrope', sans-serif; color: #faf8f5;
  min-height: calc(100vh - 56px); margin-top: 56px;
  display: flex; overflow-x: hidden;
}

.state-screen {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 8px;
  background: rgba(10,10,10,0.82);
}
.state-title { font-family: 'Playfair Display', serif; font-size: 24px; color: #faf8f5; }
.state-msg   { font-size: 14px; color: #888; }

.main-panel {
  flex: 1; display: flex; flex-direction: column; gap: 32px;
  padding: 48px 56px; background: rgba(10,10,10,0.82);
}

.proj-header        { display: flex; align-items: flex-start; justify-content: space-between; }
.proj-header-left   { display: flex; flex-direction: column; gap: 4px; }
.proj-title         { font-family: 'Playfair Display', serif; font-size: 48px; font-weight: 400; color: #faf8f5; line-height: 1.1; }
.proj-subtitle      { font-size: 14px; color: #888; }
.proj-header-actions{ display: flex; gap: 12px; align-items: center; margin-top: 8px; }

.btn-primary {
  display: flex; align-items: center; gap: 8px;
  background: #c9a962; padding: 10px 18px; cursor: pointer; border: none;
}
.btn-primary span { font-size: 12px; color: #0a0a0a; white-space: nowrap; font-family: 'Manrope', sans-serif; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.icon-btn {
  width: 40px; height: 40px; border: 1px solid #1f1f1f; background: transparent;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.icon16 { width: 16px; height: 16px; flex-shrink: 0; }
.icon18 { width: 18px; height: 18px; flex-shrink: 0; }

.tabs { display: flex; gap: 32px; border-bottom: 1px solid #1f1f1f; }
.tab {
  background: none; border: none; cursor: pointer;
  font-family: 'Manrope', sans-serif; font-size: 15px; color: #777;
  padding-bottom: 12px; border-bottom: 2px solid transparent; transition: color 0.15s;
}
.tab.active { color: #c9a962; border-bottom-color: #c9a962; }
.tab:hover:not(.active) { color: #aaa; }

.section-header  { display: flex; justify-content: space-between; align-items: center; }
.section-title   { font-family: 'Playfair Display', serif; font-size: 20px; color: #faf8f5; }
.section-meta    { font-size: 12px; color: #555; margin-top: -20px; }
.section-controls { display: flex; align-items: center; gap: 10px; }

/* Search */
.search-wrap {
  display: flex; align-items: center; gap: 8px;
  border: 1px solid #1f1f1f; background: #0a0a0a;
  padding: 6px 12px; transition: border-color 0.15s;
}
.search-wrap:focus-within { border-color: rgba(201,169,98,0.4); }
.search-icon { color: #444; flex-shrink: 0; }
.search-input {
  background: transparent; border: none; outline: none;
  color: #faf8f5; font-family: 'Manrope', sans-serif; font-size: 13px; width: 180px;
}
.search-input::placeholder { color: #444; }
.search-clear {
  background: none; border: none; color: #555; cursor: pointer;
  font-size: 16px; padding: 0; line-height: 1; transition: color 0.15s;
}
.search-clear:hover { color: #888; }

/* View toggle */
.view-toggle { display: flex; border: 1px solid #1f1f1f; }
.vt-btn {
  width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
  background: transparent; border: none; color: #444; cursor: pointer;
  transition: color 0.15s, background 0.15s;
}
.vt-btn.active { color: #c9a962; background: rgba(201,169,98,0.08); }
.vt-btn:hover:not(.active) { color: #888; }

.project-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
}

/* List view */
.project-list { display: flex; flex-direction: column; gap: 1px; background: #1a1a1a; }

.list-header {
  display: grid;
  grid-template-columns: 3px 1fr 150px 190px 100px 140px 80px;
  background: #0a0a0a;
  border-bottom: 1px solid #1f1f1f;
  position: sticky; top: 56px; z-index: 1;
}
.lh-spacer { }
.lh-col {
  padding: 8px 16px;
  font-size: 14px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #555;
  font-family: 'Manrope', sans-serif;
}
.lh-col:first-of-type { padding-left: 20px; }
.lh-center { text-align: center; }

.list-row {
  display: grid;
  grid-template-columns: 3px 1fr 150px 190px 100px 140px 80px;
  align-items: center;
  background: #0f0f0f;
  cursor: pointer;
  min-height: 64px;
  transition: background 0.15s;
}
.list-row:hover { background: #141414; }

.lr-accent { height: 100%; }

.lr-info { padding: 12px 20px; min-width: 0; }
.lr-name {
  font-family: 'Playfair Display', serif; font-size: 17px; color: #faf8f5;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  transition: color 0.15s; margin-bottom: 4px;
}
.list-row:hover .lr-name { color: #c9a962; }
.lr-meta { display: flex; align-items: center; gap: 6px; min-width: 0; }
.lr-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.lr-status-text { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; flex-shrink: 0; }
.lr-meta-sep { color: #2a2a2a; font-size: 12px; flex-shrink: 0; }
.lr-desc { font-size: 11px; color: #555; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.lr-progress-col {
  display: flex; align-items: center; gap: 8px;
  padding: 0 16px; border-left: 1px solid #1a1a1a;
}
.lr-bar-wrap {
  flex: 1; height: 3px; background: #1f1f1f; border-radius: 2px; overflow: hidden;
}
.lr-bar-fill { height: 100%; transition: width 0.4s; }
.lr-pct { font-size: 11px; color: #666; width: 26px; text-align: right; flex-shrink: 0; }

.lr-budget-col {
  display: flex; align-items: center; gap: 4px;
  padding: 0 16px; border-left: 1px solid #1a1a1a;
  font-size: 12px; color: #555; white-space: nowrap; overflow: hidden;
}
.lr-budget-spent { color: #888; }
.lr-budget-sep { color: #2a2a2a; }

.lr-due-col {
  padding: 0 16px; border-left: 1px solid #1a1a1a;
  font-size: 12px; color: #555; white-space: nowrap;
}

.lr-actions {
  display: flex; align-items: center; justify-content: center; gap: 2px;
  padding: 0 8px; border-left: 1px solid #1a1a1a;
}
.lr-btn {
  width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
  background: transparent; border: none; color: #555; cursor: pointer;
  transition: color 0.15s, background 0.15s; border-radius: 2px;
}
.lr-btn:hover { color: #c9a962; background: rgba(201,169,98,0.08); }

.lr-pill-col {
  display: flex; align-items: center; justify-content: center;
  padding: 0 16px; border-left: 1px solid #1a1a1a;
}
.lr-pill-col :deep(.pill) { height: 20px; padding: 0 10px; border-radius: 3px; border: 1px solid currentColor; }
.lr-pill-col :deep(.pill-text) { font-size: 10px; letter-spacing: 0.06em; font-family: 'Manrope', sans-serif; }
.lr-pill-col :deep(.dot) { display: none; }

.project-card {
  background: #0f0f0f; border: 1px solid #1f1f1f;
  display: flex; flex-direction: column; transition: border-color 0.2s;
}
.project-card:hover { border-color: #333; }

.card-accent { height: 3px; flex-shrink: 0; }

/* Status + role row */
.card-status-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 18px 20px 0;
}
.card-status-left  { display: flex; align-items: center; gap: 6px; }
.card-status-dot   { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.card-status-text  { font-size: 13px; letter-spacing: 0.05em; text-transform: uppercase; }

/* Name + description (clickable) */
.card-main {
  padding: 14px 20px 6px;
  cursor: pointer;
}
.card-name {
  font-family: 'Playfair Display', serif; font-size: 26px; font-weight: 400; color: #faf8f5;
  line-height: 1.2; margin-bottom: 8px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.card-main:hover .card-name { color: #c9a962; }

.card-body { padding: 10px 20px 16px; display: flex; flex-direction: column; gap: 14px; }
.card-desc { font-size: 15px; color: #666; line-height: 1.55;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.progress-wrap { display: flex; align-items: center; gap: 10px; }
.progress-bg   { width: 100%; height: 4px; background: #1f1f1f; border-radius: 2px; overflow: hidden; }
.progress-fill { height: 100%; transition: width 0.4s; }
.progress-val  { font-size: 14px; color: #666; width: 36px; text-align: right; }

/* Budget line on project card */
.budget-line { display: flex; flex-direction: column; gap: 4px; }
.budget-labels { display: flex; justify-content: space-between; font-size: 14px; color: #888; }
.budget-val { color: #faf8f5; font-variant-numeric: tabular-nums; }
.budget-meta { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #555; }
.alert-pill {
  font-size: 12px; padding: 2px 8px; letter-spacing: 0.05em; border-radius: 2px;
  border: 1px solid currentColor;
}
.alert-pill.warn     { color: #f97316; background: rgba(249,115,22,0.08); }
.alert-pill.critical { color: #fb7185; background: rgba(251,113,133,0.08); }

/* Quick access row */
.card-quick-row {
  display: flex;
  border-top: 1px solid rgba(201,169,98,0.15);
  background: rgba(201,169,98,0.04);
  margin-top: auto;
}
.quick-btn {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; gap: 5px;
  padding: 13px 4px;
  background: none; border: none; border-right: 1px solid rgba(201,169,98,0.1);
  color: #999; font-size: 14px; font-family: 'Manrope', sans-serif;
  cursor: pointer; transition: color 0.2s, background 0.2s;
}
.quick-btn:last-child { border-right: none; }
.quick-btn:hover { color: #c9a962; background: rgba(201,169,98,0.1); }

.card-footer-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.due-date { font-size: 14px; color: #555; }

.status-select-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border: 1px solid var(--status-color, #555);
  background: color-mix(in srgb, var(--status-color, #555) 9%, transparent);
  border-radius: 3px;
}
.status-dot-mark {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-select {
  background: transparent;
  border: none;
  color: var(--status-color, #faf8f5);
  font-family: 'Manrope', sans-serif;
  font-size: 15px;
  letter-spacing: 0.03em;
  padding: 0;
  padding-right: 18px;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='6' viewBox='0 0 8 6'><path d='M1 1l3 3 3-3' stroke='%23888' stroke-width='1.2' fill='none' stroke-linecap='square'/></svg>");
  background-repeat: no-repeat;
  background-position: right 0 center;
  background-size: 9px 7px;
}
.status-select:disabled { opacity: 0.6; cursor: wait; }
.status-select option { background: #0f0f0f; color: #faf8f5; }

.status-error {
  margin-top: 6px;
  font-size: 11px;
  color: #fecdd3;
  font-family: 'Manrope', sans-serif;
}

.card-open {
  border-top: 1px solid #1a1a1a;
  padding: 10px 16px;
}
.open-link { font-size: 12px; color: #555; cursor: pointer; transition: color 0.15s; }
.project-card:hover .open-link { color: #c9a962; }

.card-status-row :deep(.pill) { height: 20px; padding: 0 10px; border-radius: 3px; border: 1px solid currentColor; }
.card-status-row :deep(.pill-text) { font-size: 10px; letter-spacing: 0.06em; font-family: 'Manrope', sans-serif; }
.card-status-row :deep(.dot) { display: none; }

.card-footer-row :deep(.pill) { height: 20px; padding: 0 8px; border-radius: 3px; border: 1px solid currentColor; }
.card-footer-row :deep(.pill-text) { font-size: 10px; font-family: 'Manrope', sans-serif; }
.card-footer-row :deep(.dot) { width: 6px; height: 6px; margin-right: 6px; }

.modal-actions :deep(.btn) { border-radius: 0; font-family: 'Manrope', sans-serif; font-size: 12px; font-weight: 600; padding: 10px 20px; }
.modal-actions :deep(.btn:first-child) { background: transparent; border: 1px solid #1f1f1f; color: #faf8f5; }
.modal-actions :deep(.btn:last-child)  { background: #c9a962; color: #0a0a0a; }
.modal-actions :deep(.btn:last-child:disabled) { opacity: 0.6; }

.context-panel :deep(.btn) {
  width: 100%; border-radius: 0; font-family: 'Manrope', sans-serif;
  font-size: 12px; font-weight: 600; padding: 12px 16px;
  display: block; margin-bottom: 8px; text-align: left;
}
.context-panel :deep(.btn:first-of-type) { background: #c9a962; color: #0a0a0a; }
.context-panel :deep(.btn:last-of-type)  { background: transparent; border: 1px solid #1f1f1f; color: #faf8f5; }

.project-card.skeleton { pointer-events: none; }
.skeleton-accent { height: 3px; background: #1f1f1f; }
.skeleton-body   { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.skeleton-line   { height: 10px; background: #1a1a1a; border-radius: 2px; animation: pulse 1.4s ease-in-out infinite; }
.skeleton-line.short { width: 50%; }
.skeleton-line.mid   { width: 70%; }
@keyframes pulse { 0%,100% { opacity:0.4 } 50% { opacity:0.8 } }

.empty-state {
  grid-column: 1/-1; display: flex; flex-direction: column;
  align-items: center; gap: 12px; padding: 72px 0; text-align: center;
}
.empty-title { font-family: 'Playfair Display', serif; font-size: 20px; color: #444; }
.empty-sub   { font-size: 13px; color: #333; }
.empty-cta   { margin-top: 4px; }

.context-panel {
  width: 320px; flex: none;
  background: rgba(10,10,10,0.9); border-left: 1px solid #1a1a1a;
  padding: 48px 28px; display: flex; flex-direction: column; gap: 32px;
  position: sticky; top: 0; max-height: 100vh; overflow-y: auto;
}

.ctx-title    { font-family: 'Playfair Display', serif; font-size: 28px; color: #faf8f5; }
.ctx-subtitle { font-size: 13px; color: #555; margin-top: 4px; }
.ctx-label    { font-size: 10px; letter-spacing: 0.1em; color: #444; margin-bottom: 12px; }

.summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.summary-card {
  background: #0f0f0f; border: 1px solid #1a1a1a;
  padding: 14px; display: flex; flex-direction: column; gap: 4px;
}
.s-value { font-size: 28px; font-weight: 700; color: #faf8f5; line-height: 1; }
.s-label { font-size: 11px; color: #555; }
.s-sub   { font-size: 10px; color: #444; }
.s-sub.gold { color: #c9a962; }
.s-sub.red  { color: #fb7185; }

.data-source { margin-top: auto; }
.ds-label { font-size: 10px; letter-spacing: 0.1em; color: #333; margin-bottom: 4px; }
.ds-text  { font-size: 11px; color: #444; }

/* Modal form styles */
.modal-form  { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.form-field  { display: flex; flex-direction: column; gap: 6px; }
.form-field label { font-size: 11px; color: #888; letter-spacing: 0.05em; }
.form-field input,
.form-field textarea,
.form-field select {
  background: #0a0a0a; border: 1px solid #1f1f1f;
  color: #faf8f5; font-family: 'Manrope', sans-serif; font-size: 13px;
  padding: 10px 12px; outline: none; resize: none; transition: border-color 0.15s;
}
.form-field input:focus,
.form-field textarea:focus,
.form-field select:focus { border-color: #c9a962; }
.form-field select option { background: #0f0f0f; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.req { color: #c9a962; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
.modal-error   { font-size: 12px; color: #fb7185; }

@media (max-width: 1200px) {
  .main-panel { padding: 40px 40px; }
  .context-panel { width: 280px; padding: 40px 20px; }
  .project-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 900px) {
  .projects-layout { flex-direction: column; }
  .main-panel { padding: 32px 28px; gap: 24px; }
  .proj-title { font-size: 36px; }
  .context-panel {
    width: 100%; max-height: none; position: static;
    border-left: none; border-top: 1px solid #1a1a1a;
    padding: 32px 28px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
  }
  .ctx-title { grid-column: 1 / -1; }
  .data-source { grid-column: 1 / -1; margin-top: 0; }
  .summary-grid { grid-template-columns: repeat(4, 1fr); }
}

@media (max-width: 640px) {
  .main-panel { padding: 24px 16px; gap: 20px; }
  .proj-title { font-size: 28px; }
  .proj-header { flex-direction: column; gap: 16px; }
  .proj-header-actions { align-self: flex-start; }
  .tabs { gap: 16px; overflow-x: auto; }
  .context-panel { grid-template-columns: 1fr; padding: 24px 16px; }
  .summary-grid { grid-template-columns: 1fr 1fr; }
  .project-grid { grid-template-columns: 1fr; }

}
</style>
