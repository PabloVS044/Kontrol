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
      <aside class="ctx-panel">
        <div class="ctx-top">
          <span class="ctx-badge">{{ $t('reports.ai.badge') }}</span>
          <label class="toggle">
            <input type="checkbox" v-model="aiEnabled" />
            <span class="toggle-track"><span class="toggle-thumb"></span></span>
          </label>
        </div>

        <div class="ctx-section">
          <p class="ctx-label">{{ $t('reports.ai.insights') }}</p>
          <p class="ctx-insight">{{ $t('reports.ai.insightText') }}</p>
        </div>

        <div class="ctx-divider"></div>

        <div class="ctx-section">
          <p class="ctx-label">{{ $t('reports.ai.askLabel') }}</p>
          <div class="ctx-input-wrap">
            <input class="ctx-input" :placeholder="$t('reports.ai.askPlaceholder')" disabled />
          </div>
        </div>

        <div class="ctx-section">
          <p class="ctx-label">{{ $t('reports.ai.actionsLabel') }}</p>
          <div class="ctx-actions">
            <Button :label="$t('reports.ai.action1')" />
            <Button :label="$t('reports.ai.action2')" />
            <Button :label="$t('reports.ai.action3')" />
          </div>
        </div>

        <div class="ctx-divider"></div>

        <!-- Budget Donut -->
        <div class="ctx-section">
          <p class="ctx-label">{{ $t('reports.ai.budgetUsageLabel') }}</p>
          <div class="donut-wrap">
            <DonutChart
              :pct="budgetPct"
              color="#c9a962"
              :size="80" :radius="30" :stroke-width="10"
              :label="budgetPct + '%'" label-color="#fff" :label-font-size="13" :label-offset-y="4"
              display-width="90px"
            />
          </div>
          <div class="donut-legend">
            <span class="dl-item"><span class="dl-dot gold"></span>{{ $t('reports.ai.used', { pct: budgetPct }) }}</span>
            <span class="dl-item"><span class="dl-dot dim"></span>{{ $t('reports.ai.remaining', { pct: 100 - budgetPct }) }}</span>
          </div>
        </div>

        <div class="ctx-divider"></div>

        <!-- Task Completion -->
        <div class="ctx-section">
          <p class="ctx-label">{{ $t('reports.ai.taskCompletionLabel') }}</p>
          <div class="bar-list">
            <div class="bar-item">
              <div class="bar-track"><div class="bar-fill gold" :style="{ width: barPct(taskStats.completadas) }"></div></div>
              <span class="bar-val">{{ taskStats.completadas }}</span>
            </div>
            <div class="bar-item">
              <div class="bar-track"><div class="bar-fill blue" :style="{ width: barPct(taskStats.enProgreso) }"></div></div>
              <span class="bar-val">{{ taskStats.enProgreso }}</span>
            </div>
            <div class="bar-item">
              <div class="bar-track"><div class="bar-fill dim" :style="{ width: barPct(taskStats.pendientes) }"></div></div>
              <span class="bar-val">{{ taskStats.pendientes }}</span>
            </div>
          </div>
          <div class="bar-labels">
            <span>{{ $t('reports.ai.completed') }}</span>
            <span>{{ $t('reports.ai.inProgress') }}</span>
            <span>{{ $t('reports.ai.pending') }}</span>
          </div>
        </div>

      </aside>
    </div>

    <!-- ── REPORT DETAIL MODAL ──────────────────────────────── -->
    <div v-if="reportDetail" class="modal-overlay" @click.self="reportDetail = null">
      <div class="modal-box">
        <div class="modal-header">
          <span class="modal-title">{{ reportDetail.titulo }}</span>
          <button class="modal-close" @click="reportDetail = null">✕</button>
        </div>
        <div class="rdetail-body">
          <div class="rdetail-row">
            <span class="rdetail-label">{{ $t('reports.reportModal.labelType') }}</span>
            <span class="type-tag">{{ reportDetail.tipo }}</span>
          </div>
          <div class="rdetail-row">
            <span class="rdetail-label">{{ $t('reports.reportModal.labelProject') }}</span>
            <span class="rdetail-val">{{ projectNameById(reportDetail.id_proyecto) }}</span>
          </div>
          <div class="rdetail-row">
            <span class="rdetail-label">{{ $t('reports.reportModal.labelDate') }}</span>
            <span class="rdetail-val">{{ formatDate(reportDetail.fecha_generacion) }}</span>
          </div>
          <div v-if="reportDetail.contenido_url" class="rdetail-row">
            <span class="rdetail-label">{{ $t('reports.reportModal.labelContentUrl') }}</span>
            <a :href="reportDetail.contenido_url" target="_blank" rel="noopener" class="rdetail-link">
              {{ $t('reports.reportModal.openDocument') }}
            </a>
          </div>
          <div v-else class="rdetail-row">
            <span class="rdetail-label">{{ $t('reports.reportModal.labelContentUrl') }}</span>
            <span class="rdetail-val dim">{{ $t('reports.reportModal.notProvided') }}</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-outline" @click="reportDetail = null">{{ $t('reports.reportModal.close') }}</button>
          <button class="btn-outline" @click="goToDetail(reportDetail.id_proyecto); reportDetail = null">
            {{ $t('reports.reportModal.viewMetrics') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── CREATE REPORT MODAL ──────────────────────────────── -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="closeCreateModal">
      <div class="modal-box">
        <div class="modal-header">
          <span class="modal-title">{{ $t('reports.createModal.title') }}</span>
          <button class="modal-close" @click="closeCreateModal">✕</button>
        </div>
        <form class="modal-form" @submit.prevent="submitCreate">
          <div class="form-group">
            <label class="form-label">{{ $t('reports.createModal.labelTitle') }}</label>
            <input v-model="createForm.titulo" class="form-input" :placeholder="$t('reports.createModal.titlePlaceholder')" required maxlength="200" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('reports.createModal.labelType') }}</label>
            <select v-model="createForm.tipo" class="form-input" required>
              <option value="">{{ $t('reports.createModal.selectType') }}</option>
              <option value="AVANCE">{{ $t('reports.createModal.typeProgress') }}</option>
              <option value="PRESUPUESTO">{{ $t('reports.createModal.typeBudget') }}</option>
              <option value="INCIDENTE">{{ $t('reports.createModal.typeIncident') }}</option>
              <option value="CONSOLIDADO">{{ $t('reports.createModal.typeConsolidated') }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('reports.createModal.labelProject') }}</label>
            <select v-model="createForm.id_proyecto" class="form-input" required>
              <option value="">{{ $t('reports.createModal.selectProject') }}</option>
              <option v-for="p in summary.proyectos" :key="p.id_proyecto" :value="p.id_proyecto">{{ p.nombre }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('reports.createModal.labelUrl') }} <span class="form-optional">{{ $t('reports.createModal.optional') }}</span></label>
            <input v-model="createForm.contenido_url" class="form-input" :placeholder="$t('reports.createModal.urlPlaceholder')" type="url" />
          </div>
          <p v-if="createError" class="form-error">{{ createError }}</p>
          <div class="modal-footer">
            <button type="button" class="btn-outline" @click="closeCreateModal">{{ $t('reports.createModal.cancel') }}</button>
            <button type="submit" class="btn-primary" :disabled="creating">
              {{ creating ? $t('reports.createModal.creating') : $t('reports.createModal.create') }}
            </button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppNavbar  from '../components/AppNavbar.vue'
import Button     from '../components/UI/Button/Button.vue'
import DonutChart from '../components/UI/DonutChart/DonutChart.vue'
import { statusPill, formatDate, formatBudget } from '../utils/statusHelpers.js'
import { useAuthStore } from '../stores/auth'

const router    = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

const summary    = ref({ totales: null, proyectos: [] })
const loading    = ref(true)
const fetchError = ref(null)
const activeFilter = ref('all')
const aiEnabled    = ref(true)

const reports        = ref([])
const loadingReports = ref(true)
const reportDetail   = ref(null)

const showCreateModal = ref(false)
const creating        = ref(false)
const createError     = ref(null)
const createForm      = ref({ titulo: '', tipo: '', id_proyecto: '', contenido_url: '' })

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

function barPct(n) {
  return taskStats.value.total ? Math.round((n / taskStats.value.total) * 100) + '%' : '0%'
}

function goToDetail(id) {
  router.push({ name: 'report-detail', params: { id } })
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
  createForm.value = { titulo: '', tipo: '', id_proyecto: '', contenido_url: '' }
  createError.value = null
  showCreateModal.value = true
}

function closeCreateModal() {
  showCreateModal.value = false
}

async function submitCreate() {
  creating.value = true
  createError.value = null
  try {
    const body = {
      titulo: createForm.value.titulo,
      tipo: createForm.value.tipo,
      id_proyecto: Number(createForm.value.id_proyecto),
    }
    if (createForm.value.contenido_url) body.contenido_url = createForm.value.contenido_url
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
  background: rgba(10,10,10,0.82);
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
  background: transparent;
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
  background: transparent;
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
  background: rgba(255,255,255,0.03);
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
  background: rgba(255,255,255,0.03);
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

.rep-row:hover td { background: rgba(201,169,98,0.05); }

.rep-table td {
  padding: 12px 12px 12px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  color: #aaa;
  vertical-align: middle;
}

.td-name { color: #e8e4de; font-weight: 500; }

.proj-badge {
  background: rgba(255,255,255,0.04);
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

/* ─── Context Panel ──────────────────────────────────────────────────────── */
.ctx-panel {
  padding: 24px 20px;
  border-left: 1px solid #1e1e1e;
  background: rgba(10,10,10,0.9);
  overflow-y: auto;
}

.ctx-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.ctx-badge {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  font-weight: 700;
  color: #c9a962;
  letter-spacing: 0.04em;
}

/* Toggle */
.toggle { display: flex; align-items: center; cursor: pointer; }
.toggle input { display: none; }
.toggle-track {
  width: 30px;
  height: 16px;
  background: #1e1e1e;
  border-radius: 8px;
  position: relative;
  transition: background .2s;
}
.toggle input:checked + .toggle-track { background: rgba(201,169,98,0.3); }
.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #444;
  transition: transform .2s, background .2s;
}
.toggle input:checked + .toggle-track .toggle-thumb {
  transform: translateX(14px);
  background: #c9a962;
}

.ctx-section { margin-bottom: 16px; }

.ctx-label {
  font-family: 'Manrope', sans-serif;
  font-size: 9px;
  font-weight: 700;
  color: #444;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin: 0 0 8px;
}

.ctx-insight {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  color: #666;
  line-height: 1.7;
  margin: 0;
}

.ctx-divider {
  height: 1px;
  background: #141414;
  margin: 16px 0;
}

.ctx-input-wrap { margin-top: 4px; }
.ctx-input {
  width: 100%;
  padding: 8px 10px;
  background: rgba(255,255,255,0.03);
  border: 1px solid #1e1e1e;
  color: #555;
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  outline: none;
  cursor: not-allowed;
  box-sizing: border-box;
}

.ctx-actions :deep(.btn) {
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

.ctx-actions :deep(.btn:hover) {
  border-color: rgba(201,169,98,0.3);
  color: #c9a962;
}

/* ─── Donut Chart ────────────────────────────────────────────────────────── */
.donut-wrap {
  display: flex;
  justify-content: center;
  margin: 8px 0;
}


.donut-legend {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.dl-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: 'Manrope', sans-serif;
  font-size: 10px;
  color: #555;
}

.dl-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.dl-dot.gold { background: #c9a962; }
.dl-dot.dim  { background: #333; }

/* ─── Bar Chart ──────────────────────────────────────────────────────────── */
.bar-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 6px; }

.bar-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bar-track {
  flex: 1;
  height: 6px;
  background: #1a1a1a;
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 3px;
}
.bar-fill.gold { background: #c9a962; }
.bar-fill.blue { background: #60a5fa; }
.bar-fill.dim  { background: #444;    }

.bar-val {
  font-family: 'Manrope', sans-serif;
  font-size: 10px;
  color: #555;
  min-width: 24px;
  text-align: right;
}

.bar-labels {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bar-labels span {
  font-family: 'Manrope', sans-serif;
  font-size: 10px;
  color: #444;
  padding-top: 2px;
}

/* ─── Create Report Modal ────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal-box {
  background: #111;
  border: 1px solid #2a2a2a;
  width: 100%;
  max-width: 440px;
  padding: 24px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-title {
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #e8e4de;
  letter-spacing: 0.04em;
}

.modal-close {
  background: none;
  border: none;
  color: #555;
  font-size: 14px;
  cursor: pointer;
  line-height: 1;
  transition: color .2s;
}
.modal-close:hover { color: #ccc; }

.modal-form { display: flex; flex-direction: column; gap: 14px; }

.form-group { display: flex; flex-direction: column; gap: 5px; }

.form-label {
  font-family: 'Manrope', sans-serif;
  font-size: 10px;
  font-weight: 700;
  color: #555;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.form-optional {
  font-weight: 400;
  color: #444;
  text-transform: none;
  letter-spacing: 0;
}

.form-input {
  padding: 8px 10px;
  background: rgba(255,255,255,0.03);
  border: 1px solid #2a2a2a;
  color: #ccc;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  transition: border-color .2s;
}
.form-input:focus { border-color: rgba(201,169,98,0.4); }
.form-input option { background: #111; }

/* ─── Report Detail Modal ────────────────────────────────────────────────── */
.rdetail-body { display: flex; flex-direction: column; gap: 0; margin-bottom: 20px; }
.rdetail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #1a1a1a;
}
.rdetail-label {
  font-family: 'Manrope', sans-serif;
  font-size: 10px;
  font-weight: 700;
  color: #555;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.rdetail-val {
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  color: #aaa;
}
.rdetail-val.dim { color: #444; }
.rdetail-link {
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  color: #c9a962;
  text-decoration: none;
  transition: opacity .2s;
}
.rdetail-link:hover { opacity: 0.7; }

.form-error {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  color: #fb7185;
  margin: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.btn-primary {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: rgba(201,169,98,0.12);
  border: 1px solid rgba(201,169,98,0.3);
  color: #c9a962;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background .2s;
}
.btn-primary:hover:not(:disabled) { background: rgba(201,169,98,0.22); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* ─── Responsive ─────────────────────────────────────────────────────────── */
@media (max-width: 1100px) {
  .reports-layout { grid-template-columns: 1fr; }
  .ctx-panel { border-left: none; border-top: 1px solid #181818; }
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .main-panel { padding: 20px 16px 32px; }
  .rep-header { flex-direction: column; }
  .kpi-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
  .rep-header-actions { width: 100%; }
}
</style>
