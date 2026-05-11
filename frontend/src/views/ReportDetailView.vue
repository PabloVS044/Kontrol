<template>
  <div class="detail-root">
    <AppNavbar />

    <div class="detail-layout">

      <!-- ── MAIN PANEL ──────────────────────────────────────────── -->
      <div class="main-panel">

        <!-- Back + Header -->
        <div class="detail-header">
          <button class="back-btn" @click="$router.back()">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="square"/>
            </svg>
            All Reports
          </button>

          <div v-if="loading" class="header-skeleton">
            <div class="skel-line long"></div>
            <div class="skel-line short"></div>
            <div class="skel-line mid"></div>
          </div>

          <div v-else-if="project" class="header-content">
            <div class="header-top">
              <div>
                <h1 class="proj-name">{{ project.nombre }}</h1>
                <p class="proj-desc">{{ project.descripcion || 'No description provided.' }}</p>
              </div>
              <div class="header-actions">
              
                <button class="btn-outline">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 9V2M3 6l3 3 3-3M1 10h10" stroke="currentColor" stroke-width="1.2" stroke-linecap="square"/>
                  </svg>
                  Export
                </button>
              </div>
            </div>

            <div class="meta-row">
              <div class="meta-item">
                <span class="meta-label">Start Date</span>
                <span class="meta-value">{{ formatDate(project.fecha_inicio) }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Due Date</span>
                <span class="meta-value">{{ formatDate(project.fecha_fin_planificada) ?? 'Not set' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Budget</span>
                <span class="meta-value gold">{{ formatBudget(project.presupuesto_total) }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Progress</span>
                <span class="meta-value">{{ progressPct }}%</span>
              </div>
              
            </div>

            <!-- Overall progress bar -->
            <div class="overall-progress">
              <div class="op-track">
                <div class="op-fill" :style="{ width: progressPct + '%' }"></div>
              </div>
              <span class="op-label">{{ progressPct }}% complete</span>
            </div>
          </div>

          <div v-else class="error-state">
            <p>Project not found.</p>
            <button class="btn-outline" @click="$router.back()">Go back</button>
          </div>
        </div>

        <!-- ── GRID OF SECTIONS ──────────────────────────────────── -->
        <div v-if="project" class="sections-grid">

          <!-- Budget Overview -->
          <div class="detail-card">
            <div class="card-header">
              <span class="card-title">Budget Overview</span>
              <span class="card-tag">{{ budgetData.pct }}% used</span>
            </div>
            <div class="budget-body">
              <div class="donut-wrap">
                <DonutChart
                  :pct="budgetData.pct"
                  color="#c9a962"
                  :size="70" :radius="28" :stroke-width="10"
                  :label="`${budgetData.pct}%`" label-color="#c9a962" :label-font-size="11" :label-offset-y="3"
                  sublabel="used" :sublabel-font-size="6" :sublabel-offset-y="10"
                  display-width="120px"
                />
              </div>
              <div class="budget-stats">
                <div class="bstat">
                  <span class="bstat-val gold">{{ formatBudget(project.presupuesto_total) }}</span>
                  <span class="bstat-label">Total Budget</span>
                </div>
                <div class="bstat">
                  <span class="bstat-val">{{ formatBudget(budgetData.real) }}</span>
                  <span class="bstat-label">Spent</span>
                </div>
                <div class="bstat">
                  <span class="bstat-val" style="color:#4ade80">{{ formatBudget(budgetData.remaining) }}</span>
                  <span class="bstat-label">Remaining</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Task Management -->
          <div class="detail-card">
            <div class="card-header">
              <span class="card-title">Task Management</span>
              <span class="card-tag">{{ tasksByState.total }} tasks</span>
            </div>
            <div class="task-completion-circle">
              <DonutChart
                :pct="tasksByState.total ? Math.round(tasksByState.completadas / tasksByState.total * 100) : 0"
                color="#4ade80"
                :size="60" :radius="22" :stroke-width="8"
                :label="tasksByState.total ? Math.round(tasksByState.completadas / tasksByState.total * 100) + '%' : '0%'"
                label-color="#fff" :label-font-size="9" :label-offset-y="3"
                display-width="90px"
              />
              <div class="task-summary">
                <span class="ts-big">{{ tasksByState.completadas }} / {{ tasksByState.total }}</span>
                <span class="ts-label">tasks completed</span>
              </div>
            </div>
            <div class="task-list">
              <div class="tl-row">
                <span class="tl-dot blue"></span>
                <span class="tl-label">Pending</span>
                <div class="tl-bar-wrap">
                  <div class="tl-track"><div class="tl-fill blue" :style="{ width: tasksByState.total ? (tasksByState.pendientes / tasksByState.total * 100) + '%' : '0%' }"></div></div>
                </div>
                <span class="tl-val">{{ tasksByState.pendientes }}</span>
              </div>
              <div class="tl-row">
                <span class="tl-dot green"></span>
                <span class="tl-label">In Progress</span>
                <div class="tl-bar-wrap">
                  <div class="tl-track"><div class="tl-fill green" :style="{ width: tasksByState.total ? (tasksByState.enProgreso / tasksByState.total * 100) + '%' : '0%' }"></div></div>
                </div>
                <span class="tl-val">{{ tasksByState.enProgreso }}</span>
              </div>
              <div class="tl-row">
                <span class="tl-dot gold"></span>    
                <span class="tl-label">Completed</span>
                <div class="tl-bar-wrap">
                  <div class="tl-track"><div class="tl-fill gold" :style="{ width: tasksByState.total ? (tasksByState.completadas / tasksByState.total * 100) + '%' : '0%' }"></div></div>
                </div>
                <span class="tl-val">{{ tasksByState.completadas }}</span>
              </div>
              <div class="tl-row">
                <span class="tl-dot red"></span>
                <span class="tl-label">Cancelled</span>
                <div class="tl-bar-wrap">
                  <div class="tl-track"><div class="tl-fill red" :style="{ width: tasksByState.total ? (tasksByState.canceladas / tasksByState.total * 100) + '%' : '0%' }"></div></div>
                </div>
                <span class="tl-val">{{ tasksByState.canceladas }}</span>
              </div>
            </div>
          </div>

          <!-- Team -->
          <div class="detail-card">
            <div class="card-header">
              <span class="card-title">Team</span>
              <span class="card-tag">{{ teamTotal }} members</span>
            </div>
            <div class="team-list">
              <div v-for="role in teamRoles" :key="role.rol" class="member-row">
                <div class="member-avatar">{{ role.total }}</div>
                <div class="member-info">
                  <span class="member-name">{{ role.rol }}</span>
                  <span class="member-role">{{ role.total }} member{{ role.total !== 1 ? 's' : '' }}</span>
                </div>
              </div>
              <div v-if="!teamRoles.length" class="tl-label" style="color:#444; padding: 8px 0">
                No team members assigned.
              </div>
            </div>
          </div>

          <!-- Timeline -->
          <div class="detail-card">
            <div class="card-header">
              <span class="card-title">Timeline</span>
              <span class="card-tag">{{ timelineCurrentLabel }}</span>
            </div>
            <div class="timeline">
              <div
                v-for="(phase, i) in timelinePhases"
                :key="phase.key"
                class="phase-row"
              >
                <div class="phase-left">
                  <div class="phase-dot-wrap">
                    <div
                      class="phase-dot"
                      :class="{
                        'done':    phase.state === 'done',
                        'current': phase.state === 'current',
                        'future':  phase.state === 'future',
                        'skip':    phase.state === 'skip',
                      }"
                    >
                      <svg v-if="phase.state === 'done'" width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4l2 2 3-3" stroke="#0a0a0a" stroke-width="1.2" stroke-linecap="square"/>
                      </svg>
                    </div>
                    <div v-if="i < timelinePhases.length - 1" class="phase-connector" :class="phase.state === 'done' ? 'filled' : ''"></div>
                  </div>
                </div>
                <div class="phase-content">
                  <div class="phase-name-row">
                    <span class="phase-name" :class="phase.state">{{ phase.label }}</span>
                    <span class="phase-date">{{ phase.date }}</span>
                  </div>
                  <span class="phase-desc">{{ phase.desc }}</span>
                </div>
              </div>
            </div>
          </div>


        </div>
      </div>

      <!-- ── SIDE PANEL ──────────────────────────────────────────── -->
      <aside v-if="project" class="side-panel">

        <div class="side-section">
          <p class="side-label">Project Health</p>
          <div class="health-card" :class="healthClass">
            <span class="health-dot"></span>
            <div>
              <span class="health-text">{{ healthText }}</span>
              <span class="health-sub">{{ healthSub }}</span>
            </div>
          </div>
        </div>

        <div class="side-divider"></div>

        <div class="side-section">
          <p class="side-label">Quick Stats</p>
          
          <div class="qstat-list">
            <div class="qstat">
              <span class="qstat-label">Days Active</span>
              <span class="qstat-val">{{ daysActive }}</span>
            </div>
            <div class="qstat">
              <span class="qstat-label">Days Remaining</span>
              <span class="qstat-val" :class="typeof daysRemaining === 'number' && daysRemaining < 7 ? 'red' : ''">
                {{ daysRemaining }}
              </span>
            </div>
            <div class="qstat">
              <span class="qstat-label">Budget / Day</span>
              <span class="qstat-val">{{ budgetPerDay }}</span>
            </div>
            <div class="info-row">
              <span class="info-key">Budget</span>
              <span class="info-val gold">{{ formatBudget(project.presupuesto_total) }}</span>
            </div>
          </div>
        </div>

        <div class="side-divider"></div>

        


      </aside>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppNavbar from '../components/AppNavbar.vue'
import Pill       from '../components/UI/Pill/Pill.vue'
import Button     from '../components/UI/Button/Button.vue'
import DonutChart from '../components/UI/DonutChart/DonutChart.vue'
import { statusLabel, statusPill, formatDate, formatBudget } from '../utils/statusHelpers.js'
import { useAuthStore } from '../stores/auth'

const route     = useRoute()
const authStore = useAuthStore()

const project = ref(null)
const metrics = ref(null)
const loading = ref(true)

async function loadAll() {
  loading.value = true
  try {
    const headers = {
      Authorization: `Bearer ${authStore.token}`,
      'X-Company-ID': String(authStore.idEmpresa),
    }
    const [projRes, metRes] = await Promise.all([
      fetch(`/api/projects/${route.params.id}`, { headers }),
      fetch(`/api/projects/${route.params.id}/metrics`, { headers }),
    ])
    if (!projRes.ok) throw new Error()
    project.value = (await projRes.json()).data
    if (metRes.ok) metrics.value = (await metRes.json()).data
  } catch {
    project.value = null
  } finally {
    loading.value = false
  }
}

onMounted(loadAll)

// ── Metrics-derived computeds ──────────────────────────────────────────────
const progressPct = computed(() => metrics.value?.progress?.current_percentage ?? 0)

const tasksByState = computed(() => {
  const rows = metrics.value?.tareas ?? []
  const get = (estado) => Number(rows.find(r => r.estado === estado)?.count ?? 0)
  const completadas = get('COMPLETADA')
  const enProgreso  = get('EN_PROGRESO')
  const pendientes  = get('PENDIENTE')
  const canceladas  = get('CANCELADA')
  const total = rows.reduce((s, r) => s + Number(r.count), 0)
  return { total, completadas, enProgreso, pendientes, canceladas }
})

const budgetData = computed(() => {
  const b = metrics.value?.presupuesto
  const planificado = Number(b?.total_planificado ?? 0)
  const real        = Number(b?.total_real ?? 0)
  const pct = planificado > 0 ? Math.min(Math.round((real / planificado) * 100), 100) : 0
  return { planificado, real, pct, remaining: Math.max(planificado - real, 0) }
})

const teamRoles = computed(() => metrics.value?.equipo ?? [])
const teamTotal = computed(() => teamRoles.value.reduce((s, r) => s + Number(r.total), 0))

// ── Timeline ───────────────────────────────────────────────────────────────
const TIMELINE_PHASES = [
  { key: 'PLANIFICADO', label: 'Planning',  desc: 'Scope definition, resource allocation and goal setting.' },
  { key: 'EN_PROGRESO', label: 'Execution', desc: 'Active development and task completion by the team.' },
  { key: 'REVISION',    label: 'Review',    desc: 'Quality assurance, testing and stakeholder review.' },
  { key: 'COMPLETADO',  label: 'Delivery',  desc: 'Final delivery, documentation and project closure.' },
]
const ESTADO_ORDER = ['PLANIFICADO', 'EN_PROGRESO', 'REVISION', 'COMPLETADO']

const timelinePhases = computed(() => {
  if (!project.value) return []
  const estado = project.value.estado
  const isCancelled = estado === 'CANCELADO'
  const isPaused    = estado === 'PAUSADO'
  let currentIdx = ESTADO_ORDER.indexOf(estado)
  if (currentIdx === -1) currentIdx = 1

  return TIMELINE_PHASES.map((phase, i) => {
    const phaseIdx = ESTADO_ORDER.indexOf(phase.key)
    let state = 'future'
    if (isCancelled)              state = phaseIdx === 0 ? 'done' : 'skip'
    else if (isPaused)            state = phaseIdx < 1 ? 'done' : phaseIdx === 1 ? 'current' : 'future'
    else if (phaseIdx < currentIdx)   state = 'done'
    else if (phaseIdx === currentIdx) state = 'current'

    const startDate = project.value.fecha_inicio
    const endDate   = project.value.fecha_fin_planificada
    let dateStr = '—'
    if (state === 'done' || state === 'current') {
      dateStr = startDate ? formatDate(startDate) : '—'
    } else if (state === 'future' && endDate && phaseIdx === TIMELINE_PHASES.length - 1) {
      dateStr = formatDate(endDate)
    }
    return { ...phase, state, date: dateStr }
  })
})

const timelineCurrentLabel = computed(() => {
  const cur = timelinePhases.value.find(p => p.state === 'current')
  return cur ? cur.label : statusLabel(project.value?.estado)
})

// ── Side panel stats ───────────────────────────────────────────────────────
const daysActive = computed(() => {
  if (!project.value?.fecha_inicio) return '—'
  return Math.max(0, Math.floor((Date.now() - new Date(project.value.fecha_inicio)) / 86_400_000))
})

const daysRemaining = computed(() => {
  if (!project.value?.fecha_fin_planificada) return '—'
  const diff = new Date(project.value.fecha_fin_planificada).getTime() - Date.now()
  return diff > 0 ? Math.ceil(diff / 86_400_000) : 'Overdue'
})

const budgetPerDay = computed(() => {
  if (!project.value?.presupuesto_total || !project.value?.fecha_inicio || !project.value?.fecha_fin_planificada) return '—'
  const days = Math.ceil((new Date(project.value.fecha_fin_planificada) - new Date(project.value.fecha_inicio)) / 86_400_000)
  if (days <= 0) return '—'
  return formatBudget(parseFloat(project.value.presupuesto_total) / days) + '/d'
})

const healthClass = computed(() => {
  const e = project.value?.estado
  if (e === 'COMPLETADO')  return 'health-good'
  if (e === 'EN_PROGRESO') return 'health-good'
  if (e === 'PAUSADO')     return 'health-warn'
  if (e === 'CANCELADO')   return 'health-bad'
  return 'health-neutral'
})

const healthText = computed(() => {
  const e = project.value?.estado
  if (e === 'COMPLETADO')  return 'Completed'
  if (e === 'EN_PROGRESO') return 'On Track'
  if (e === 'PAUSADO')     return 'On Hold'
  if (e === 'CANCELADO')   return 'Cancelled'
  return 'Planned'
})

const healthSub = computed(() => {
  const e = project.value?.estado
  if (e === 'COMPLETADO')  return 'All objectives met'
  if (e === 'EN_PROGRESO') return 'Progressing normally'
  if (e === 'PAUSADO')     return 'Awaiting resolution'
  if (e === 'CANCELADO')   return 'Project terminated'
  return 'Not yet started'
})
</script>

<style scoped>
/* ─── Layout ─────────────────────────────────────────────────────────────── */
.detail-root {
  min-height: 100vh;
  background: transparent;
  padding-top: 56px;
}

.detail-layout {
  display: grid;
  grid-template-columns: 1fr 240px;
  max-width: 1440px;
  margin: 0 auto;
  min-height: calc(100vh - 56px);
}

/* ─── Main Panel ─────────────────────────────────────────────────────────── */
.main-panel {
  padding: 28px 32px 48px;
  border-right: 1px solid #1e1e1e;
  overflow-y: auto;
  background: rgba(10,10,10,0.82);
}

/* ─── Back btn ───────────────────────────────────────────────────────────── */
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: #555;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  cursor: pointer;
  margin-bottom: 20px;
  padding: 0;
  transition: color .2s;
}
.back-btn:hover { color: #c9a962; }

/* ─── Header ─────────────────────────────────────────────────────────────── */
.detail-header {
  margin-bottom: 28px;
  padding-bottom: 24px;
  border-bottom: 1px solid #1e1e1e;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.proj-name {
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.4rem, 3vw, 2rem);
  font-weight: 700;
  color: #faf8f5;
  margin: 0 0 6px;
}

.proj-desc {
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  color: var(--TextMuted);
  margin: 0;
  max-width: 560px;
}

.header-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: transparent;
  border: 1px solid #2a2a2a;
  color: #888;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  cursor: pointer;
  transition: border-color .2s, color .2s;
}
.btn-outline:hover { border-color: #c9a962; color: #c9a962; }

/* Meta row */
.meta-row {
  display: flex;
  gap: 28px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.meta-item { display: flex; flex-direction: column; gap: 3px; }
.meta-label {
  font-family: 'Manrope', sans-serif;
  font-size: 9px;
  font-weight: 700;
  color: #444;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.meta-value {
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #ccc;
}
.meta-value.gold { color: #c9a962; }
.meta-value.dim  { color: #555; }

/* Overall progress */
.overall-progress { display: flex; align-items: center; gap: 12px; }
.op-track {
  flex: 1;
  height: 4px;
  background: #1a1a1a;
  border-radius: 2px;
  overflow: hidden;
  max-width: 400px;
}
.op-fill {
  height: 100%;
  background: linear-gradient(90deg, #b27f2a, #c9a962);
  border-radius: 2px;
  transition: width .6s ease;
}
.op-label {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  color: #555;
  white-space: nowrap;
}

/* Pill sizing overrides */
.header-actions :deep(.pill) {
  padding: 4px 10px;
  font-size: 11px;
}
.info-row :deep(.pill) {
  padding: 3px 8px;
  font-size: 10px;
}

/* Skeleton */
.header-skeleton { display: flex; flex-direction: column; gap: 10px; }
.skel-line {
  height: 14px;
  background: #1a1a1a;
  border-radius: 2px;
  animation: pulse 1.5s ease-in-out infinite;
}
.skel-line.long  { width: 40%; }
.skel-line.mid   { width: 60%; }
.skel-line.short { width: 25%; }
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

/* Error */
.error-state { display: flex; flex-direction: column; gap: 12px; color: #fb7185; font-family: 'Manrope', sans-serif; font-size: 13px; }

/* ─── Sections grid ──────────────────────────────────────────────────────── */
.sections-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.detail-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid #1e1e1e;
  padding: 20px;
  transition: border-color .2s, background .2s;
}
.detail-card:hover {
  border-color: rgba(201,169,98,0.2);
  background: rgba(201,169,98,0.02);
}
.detail-card.span-2 { grid-column: span 2; }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.card-title {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  font-weight: 700;
  color: #888;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.card-tag {
  font-family: 'Manrope', sans-serif;
  font-size: 10px;
  color: #c9a962;
  border: 1px solid rgba(201,169,98,0.2);
  padding: 2px 7px;
  background: rgba(201,169,98,0.05);
}
.card-header-right { display: flex; gap: 4px; }
.period-btn {
  padding: 3px 8px;
  background: transparent;
  border: 1px solid #1e1e1e;
  color: #444;
  font-family: 'Manrope', sans-serif;
  font-size: 10px;
  cursor: pointer;
  transition: all .15s;
}
.period-btn.active { border-color: rgba(201,169,98,0.4); color: #c9a962; }

/* ─── Budget card ────────────────────────────────────────────────────────── */
.budget-body { display: flex; align-items: center; gap: 20px; margin-bottom: 16px; }
.donut-wrap { flex-shrink: 0; padding-right: 2rem; }
.budget-stats { display: flex; flex-direction: column; gap: 8px; }
.bstat { display: flex; flex-direction: column; }
.bstat-val {
  font-family: 'Manrope', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #bbb;
}
.bstat-val.gold { color: #d4b06a; }
.bstat-label { font-family: 'Manrope', sans-serif; font-size: 10px; color: #555; }

.budget-bars { display: flex; flex-direction: column; gap: 7px; }
.bb-item { display: flex; align-items: center; gap: 8px; }
.bb-label { font-family: 'Manrope', sans-serif; font-size: 10px; color: #555; width: 70px; flex-shrink: 0; }
.bb-track { flex: 1; height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; }
.bb-fill { height: 100%; border-radius: 2px; transition: width .5s; }
.bb-fill.gold   { background: #c9a962; }
.bb-fill.blue   { background: #60a5fa; }
.bb-fill.purple { background: #a78bfa; }
.bb-pct { font-family: 'Manrope', sans-serif; font-size: 10px; color: #444; min-width: 28px; text-align: right; }

/* ─── Task card ──────────────────────────────────────────────────────────── */
.task-completion-circle {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
.task-summary { display: flex; flex-direction: column; gap: 3px; }
.ts-big { font-family: 'Playfair Display', serif; font-size: 1.25rem; font-weight: 700; color: #faf8f5; }
.ts-label { font-family: 'Manrope', sans-serif; font-size: 10px; color: #666; }

.task-list { display: flex; flex-direction: column; gap: 7px; }
.tl-row { display: flex; align-items: center; gap: 7px; }
.tl-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.tl-dot.green  { background: #4ade80; }
.tl-dot.blue   { background: #60a5fa; }
.tl-dot.gold   { background: #c9a962; }
.tl-dot.red    { background: #fb7185; }
.tl-label { font-family: 'Manrope', sans-serif; font-size: 11px; color: #777; width: 72px; flex-shrink: 0; }
.tl-bar-wrap { flex: 1; }
.tl-track { height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; }
.tl-fill { height: 100%; border-radius: 2px; transition: width .5s; }
.tl-fill.green  { background: #4ade80; }
.tl-fill.blue   { background: #60a5fa; }
.tl-fill.gold   { background: #c9a962; }
.tl-fill.red    { background: #fb7185; }
.tl-val { font-family: 'Manrope', sans-serif; font-size: 10px; color: #444; min-width: 20px; text-align: right; }

/* ─── Team card ──────────────────────────────────────────────────────────── */
.team-list { display: flex; flex-direction: column; gap: 4px; }
.member-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
  border-bottom: 1px solid #111;
}
.member-avatar {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Manrope', sans-serif;
  font-size: 10px;
  font-weight: 700;
  color: #aaa;
  flex-shrink: 0;
  border: 1px solid rgba(255,255,255,0.05);
}
.member-info { flex: 1; display: flex; flex-direction: column; gap: 1px; }
.member-name { font-family: 'Manrope', sans-serif; font-size: 12px; color: #ccc; font-weight: 500; }
.member-role { font-family: 'Manrope', sans-serif; font-size: 10px; color: #666; }
.member-status {
  font-family: 'Manrope', sans-serif;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  letter-spacing: 0.05em;
}
.st-active  { color: #4ade80; background: rgba(74,222,128,0.08);  }
.st-idle    { color: #888;    background: rgba(255,255,255,0.04); }
.st-away    { color: #fb923c; background: rgba(251,146,60,0.08);  }

/* ─── Timeline card ──────────────────────────────────────────────────────── */
.timeline { display: flex; flex-direction: column; }
.phase-row { display: flex; gap: 10px; }
.phase-left { display: flex; flex-direction: column; align-items: center; width: 20px; flex-shrink: 0; }
.phase-dot-wrap { display: flex; flex-direction: column; align-items: center; }
.phase-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all .2s;
}
.phase-dot.done    { background: #c9a962; border: none; }
.phase-dot.current { background: rgba(201,169,98,0.15); border: 1.5px solid #c9a962; }
.phase-dot.future  { background: transparent; border: 1.5px solid #2a2a2a; }
.phase-dot.skip    { background: transparent; border: 1.5px solid #1e1e1e; }
.phase-connector {
  width: 1px;
  flex: 1;
  min-height: 20px;
  background: #1e1e1e;
  margin: 3px 0;
}
.phase-connector.filled { background: #c9a962; opacity: 0.4; }

.phase-content { flex: 1; padding-bottom: 18px; }
.phase-name-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px; }
.phase-name {
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #666;
}
.phase-name.done    { color: #d4b06a; }
.phase-name.current { color: #faf8f5; }
.phase-name.future  { color: #444; }
.phase-name.skip    { color: #2e2e2e; }
.phase-date { font-family: 'Manrope', sans-serif; font-size: 10px; color: #555; }
.phase-desc { font-family: 'Manrope', sans-serif; font-size: 10px; color: #555; line-height: 1.5; }

/* ─── Metrics card ───────────────────────────────────────────────────────── */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}
.metric-card {
  background: rgba(255,255,255,0.02);
  border: 1px solid #1e1e1e;
  border-top: 2px solid #1e1e1e;
  padding: 14px 12px 10px;
  transition: border-color .2s, background .2s;
}
.metric-card:hover {
  background: rgba(201,169,98,0.04);
  border-color: rgba(201,169,98,0.2);
  border-top-color: currentColor;
}
.metric-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 4px;
}
.metric-val {
  font-family: 'Playfair Display', serif;
  font-size: 1.15rem;
  font-weight: 700;
}
.metric-delta {
  font-family: 'Manrope', sans-serif;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 4px;
}
.metric-delta.pos { color: #4ade80; background: rgba(74,222,128,0.08); }
.metric-delta.neg { color: #fb7185; background: rgba(251,113,133,0.08); }
.metric-label {
  font-family: 'Manrope', sans-serif;
  font-size: 9px;
  color: #666;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 8px;
  display: block;
}
.spark-svg { width: 100%; height: 28px; display: block; }

/* ─── Activity card ──────────────────────────────────────────────────────── */
.view-all-btn {
  background: none;
  border: none;
  color: #c9a962;
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity .2s;
}
.view-all-btn:hover { opacity: 1; }

.activity-list { display: flex; flex-direction: column; gap: 0; }
.activity-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #0e0e0e;
}
.act-icon {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 4px;
  color: #888;
}
.act-content { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.act-text { font-family: 'Manrope', sans-serif; font-size: 11px; color: #aaa; }
.act-meta { font-family: 'Manrope', sans-serif; font-size: 10px; color: #555; }
.act-tag {
  font-family: 'Manrope', sans-serif;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 7px;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}
.tag-green  { color: #4ade80; background: rgba(74,222,128,0.08);  }
.tag-gold   { color: #c9a962; background: rgba(201,169,98,0.08);  }
.tag-purple { color: #a78bfa; background: rgba(167,139,250,0.08); }
.tag-blue   { color: #60a5fa; background: rgba(96,165,250,0.08);  }

/* ─── Side Panel ─────────────────────────────────────────────────────────── */
.side-panel {
  padding: 24px 20px;
  background: rgba(10,10,10,0.9);
  border-left: 1px solid #1e1e1e;
  overflow-y: auto;
}
.side-section { margin-bottom: 16px; }
.side-label {
  font-family: 'Manrope', sans-serif;
  font-size: 9px;
  font-weight: 700;
  color: #444;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin: 0 0 10px;
}
.side-divider { height: 1px; background: #1a1a1a; margin: 16px 0; }

/* Health */
.health-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #1e1e1e;
  background: rgba(255,255,255,0.02);
}
.health-dot { width: 8px; height: 8px; border-radius: 50%; background: #333; flex-shrink: 0; }
.health-text {
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #666;
  display: block;
}
.health-sub {
  font-family: 'Manrope', sans-serif;
  font-size: 10px;
  color: #333;
  display: block;
}
.health-good .health-dot { background: #4ade80; }
.health-good .health-text { color: #4ade80; }
.health-warn .health-dot { background: #fb923c; }
.health-warn .health-text { color: #fb923c; }
.health-bad .health-dot { background: #fb7185; }
.health-bad .health-text { color: #fb7185; }
.health-neutral .health-dot { background: #60a5fa; }
.health-neutral .health-text { color: #60a5fa; }

/* Quick stats */
.qstat-list { display: flex; flex-direction: column; gap: 0; }
.qstat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 0;
  border-bottom: 1px solid #111;
}
.qstat-label { font-family: 'Manrope', sans-serif; font-size: 11px; color: #666; }
.qstat-val { font-family: 'Manrope', sans-serif; font-size: 11px; font-weight: 600; color: #aaa; }
.qstat-val.gold { color: #c9a962; }
.qstat-val.red  { color: #fb7185; }

/* Side action buttons */
.side-actions :deep(.btn) {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  background: rgba(255,255,255,0.02);
  border: 1px solid #1a1a1a;
  color: #555;
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  border-radius: 0;
  margin-bottom: 6px;
  transition: border-color .2s, color .2s;
}
.side-actions :deep(.btn:hover) {
  border-color: rgba(201,169,98,0.3);
  color: #c9a962;
}

/* Info list */
.info-list { display: flex; flex-direction: column; gap: 0; }
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 0;
  border-bottom: 1px solid #111;
}
.info-key { font-family: 'Manrope', sans-serif; font-size: 11px; color: #555; }
.info-val { font-family: 'Manrope', sans-serif; font-size: 11px; color: #999; }
.info-val.gold { color: #c9a962; }

/* Risk bars */
.risk-bars { display: flex; flex-direction: column; gap: 8px; }
.risk-row { display: flex; align-items: center; gap: 7px; }
.risk-label { font-family: 'Manrope', sans-serif; font-size: 10px; color: #555; width: 56px; flex-shrink: 0; }
.risk-track { flex: 1; height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; }
.risk-fill { height: 100%; border-radius: 2px; transition: width .5s; }
.risk-val { font-family: 'Manrope', sans-serif; font-size: 9px; font-weight: 700; min-width: 40px; text-align: right; }

/* ─── Responsive ─────────────────────────────────────────────────────────── */
@media (max-width: 1200px) {
  .metrics-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 1100px) {
  .detail-layout { grid-template-columns: 1fr; }
  .side-panel { border-left: none; border-top: 1px solid #1e1e1e; }
}
@media (max-width: 768px) {
  .sections-grid { grid-template-columns: 1fr; }
  .detail-card.span-2 { grid-column: span 1; }
  .main-panel { padding: 20px 16px 32px; }
  .meta-row { gap: 16px; }
  .metrics-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
