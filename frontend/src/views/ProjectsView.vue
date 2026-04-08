<template>
  <div class="projects-root">
    <AppNavbar />

    <!-- Modal: nuevo proyecto -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-title">New project</span>
            <button class="modal-close" @click="closeModal">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3L3 13" stroke="#666" stroke-width="1.4" stroke-linecap="square"/>
              </svg>
            </button>
          </div>

          <form class="modal-form" @submit.prevent="submitProject">

            <!-- Onboarding: user has no empresa yet -->
            <div v-if="!authStore.idEmpresa" class="onboarding-notice">
              <p class="notice-title">Set up your company first</p>
              <p class="notice-sub">Your account has no company assigned. Enter your company name to get started.</p>
              <div class="form-field" style="margin-top:12px">
                <label>Company name <span class="req">*</span></label>
                <input v-model="form.nombre_empresa" type="text" placeholder="e.g. Acme Corp" :required="!authStore.idEmpresa" />
              </div>
            </div>

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
              <Button label="Cancel" type="button" @click="closeModal" />
              <Button
                :label="modalLoading ? 'Saving…' : 'Save project'"
                type="submit"
                :disabled="modalLoading"
              />
            </div>
          </form>
        </div>
      </div>
    </Teleport>

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
              <button class="btn-primary" @click="openModal">
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

          <!-- Section label -->
          <div class="section-header">
            <span class="section-title">
              {{ activeTab === 'all' ? 'All Projects' :
                 activeTab === 'active' ? 'Active Projects' :
                 activeTab === 'risk' ? 'At Risk' :
                 activeTab === 'completed' ? 'Completed' : 'Projects' }}
            </span>
            <span v-if="loading" class="section-meta">Loading…</span>
            <span v-else class="section-meta">
              {{ filteredProjects.length }} projects · Click any project to view details
            </span>
          </div>

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

          <!-- Grid -->
          <div v-else class="project-grid">
            <div
              v-for="project in filteredProjects"
              :key="project.id_proyecto"
              class="project-card"
            >
              <div class="card-accent" :style="{ backgroundColor: statusColor(project.estado) }"></div>
              <div class="card-header">
                <span class="card-name">{{ project.nombre }}</span>
                <Pill
                  :label="isAdmin(project) ? 'ADMIN' : 'MEMBER'"
                  :btnColor="isAdmin(project) ? 'rgba(201,169,98,0.12)' : 'rgba(96,165,250,0.08)'"
                  :circleColor="isAdmin(project) ? '#c9a962' : '#60a5fa'"
                  :textColor="isAdmin(project) ? '#c9a962' : '#60a5fa'"
                />
              </div>
              <div class="card-body">
                <p class="card-desc">{{ project.descripcion || 'No description.' }}</p>
                <div class="progress-wrap">
                  <div class="progress-bg">
                    <div
                      class="progress-fill"
                      :style="{ width: statusProgress(project.estado) + '%', backgroundColor: statusColor(project.estado) }"
                    ></div>
                  </div>
                  <span class="progress-val">{{ statusProgress(project.estado) }}%</span>
                </div>
                <div class="card-footer-row">
                  <Pill
                    :label="statusLabel(project.estado)"
                    :btnColor="statusColor(project.estado) + '18'"
                    :circleColor="statusColor(project.estado)"
                    :textColor="statusColor(project.estado)"
                  />
                  <span class="due-date">
                    {{ project.fecha_fin_planificada ? 'Due ' + formatDate(project.fecha_fin_planificada) : 'No due date' }}
                  </span>
                </div>
              </div>
              <div class="card-open">
                <Anchor
                  label="→ Open project"
                  link="#"
                  textColor="#555"
                  backColor="transparent"
                  hoverColor="rgba(201,169,98,0.06)"
                />
              </div>
            </div>

            <div v-if="!loading && filteredProjects.length === 0" class="empty-state">
              <p>No projects in this category.</p>
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
            <Button label="+ Create new project" @click="openModal" />
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
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import AppNavbar from '../components/AppNavbar.vue'
import Pill from '../components/UI/Pill/Pill.vue'
import Anchor from '../components/UI/Button/Anchor.vue'
import Button from '../components/UI/Button/Button.vue'

const authStore  = useAuthStore()
const projects   = ref([])
const loading    = ref(true)
const authError  = ref(false)
const fetchError = ref(null)
const activeTab  = ref('all')
const lastSync   = ref('—')

const ESTADOS = [
  { value: 'PLANIFICADO', label: 'Planned'   },
  { value: 'EN_PROGRESO', label: 'In Progress'},
  { value: 'PAUSADO',     label: 'Paused'    },
  { value: 'COMPLETADO',  label: 'Completed' },
  { value: 'CANCELADO',   label: 'Cancelled' },
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
const STATUS_LABEL = {
  PLANIFICADO: 'Planned',
  EN_PROGRESO: 'On Track',
  PAUSADO:     'Paused',
  COMPLETADO:  'Completed',
  CANCELADO:   'Cancelled',
}

const statusColor    = (e) => STATUS_COLOR[e]    || '#666'
const statusProgress = (e) => STATUS_PROGRESS[e] ?? 0
const statusLabel    = (e) => STATUS_LABEL[e]    || e
const isAdmin        = (p) => p.id_encargado === authStore.idUsuario

function formatDate(d) {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── API ───────────────────────────────────────────────────────────────────────

function authHeader() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
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
    // Ensure we have the user profile (for id_empresa + id_usuario)
    if (!authStore.user) await authStore.fetchMe()

    const params = new URLSearchParams({ limit: 100 })
    if (authStore.idEmpresa) params.set('id_empresa', authStore.idEmpresa)

    const res = await apiFetch(`/api/projects?${params}`)
    projects.value = res.data
    lastSync.value = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  } catch (err) {
    if (err.status === 401) authError.value = true
    else fetchError.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

// ── Computed counts ───────────────────────────────────────────────────────────

const asAdminCount    = computed(() => projects.value.filter(p => isAdmin(p)).length)
const atRiskCount     = computed(() => projects.value.filter(p => ['PAUSADO', 'CANCELADO'].includes(p.estado)).length)
const completedCount  = computed(() => projects.value.filter(p => p.estado === 'COMPLETADO').length)
const pausedCount     = computed(() => projects.value.filter(p => p.estado === 'PAUSADO').length)

const tabs = computed(() => [
  { key: 'all',       label: 'All',       count: projects.value.length },
  { key: 'active',    label: 'Active',    count: projects.value.filter(p => p.estado === 'EN_PROGRESO').length },
  { key: 'risk',      label: 'At Risk',   count: atRiskCount.value },
  { key: 'completed', label: 'Completed', count: completedCount.value },
])

const filteredProjects = computed(() => {
  if (activeTab.value === 'active')    return projects.value.filter(p => p.estado === 'EN_PROGRESO')
  if (activeTab.value === 'risk')      return projects.value.filter(p => ['PAUSADO', 'CANCELADO'].includes(p.estado))
  if (activeTab.value === 'completed') return projects.value.filter(p => p.estado === 'COMPLETADO')
  return projects.value
})

// ── Modal ─────────────────────────────────────────────────────────────────────

const showModal    = ref(false)
const modalLoading = ref(false)
const modalError   = ref(null)

const emptyForm = () => ({
  nombre_empresa:       '',
  nombre:               '',
  descripcion:          '',
  fecha_inicio:         new Date().toISOString().split('T')[0],
  fecha_fin_planificada:'',
  presupuesto_total:    null,
  estado:               'PLANIFICADO',
})

const form = ref(emptyForm())

function openModal() {
  form.value       = emptyForm()
  modalError.value = null
  showModal.value  = true
}

function closeModal() {
  showModal.value = false
}

async function submitProject() {
  modalLoading.value = true
  modalError.value   = null
  try {
    // Step 1: if no empresa yet, create it first
    let id_empresa = authStore.idEmpresa
    if (!id_empresa) {
      if (!form.value.nombre_empresa?.trim()) {
        modalError.value = 'Company name is required to create your first project.'
        return
      }
      const empRes = await fetch('/api/empresas', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body:    JSON.stringify({ nombre: form.value.nombre_empresa.trim() }),
      })
      const empData = await empRes.json()
      if (!empRes.ok) {
        modalError.value = empData.message || 'Could not create company.'
        return
      }
      id_empresa = empData.data.id_empresa
      // Refresh user profile so the store has the new id_empresa
      await authStore.fetchMe()
    }

    // Step 2: create the project
    const body = {
      nombre:            form.value.nombre,
      descripcion:       form.value.descripcion || undefined,
      fecha_inicio:      form.value.fecha_inicio,
      presupuesto_total: form.value.presupuesto_total,
      estado:            form.value.estado,
      id_empresa,
      id_encargado:      authStore.idUsuario,
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
    closeModal()
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

.projects-root {
  background: transparent;
  min-height: 100vh;
}

.projects-layout {
  font-family: 'Manrope', sans-serif;
  color: #faf8f5;
  min-height: calc(100vh - 56px);
  margin-top: 56px;
  display: flex;
  overflow-x: hidden;
}

/* ── State screens ── */
.state-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(10,10,10,0.82);
}
.state-title { font-family: 'Playfair Display', serif; font-size: 24px; color: #faf8f5; }
.state-msg   { font-size: 14px; color: #888; }

/* ── Main panel ── */
.main-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 48px 56px;
  background: rgba(10,10,10,0.82);
}

/* Header */
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

/* Tabs */
.tabs {
  display: flex; gap: 32px;
  border-bottom: 1px solid #1f1f1f;
  padding-bottom: 0;
}
.tab {
  background: none; border: none; cursor: pointer;
  font-family: 'Manrope', sans-serif; font-size: 13px;
  color: #555; padding-bottom: 12px;
  border-bottom: 2px solid transparent;
  transition: color 0.15s;
}
.tab.active { color: #c9a962; border-bottom-color: #c9a962; }
.tab:hover:not(.active) { color: #888; }

/* Section header */
.section-header { display: flex; justify-content: space-between; align-items: center; }
.section-title  { font-family: 'Playfair Display', serif; font-size: 20px; color: #faf8f5; }
.section-meta   { font-size: 12px; color: #555; }

/* Project grid */
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.project-card {
  background: rgba(15,15,15,0.7);
  border: 1px solid #1f1f1f;
  display: flex;
  flex-direction: column;
  transition: border-color 0.2s;
}
.project-card:hover { border-color: #333; }

.card-accent { height: 3px; flex-shrink: 0; }

.card-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 16px 8px;
}
.card-name {
  font-family: 'Playfair Display', serif;
  font-size: 16px; color: #faf8f5;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 200px;
}

.role-badge {
  font-size: 10px; font-weight: 600; letter-spacing: 0.05em;
  padding: 2px 8px; flex-shrink: 0;
}
.badge-admin  { background: rgba(201,169,98,0.15); color: #c9a962; border: 1px solid rgba(201,169,98,0.3); }
.badge-member { background: rgba(96,165,250,0.1);  color: #60a5fa; border: 1px solid rgba(96,165,250,0.3); }

.card-body { padding: 0 16px 12px; display: flex; flex-direction: column; gap: 12px; flex: 1; }

.card-desc { font-size: 12px; color: #666; line-height: 1.5; }

.progress-wrap { display: flex; align-items: center; gap: 10px; }
.progress-bg   { flex: 1; height: 3px; background: #1f1f1f; }
.progress-fill { height: 100%; transition: width 0.4s; }
.progress-val  { font-size: 11px; color: #555; width: 30px; text-align: right; }

.card-footer-row { display: flex; justify-content: space-between; align-items: center; }
.status-dot { font-size: 11px; }
.due-date   { font-size: 11px; color: #555; }

.card-open {
  border-top: 1px solid #1a1a1a;
  padding: 10px 16px;
}
.open-link { font-size: 12px; color: #555; cursor: pointer; transition: color 0.15s; }
.project-card:hover .open-link { color: #c9a962; }

/* ── UI component overrides ── */

/* Pill in card header (role badge) */
.card-header :deep(.pill) {
  height: 22px;
  padding: 0 10px;
  border-radius: 3px;
  border: 1px solid currentColor;
}
.card-header :deep(.pill-text) {
  font-size: 10px;
  letter-spacing: 0.06em;
  font-family: 'Manrope', sans-serif;
}
.card-header :deep(.dot) {
  display: none;
}

/* Pill in card footer (status) */
.card-footer-row :deep(.pill) {
  height: 20px;
  padding: 0 8px;
  border-radius: 3px;
  border: 1px solid currentColor;
}
.card-footer-row :deep(.pill-text) {
  font-size: 10px;
  font-family: 'Manrope', sans-serif;
}
.card-footer-row :deep(.dot) {
  width: 6px; height: 6px;
  margin-right: 6px;
}

/* Anchor in card-open footer */
.card-open :deep(.anchor) {
  padding: 0;
  border-radius: 0;
  font-size: 12px;
  font-family: 'Manrope', sans-serif;
  justify-content: flex-start;
  width: 100%;
  transition: color 0.15s;
}
.project-card:hover .card-open :deep(.anchor) {
  color: #c9a962 !important;
}

/* Button overrides for modal actions */
.modal-actions :deep(.btn) {
  border-radius: 0;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 600;
  padding: 10px 20px;
}
.modal-actions :deep(.btn:first-child) {
  background: transparent;
  border: 1px solid #1f1f1f;
  color: #faf8f5;
}
.modal-actions :deep(.btn:last-child) {
  background: #c9a962;
  color: #0a0a0a;
}
.modal-actions :deep(.btn:last-child:disabled) {
  opacity: 0.6;
}

/* Button overrides for context panel quick actions */
.context-panel :deep(.btn) {
  width: 100%;
  border-radius: 0;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 600;
  padding: 12px 16px;
  display: block;
  margin-bottom: 8px;
  text-align: left;
}
.context-panel :deep(.btn:first-of-type) {
  background: #c9a962;
  color: #0a0a0a;
}
.context-panel :deep(.btn:last-of-type) {
  background: transparent;
  border: 1px solid #1f1f1f;
  color: #faf8f5;
}

/* Skeleton */
.project-card.skeleton { pointer-events: none; }
.skeleton-accent { height: 3px; background: #1f1f1f; }
.skeleton-body   { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.skeleton-line   { height: 10px; background: #1a1a1a; border-radius: 2px; animation: pulse 1.4s ease-in-out infinite; }
.skeleton-line.short { width: 50%; }
.skeleton-line.mid   { width: 70%; }
@keyframes pulse { 0%,100% { opacity:0.4 } 50% { opacity:0.8 } }

/* Empty state */
.empty-state { grid-column: 1/-1; text-align: center; padding: 60px 0; color: #555; font-size: 14px; }

/* ── Context panel ── */
.context-panel {
  width: 320px; flex: none;
  background: rgba(10,10,10,0.9);
  border-left: 1px solid #1a1a1a;
  padding: 48px 28px;
  display: flex; flex-direction: column; gap: 32px;
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

.ctx-btn-primary {
  width: 100%; display: flex; align-items: center; gap: 8px;
  background: #c9a962; border: none; padding: 12px 16px; cursor: pointer;
  font-family: 'Manrope', sans-serif; font-size: 12px; color: #0a0a0a;
  margin-bottom: 8px;
}
.ctx-btn-secondary {
  width: 100%; display: flex; align-items: center; gap: 8px;
  background: transparent; border: 1px solid #1f1f1f; padding: 12px 16px; cursor: pointer;
  font-family: 'Manrope', sans-serif; font-size: 12px; color: #faf8f5;
}

.data-source { margin-top: auto; }
.ds-label { font-size: 10px; letter-spacing: 0.1em; color: #333; margin-bottom: 4px; }
.ds-text  { font-size: 11px; color: #444; }

/* Onboarding notice */
.onboarding-notice {
  background: rgba(201,169,98,0.06);
  border: 1px solid rgba(201,169,98,0.2);
  padding: 16px;
}
.notice-title { font-size: 13px; color: #c9a962; font-weight: 600; margin-bottom: 4px; }
.notice-sub   { font-size: 12px; color: #888; line-height: 1.5; }

/* ── Modal ── */
.modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
}
.modal {
  background: #0f0f0f; border: 1px solid #1f1f1f;
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
</style>
