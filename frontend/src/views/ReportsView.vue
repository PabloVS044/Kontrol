<template>
  <div class="reports-root">
    <AppNavbar />

    <div class="reports-layout">

      <!-- ── MAIN PANEL ─────────────────────────────────────────── -->
      <div class="main-panel">

        <!-- Header -->
        <div class="rep-header">
          <div class="rep-header-left">
            <h1 class="rep-title">{{ $t('reports.header.title') }}</h1>
            <p class="rep-subtitle">{{ $t('reports.header.subtitle') }}</p>
          </div>
          <div class="rep-header-actions">
            <button class="btn-outline" @click="openCreateModal">
              <svg class="icon14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="square"/>
              </svg>
              {{ $t('reports.header.createReport') }}
            </button>
            <button class="btn-outline">
              <svg class="icon14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.3"/>
                <path d="M5 7l1.5 1.5L9.5 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="square"/>
              </svg>
              {{ $t('reports.header.generateAI') }}
            </button>
            <button class="btn-outline">
              <svg class="icon14" viewBox="0 0 14 14" fill="none">
                <path d="M7 10V2M4 7l3 3 3-3M2 12h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="square"/>
              </svg>
              {{ $t('reports.header.export') }}
            </button>
          </div>
        </div>

        <!-- Filter Tabs -->
        <div class="filter-bar">
          <button
            v-for="f in filters"
            :key="f.key"
            class="filter-btn"
            :class="{ active: activeFilter === f.key }"
            @click="activeFilter = f.key"
          >
            {{ f.label }}
          </button>
        </div>

        <!-- KPI Cards -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <span class="kpi-label">{{ $t('reports.view.kpi.avgProgress') }}</span>
            <span class="kpi-value">{{ loading ? '—' : avgProgress + '%' }}</span>
            <span class="kpi-badge kpi-badge--green">{{ $t('reports.view.kpi.projects', { count: totales.total_proyectos }) }}</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">{{ $t('reports.view.kpi.activeProjects') }}</span>
            <span class="kpi-value">{{ loading ? '—' : totales.proyectos_activos }}</span>
            <span class="kpi-badge kpi-badge--green">{{ $t('reports.view.kpi.ofTotal', { total: totales.total_proyectos }) }}</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">{{ $t('reports.view.kpi.completed') }}</span>
            <span class="kpi-value">{{ loading ? '—' : totales.proyectos_completados }}</span>
            <span class="kpi-badge kpi-badge--purple">{{ $t('reports.view.kpi.completionRate', { pct: completionRate }) }}</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">{{ $t('reports.view.kpi.budgetTotal') }}</span>
            <span class="kpi-value">{{ loading ? '—' : formatBudget(totales.presupuesto_total) }}</span>
            <span class="kpi-badge" :class="budgetBadgeClass">{{ $t('reports.view.kpi.budgetUsed', { pct: budgetPct }) }}</span>
          </div>
        </div>

        <!-- Sales & Finance (inventory) — scoped per project -->
        <SalesFinanceSection :projects="summary.proyectos" />

        <!-- Projects Overview Table -->
        <div class="section-block">
          <div class="section-header">
            <span class="section-title">{{ $t('reports.view.projectsTitle') }}</span>
          </div>

          <div v-if="loading" class="table-skeleton">
            <div v-for="n in 4" :key="n" class="table-skel-row">
              <div class="skel-cell" style="width:30%"></div>
              <div class="skel-cell" style="width:20%"></div>
              <div class="skel-cell" style="width:15%"></div>
              <div class="skel-cell" style="width:20%"></div>
              
            </div>
          </div>

          <div v-else class="rep-table-wrap">
            <table class="rep-table">
              <thead>
                <tr>
                  <th>{{ $t('reports.view.colProjectName') }}</th>
                  <th>{{ $t('reports.view.colProgress') }}</th>
                  <th>{{ $t('reports.view.colStatus') }}</th>
                  <th>{{ $t('reports.view.colStartDate') }}</th>
                  
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="project in displayedProjects"
                  :key="project.id_proyecto"
                  class="rep-row"
                  @click="goToDetail(project.id_proyecto)"
                >
                  <td class="td-name">{{ project.nombre }}</td>
                  <td class="td-project">
                    <div class="progress-cell">
                      <div class="prog-track"><div class="prog-fill" :style="{ width: project.progreso_actual + '%' }"></div></div>
                      <span class="prog-pct">{{ project.progreso_actual }}%</span>
                    </div>
                  </td>
                  <td class="td-status">
                    <span class="status-tag" :style="{
                      color: statusPill(project.estado).color,
                      background: statusPill(project.estado).bg
                    }">
                      <span class="status-dot" :style="{ background: statusPill(project.estado).color }"></span>
                      {{ statusPill(project.estado).label }}
                    </span>
                  </td>
                  <td class="td-date">{{ formatDate(project.fecha_inicio) }}</td>
                  
                </tr>
                <tr v-if="displayedProjects.length === 0">
                  <td colspan="5" class="empty-row">{{ $t('reports.view.emptyProjects') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Manual Reports Table -->
        <div class="section-block">
          <div class="section-header">
            <span class="section-title">{{ $t('reports.view.reportsTitle') }}</span>
            <span class="section-count">{{ $t('reports.view.reportsCount', { count: reports.length }) }}</span>
          </div>

          <div v-if="loadingReports" class="table-skeleton">
            <div v-for="n in 3" :key="n" class="table-skel-row">
              <div class="skel-cell" style="width:35%"></div>
              <div class="skel-cell" style="width:15%"></div>
              <div class="skel-cell" style="width:25%"></div>
              
            </div>
          </div>

          <div v-else class="rep-table-wrap">
            <table class="rep-table">
              <thead>
                <tr>
                  <th>{{ $t('reports.view.colTitle') }}</th>
                  <th>{{ $t('reports.view.colType') }}</th>
                  <th>{{ $t('reports.view.colProject') }}</th>
                  <th>{{ $t('reports.view.colDate') }}</th>
                  
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="r in reports"
                  :key="r.id_reporte"
                  class="rep-row"
                  @click="openReportDetail(r)"
                >
                  <td class="td-name">{{ r.titulo }}</td>
                  <td><span class="type-tag">{{ r.tipo }}</span></td>
                  <td class="td-project">
                    <span class="proj-badge">{{ projectNameById(r.id_proyecto) }}</span>
                  </td>
                  <td class="td-date">{{ formatDate(r.fecha_generacion) }}</td>
                  
                </tr>
                <tr v-if="reports.length === 0">
                  <td colspan="5" class="empty-row">{{ $t('reports.view.emptyReports') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Performance Chart -->
        <div class="section-block">
          <div class="section-header">
            <span class="section-title">{{ $t('reports.view.performanceTitle') }}</span>
            <div class="chart-legend">
              <span class="legend-item"><span class="leg-dot gold"></span> {{ $t('reports.view.legendBudget') }}</span>
              <span class="legend-item"><span class="leg-dot blue"></span> {{ $t('reports.view.legendProgress') }}</span>
            </div>
          </div>

          <div class="chart-wrap">
            <div class="y-axis">
              <span>100</span><span>75</span><span>50</span><span>25</span><span>0</span>
            </div>
            <div class="chart-area">
              <svg viewBox="0 0 600 160" preserveAspectRatio="none" class="perf-svg">
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#c9a962" stop-opacity="0.3"/>
                    <stop offset="100%" stop-color="#c9a962" stop-opacity="0"/>
                  </linearGradient>
                  <linearGradient id="lineGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.2"/>
                    <stop offset="100%" stop-color="#60a5fa" stop-opacity="0"/>
                  </linearGradient>
                </defs>
                <line x1="0" y1="0"   x2="600" y2="0"   stroke="#1f1f1f" stroke-width="1"/>
                <line x1="0" y1="40"  x2="600" y2="40"  stroke="#1f1f1f" stroke-width="1"/>
                <line x1="0" y1="80"  x2="600" y2="80"  stroke="#1f1f1f" stroke-width="1"/>
                <line x1="0" y1="120" x2="600" y2="120" stroke="#1f1f1f" stroke-width="1"/>
                <line x1="0" y1="160" x2="600" y2="160" stroke="#1f1f1f" stroke-width="1"/>
                <template v-if="chartPoints.length">
                  <path :d="svgAreaPath(chartPoints, 'budgetY')"   fill="url(#lineGrad)"/>
                  <path :d="svgLinePath(chartPoints, 'budgetY')"   fill="none" stroke="#c9a962" stroke-width="2"/>
                  <path :d="svgAreaPath(chartPoints, 'progressY')" fill="url(#lineGrad2)"/>
                  <path :d="svgLinePath(chartPoints, 'progressY')" fill="none" stroke="#60a5fa" stroke-width="1.5" stroke-dasharray="4 3"/>
                  <circle v-for="pt in chartPoints" :key="pt.x + '-b'" :cx="pt.x" :cy="pt.budgetY"   r="3" fill="#c9a962"/>
                  <circle v-for="pt in chartPoints" :key="pt.x + '-p'" :cx="pt.x" :cy="pt.progressY" r="3" fill="#60a5fa"/>
                </template>
                <text v-else x="300" y="88" text-anchor="middle" fill="#333" font-size="11" font-family="Manrope, sans-serif">No data</text>
              </svg>
              <div class="x-axis">
                <span v-for="pt in chartPoints" :key="pt.x" :title="pt.name">{{ truncName(pt.name) }}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- ── CONTEXT PANEL ──────────────────────────────────────── -->
      <ReportsAiPanel :budget-pct="budgetPct" :task-stats="taskStats" />
    </div>

    <ReportDetailModal
      :report="reportDetail"
      :projects="summary.proyectos"
      @close="reportDetail = null"
      @view-metrics="onViewMetrics"
    />

    <ReportCreateModal
      :show="showCreateModal"
      :projects="summary.proyectos"
      :creating="creating"
      :error="createError"
      @close="closeCreateModal"
      @submit="submitCreate"
    />

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppNavbar  from '../components/AppNavbar.vue'
import SalesFinanceSection from '../components/reports/SalesFinanceSection.vue'
import ReportsAiPanel from '../components/reports/ReportsAiPanel.vue'
import ReportCreateModal from '../components/reports/ReportCreateModal.vue'
import ReportDetailModal from '../components/reports/ReportDetailModal.vue'
import { statusPill, formatDate, formatBudget } from '../utils/statusHelpers.js'
import { useAuthStore } from '../stores/auth'

const router    = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

const summary    = ref({ totales: null, proyectos: [] })
const loading    = ref(true)
const fetchError = ref(null)
const activeFilter = ref('all')

const reports        = ref([])
const loadingReports = ref(true)
const reportDetail   = ref(null)

const showCreateModal = ref(false)
const creating        = ref(false)
const createError     = ref(null)

const filters = computed(() => [
  { key: 'all',       label: t('reports.view.filters.all') },
  { key: 'active',    label: t('reports.view.filters.active') },
  { key: 'last30',    label: t('reports.view.filters.last30') },
  { key: 'completed', label: t('reports.view.filters.completed') },
])

// ── API ────────────────────────────────────────────────────────────────────
function authHeaders() {
  return {
    Authorization: `Bearer ${authStore.token}`,
    'X-Company-ID': String(authStore.idEmpresa),
  }
}

async function loadSummary() {
  loading.value = true
  fetchError.value = null
  try {
    const res = await fetch('/api/reports/summary', { headers: authHeaders() })
    if (!res.ok) throw new Error(`Error ${res.status}`)
    const json = await res.json()
    summary.value = json.data ?? { totales: null, proyectos: [] }
  } catch (e) {
    fetchError.value = e.message
  } finally {
    loading.value = false
  }
}

async function loadReports() {
  loadingReports.value = true
  try {
    const res = await fetch('/api/reports', { headers: authHeaders() })
    if (!res.ok) throw new Error()
    reports.value = (await res.json()).data ?? []
  } catch {
    reports.value = []
  } finally {
    loadingReports.value = false
  }
}

onMounted(() => {
  loadSummary()
  loadReports()
})

// ── Computed ───────────────────────────────────────────────────────────────
const displayedProjects = computed(() => {
  const list = summary.value.proyectos
  if (activeFilter.value === 'active')
    return list.filter(p => p.estado === 'EN_PROGRESO' || p.estado === 'PLANIFICADO' || p.estado === 'PAUSADO')
  if (activeFilter.value === 'completed')
    return list.filter(p => p.estado === 'COMPLETADO')
  if (activeFilter.value === 'last30') {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    return list.filter(p => new Date(p.fecha_inicio) >= cutoff)
  }
  return list
})

const totales = computed(() => summary.value.totales ?? {
  total_proyectos: 0,
  proyectos_activos: 0,
  proyectos_completados: 0,
  presupuesto_total: 0,
})

const avgProgress = computed(() => {
  const list = summary.value.proyectos
  if (!list.length) return 0
  return Math.round(list.reduce((acc, p) => acc + Number(p.progreso_actual), 0) / list.length)
})

const budgetPct = computed(() => {
  const list = summary.value.proyectos
  const planificado = list.reduce((s, p) => s + Number(p.presupuesto_planificado), 0)
  const real = list.reduce((s, p) => s + Number(p.presupuesto_real), 0)
  if (!planificado) return 0
  return Math.min(Math.round((real / planificado) * 100), 100)
})

const taskStats = computed(() => {
  const list = summary.value.proyectos
  const total       = list.reduce((s, p) => s + Number(p.total_tareas), 0)
  const completadas = list.reduce((s, p) => s + Number(p.tareas_completadas), 0)
  const enProgreso  = list.reduce((s, p) => s + Number(p.tareas_en_progreso), 0)
  const pendientes  = list.reduce((s, p) => s + Number(p.tareas_pendientes), 0)
  return { total, completadas, enProgreso, pendientes }
})

const completionRate = computed(() => {
  const t = totales.value.total_proyectos
  if (!t) return 0
  return Math.round((totales.value.proyectos_completados / t) * 100)
})

const budgetBadgeClass = computed(() =>
  budgetPct.value > 90 ? 'kpi-badge--red' : budgetPct.value > 70 ? 'kpi-badge--purple' : 'kpi-badge--green'
)

function goToDetail(id) {
  router.push({ name: 'report-detail', params: { id } })
}

function onViewMetrics(id) {
  reportDetail.value = null
  goToDetail(id)
}

const chartPoints = computed(() => {
  const list = summary.value.proyectos
  if (!list.length) return []
  const n = list.length
  return list.map((p, i) => {
    const x = n === 1 ? 300 : Math.round((i / (n - 1)) * 600)
    const bTotal = Number(p.presupuesto_total)
    const bReal  = Number(p.presupuesto_real)
    const bPct   = bTotal > 0 ? Math.min(Math.round((bReal / bTotal) * 100), 100) : 0
    const prog  = Number(p.progreso_actual)
    return {
      x,
      budgetY:   Math.round(155 - (bPct / 100) * 150),
      progressY: Math.round(155 - (prog / 100) * 150),
      name: p.nombre,
      budgetPct:   bPct,
      progressPct: prog,
    }
  })
})

function svgLinePath(pts, yKey) {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p[yKey]}`).join(' ')
}

function svgAreaPath(pts, yKey) {
  const line = svgLinePath(pts, yKey)
  return `${line} L${pts[pts.length - 1].x},160 L${pts[0].x},160 Z`
}

function truncName(name) {
  return name.length > 13 ? name.slice(0, 12) + '…' : name
}

function projectNameById(id) {
  return summary.value.proyectos.find(p => p.id_proyecto === id)?.nombre ?? '—'
}

function openReportDetail(r) {
  reportDetail.value = r
}

function openCreateModal() {
  createError.value = null
  showCreateModal.value = true
}

function closeCreateModal() {
  showCreateModal.value = false
}

async function submitCreate(payload) {
  creating.value = true
  createError.value = null
  try {
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json()
      createError.value = err.message ?? t('reports.createModal.errorFailed')
      return
    }
    closeCreateModal()
    await Promise.all([loadSummary(), loadReports()])
  } catch {
    createError.value = t('reports.createModal.errorNetwork')
  } finally {
    creating.value = false
  }
}
</script>

<style scoped>
/* ─── Layout ─────────────────────────────────────────────────────────────── */
.reports-root {
  min-height: 100vh;
  background: transparent;
  padding-top: 56px;
}

.reports-layout {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 0;
  max-width: 1440px;
  margin: 0 auto;
  min-height: calc(100vh - 56px);
}

/* ─── Main Panel ─────────────────────────────────────────────────────────── */
.main-panel {
  padding: 32px 32px 48px;
  border-right: 1px solid #1e1e1e;
  overflow-y: auto;
  background: rgba(10, 10, 10, 0.92);
}

/* ─── Header ─────────────────────────────────────────────────────────────── */
.rep-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.rep-title {
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.4rem, 3vw, 2rem);
  font-weight: 700;
  color: #faf8f5;
  margin: 0 0 4px;
}

.rep-subtitle {
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  color: var(--TextMuted);
  margin: 0;
}

.rep-header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-outline {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: #111111;
  border: 1px solid #2a2a2a;
  color: #888;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color .2s, color .2s;
}

.btn-outline:hover {
  border-color: #c9a962;
  color: #c9a962;
}

.icon14 { width: 14px; height: 14px; }
.icon10 { width: 10px; height: 10px; }

/* ─── Filters ────────────────────────────────────────────────────────────── */
.filter-bar {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
  border-bottom: 1px solid #1a1a1a;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 6px 0;
  background: #111111;
  border: none;
  border-bottom: 2px solid transparent;
  color: #555;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: color .2s, border-color .2s;
}

.filter-btn:hover { color: #aaa; }

.filter-btn.active {
  border-bottom-color: #c9a962;
  color: #c9a962;
}

/* ─── KPI Cards ──────────────────────────────────────────────────────────── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 28px;
}

.kpi-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  background: #111111;
  border: 1px solid #1e1e1e;
  transition: border-color .2s;
}

.kpi-card:hover {
  border-color: rgba(201,169,98,0.3);
}

.kpi-label {
  font-family: 'Manrope', sans-serif;
  font-size: 10px;
  font-weight: 700;
  color: #555;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.kpi-value {
  font-family: 'Playfair Display', serif;
  font-size: 1.8rem;
  font-weight: 700;
  color: #faf8f5;
  line-height: 1;
}

.kpi-badge {
  display: inline-block;
  padding: 3px 10px;
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  font-weight: 700;
  border-radius: 2px;
  width: fit-content;
}

.kpi-badge--green  { background: rgba(74,222,128,0.1);  color: #4ade80; }
.kpi-badge--purple { background: rgba(167,139,250,0.1); color: #a78bfa; }
.kpi-badge--red    { background: rgba(251,113,133,0.1); color: #fb7185; }

/* ─── Section blocks ─────────────────────────────────────────────────────── */
.section-block {
  background: #111111;
  border: 1px solid #1e1e1e;
  padding: 20px;
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 700;
  color: #888;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.view-all-btn {
  background: none;
  border: none;
  color: #c9a962;
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity .2s;
}
.view-all-btn:hover { opacity: 1; }

/* ─── Table ──────────────────────────────────────────────────────────────── */
.rep-table-wrap { overflow-x: auto; }

.rep-table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
}

.rep-table th {
  text-align: left;
  color: #444;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 10px;
  padding: 0 12px 10px 0;
  border-bottom: 1px solid #1a1a1a;
}

.rep-row {
  cursor: pointer;
  transition: background .15s;
}

.rep-row:hover td { background: #111111; }

.rep-table td {
  padding: 12px 12px 12px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  color: #aaa;
  vertical-align: middle;
}

.td-name { color: #e8e4de; font-weight: 500; }

.proj-badge {
  background: #111111;
  border: 1px solid #222;
  padding: 3px 8px;
  font-size: 11px;
  color: #777;
}

.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  font-weight: 600;
}

.status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.td-date { color: #555; font-size: 11px; }

.progress-cell { display: flex; align-items: center; gap: 7px; }
.prog-track { flex: 1; height: 4px; background: #1a1a1a; border-radius: 2px; overflow: hidden; min-width: 60px; }
.prog-fill  { height: 100%; background: linear-gradient(90deg, #b27f2a, #c9a962); border-radius: 2px; }
.prog-pct   { font-family: 'Manrope', sans-serif; font-size: 10px; color: #666; min-width: 30px; }

.type-tag {
  font-family: 'Manrope', sans-serif;
  font-size: 10px;
  font-weight: 700;
  color: #a78bfa;
  background: rgba(167,139,250,0.08);
  padding: 2px 7px;
  letter-spacing: 0.04em;
}

.section-count {
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  color: #444;
}

.open-btn {
  background: none;
  border: none;
  color: #555;
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  cursor: pointer;
  transition: color .2s;
}
.open-btn:hover { color: #c9a962; }

.empty-row {
  text-align: center;
  color: #444;
  padding: 24px 0 !important;
  font-size: 12px;
}

/* Skeleton */
.table-skeleton { display: flex; flex-direction: column; gap: 10px; }
.table-skel-row {
  display: flex;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #111;
}
.skel-cell {
  height: 12px;
  background: #1a1a1a;
  border-radius: 2px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

/* ─── Chart ──────────────────────────────────────────────────────────────── */
.chart-legend { display: flex; gap: 14px; }
.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  color: #555;
}
.leg-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.leg-dot.gold { background: #c9a962; }
.leg-dot.blue { background: #60a5fa; }

.chart-wrap {
  display: flex;
  gap: 8px;
  align-items: stretch;
}

.y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-bottom: 20px;
}

.y-axis span {
  font-family: 'Manrope', sans-serif;
  font-size: 9px;
  color: #333;
}

.chart-area { flex: 1; }

.perf-svg {
  width: 100%;
  height: 160px;
  display: block;
}

.x-axis {
  display: flex;
  justify-content: space-between;
  padding: 6px 0 0;
}

.x-axis span {
  font-family: 'Manrope', sans-serif;
  font-size: 10px;
  color: #333;
}

/* ─── Responsive ─────────────────────────────────────────────────────────── */
@media (max-width: 1100px) {
  .reports-layout { grid-template-columns: 1fr; }
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .main-panel { padding: 20px 16px 32px; }
  .rep-header { flex-direction: column; }
  .kpi-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
  .rep-header-actions { width: 100%; }
}
</style>
