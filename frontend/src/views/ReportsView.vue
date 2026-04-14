<template>
  <div class="reports-root">
    <AppNavbar />

    <div class="reports-layout">

      <!-- ── MAIN PANEL ─────────────────────────────────────────── -->
      <div class="main-panel">

        <!-- Header -->
        <div class="rep-header">
          <div class="rep-header-left">
            <h1 class="rep-title">Reports Center</h1>
            <p class="rep-subtitle">Analytics and performance overview for all your projects</p>
          </div>
          <div class="rep-header-actions">
            <button class="btn-outline">
              <svg class="icon14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="square"/>
              </svg>
              Create Report
            </button>
            <button class="btn-outline">
              <svg class="icon14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.3"/>
                <path d="M5 7l1.5 1.5L9.5 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="square"/>
              </svg>
              Generate with AI
            </button>
            <button class="btn-outline">
              <svg class="icon14" viewBox="0 0 14 14" fill="none">
                <path d="M7 10V2M4 7l3 3 3-3M2 12h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="square"/>
              </svg>
              Export
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
            <svg class="icon10 chevron" viewBox="0 0 10 10" fill="none">
              <path d="M3 4l2 2 2-2" stroke="currentColor" stroke-width="1.2" stroke-linecap="square"/>
            </svg>
          </button>
        </div>

        <!-- KPI Cards -->
        <div class="kpi-grid">
          <Card title="32.5%" subtitle="ROI Growth"
            back="rgba(255,255,255,0.03)" titleColor="#faf8f5"
            borderColor="#1e1e1e" shadowColor="rgba(0,0,0,0.25)">
            <Pill label="+12.3%" btnColor="rgba(74,222,128,0.1)" circleColor="#4ade80" textColor="#4ade80" />
          </Card>

          <Card :title="loading ? '—' : String(projects.length)" subtitle="Active Projects"
            back="rgba(255,255,255,0.03)" titleColor="#faf8f5"
            borderColor="#1e1e1e" shadowColor="rgba(0,0,0,0.25)">
            <Pill label="+8.2%" btnColor="rgba(74,222,128,0.1)" circleColor="#4ade80" textColor="#4ade80" />
          </Card>

          <Card :title="loading ? '—' : String(completedCount)" subtitle="Completed"
            back="rgba(255,255,255,0.03)" titleColor="#faf8f5"
            borderColor="#1e1e1e" shadowColor="rgba(0,0,0,0.25)">
            <Pill label="+15" btnColor="rgba(167,139,250,0.1)" circleColor="#a78bfa" textColor="#a78bfa" />
          </Card>

          <Card :title="loading ? '—' : formatBudget(totalBudget)" subtitle="Budget Total"
            back="rgba(255,255,255,0.03)" titleColor="#faf8f5"
            borderColor="#1e1e1e" shadowColor="rgba(0,0,0,0.25)">
            <Pill label="-2.1%" btnColor="rgba(251,113,133,0.1)" circleColor="#fb7185" textColor="#fb7185" />
          </Card>
        </div>

        <!-- Active Reports Table -->
        <div class="section-block">
          <div class="section-header">
            <span class="section-title">Active Reports</span>
            <button class="view-all-btn">View all reports →</button>
          </div>

          <div v-if="loading" class="table-skeleton">
            <div v-for="n in 4" :key="n" class="table-skel-row">
              <div class="skel-cell" style="width:30%"></div>
              <div class="skel-cell" style="width:20%"></div>
              <div class="skel-cell" style="width:15%"></div>
              <div class="skel-cell" style="width:20%"></div>
              <div class="skel-cell" style="width:15%"></div>
            </div>
          </div>

          <div v-else class="rep-table-wrap">
            <table class="rep-table">
              <thead>
                <tr>
                  <th>Report Name</th>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
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
                    <span class="proj-badge">{{ project.nombre }}</span>
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
                  <td class="td-action">
                    <button class="open-btn" @click.stop="goToDetail(project.id_proyecto)">
                      Open →
                    </button>
                  </td>
                </tr>
                <tr v-if="displayedProjects.length === 0">
                  <td colspan="5" class="empty-row">No projects found.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Performance Chart -->
        <div class="section-block">
          <div class="section-header">
            <span class="section-title">Project Performance</span>
            <div class="chart-legend">
              <span class="legend-item"><span class="leg-dot gold"></span> Budget</span>
              <span class="legend-item"><span class="leg-dot blue"></span> Progress</span>
            </div>
          </div>

          <div class="chart-wrap">
            <!-- Y axis labels -->
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
                <!-- Grid lines -->
                <line x1="0" y1="0" x2="600" y2="0" stroke="#1f1f1f" stroke-width="1"/>
                <line x1="0" y1="40" x2="600" y2="40" stroke="#1f1f1f" stroke-width="1"/>
                <line x1="0" y1="80" x2="600" y2="80" stroke="#1f1f1f" stroke-width="1"/>
                <line x1="0" y1="120" x2="600" y2="120" stroke="#1f1f1f" stroke-width="1"/>
                <line x1="0" y1="160" x2="600" y2="160" stroke="#1f1f1f" stroke-width="1"/>
                <!-- Gold area -->
                <path d="M0,140 C60,120 120,100 180,80 C240,60 300,50 360,40 C420,30 480,20 600,15 L600,160 L0,160 Z" fill="url(#lineGrad)"/>
                <!-- Gold line -->
                <path d="M0,140 C60,120 120,100 180,80 C240,60 300,50 360,40 C420,30 480,20 600,15" fill="none" stroke="#c9a962" stroke-width="2"/>
                <!-- Blue area -->
                <path d="M0,155 C60,150 120,140 180,130 C240,120 300,105 360,90 C420,75 480,60 600,45 L600,160 L0,160 Z" fill="url(#lineGrad2)"/>
                <!-- Blue line -->
                <path d="M0,155 C60,150 120,140 180,130 C240,120 300,105 360,90 C420,75 480,60 600,45" fill="none" stroke="#60a5fa" stroke-width="1.5" stroke-dasharray="4 3"/>
                <!-- Dots on gold line -->
                <circle cx="0" cy="140" r="3" fill="#c9a962"/>
                <circle cx="120" cy="100" r="3" fill="#c9a962"/>
                <circle cx="240" cy="60" r="3" fill="#c9a962"/>
                <circle cx="360" cy="40" r="3" fill="#c9a962"/>
                <circle cx="480" cy="20" r="3" fill="#c9a962"/>
                <circle cx="600" cy="15" r="3" fill="#c9a962"/>
              </svg>
              <div class="x-axis">
                <span>Jan</span><span>Feb</span><span>Mar</span>
                <span>Apr</span><span>May</span><span>Jun</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- ── CONTEXT PANEL ──────────────────────────────────────── -->
      <aside class="ctx-panel">
        <div class="ctx-top">
          <span class="ctx-badge">Reports AI</span>
          <label class="toggle">
            <input type="checkbox" v-model="aiEnabled" />
            <span class="toggle-track"><span class="toggle-thumb"></span></span>
          </label>
        </div>

        <div class="ctx-section">
          <p class="ctx-label">AI Insights</p>
          <p class="ctx-insight">
            Based on recent data, your top-performing project is consuming
            72% of the budget with an estimated 12.5% ROI. Consider
            reallocating budget to high-performing projects.
          </p>
        </div>

        <div class="ctx-divider"></div>

        <div class="ctx-section">
          <p class="ctx-label">Ask something, performance, ideas…</p>
          <div class="ctx-input-wrap">
            <input class="ctx-input" placeholder="Type your question…" disabled />
          </div>
        </div>

        <div class="ctx-section">
          <p class="ctx-label">Actions</p>
          <div class="ctx-actions">
            <Button label="Quick Summary of Q1 Project Launch" />
            <Button label="Analyze Budget Deviation" />
            <Button label="Compare to Last Year" />
          </div>
        </div>

        <div class="ctx-divider"></div>

        <!-- Budget Donut -->
        <div class="ctx-section">
          <p class="ctx-label">Budget Usage</p>
          <div class="donut-wrap">
            <svg viewBox="0 0 80 80" class="donut-svg">
              <circle cx="40" cy="40" r="30" fill="none" stroke="#1f1f1f" stroke-width="10"/>
              <circle
                cx="40" cy="40" r="30" fill="none"
                stroke="#c9a962" stroke-width="10"
                stroke-dasharray="135.7 188.5"
                stroke-dashoffset="47.1"
                stroke-linecap="butt"
                transform="rotate(-90 40 40)"
              />
              <text x="40" y="44" text-anchor="middle" fill="#fff" font-size="13" font-family="Manrope" font-weight="700">72%</text>
            </svg>
          </div>
          <div class="donut-legend">
            <span class="dl-item"><span class="dl-dot gold"></span>Used (72%)</span>
            <span class="dl-item"><span class="dl-dot dim"></span>Remaining (28%)</span>
          </div>
        </div>

        <div class="ctx-divider"></div>

        <!-- Task Completion -->
        <div class="ctx-section">
          <p class="ctx-label">Task Completion</p>
          <div class="bar-list">
            <div class="bar-item">
              <div class="bar-track"><div class="bar-fill gold" style="width:75%"></div></div>
              <span class="bar-val">245</span>
            </div>
            <div class="bar-item">
              <div class="bar-track"><div class="bar-fill blue" style="width:30%"></div></div>
              <span class="bar-val">42</span>
            </div>
            <div class="bar-item">
              <div class="bar-track"><div class="bar-fill dim" style="width:18%"></div></div>
              <span class="bar-val">18</span>
            </div>
          </div>
          <div class="bar-labels">
            <span>Completed</span>
            <span>In Progress</span>
            <span>Pending</span>
          </div>
        </div>

      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppNavbar from '../components/AppNavbar.vue'
import Card   from '../components/UI/Card/Card.vue'
import Pill   from '../components/UI/Pill/Pill.vue'
import Button from '../components/UI/Button/Button.vue'
import { useAuthStore } from '../stores/auth'

const router   = useRouter()
const authStore = useAuthStore()

const projects   = ref([])
const loading    = ref(true)
const fetchError = ref(null)
const activeFilter = ref('all')
const aiEnabled    = ref(true)

const filters = [
  { key: 'all',       label: 'All Projects' },
  { key: 'active',    label: 'Active' },
  { key: 'last30',    label: 'Last 30 Days' },
  { key: 'completed', label: 'Completed' },
]

// ── API ────────────────────────────────────────────────────────────────────
function authHeader() {
  return { Authorization: `Bearer ${authStore.token}` }
}

async function loadProjects() {
  loading.value = true
  fetchError.value = null
  try {
    const params = new URLSearchParams({ page: 1, limit: 50 })
    if (authStore.idEmpresa) params.set('id_empresa', authStore.idEmpresa)
    const res = await fetch(`/api/projects?${params}`, { headers: authHeader() })
    if (!res.ok) throw new Error(`Error ${res.status}`)
    const json = await res.json()
    projects.value = json.data ?? []
  } catch (e) {
    fetchError.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(loadProjects)

// ── Computed ───────────────────────────────────────────────────────────────
const displayedProjects = computed(() => {
  if (activeFilter.value === 'active') {
    return projects.value.filter(p => p.estado === 'EN_PROGRESO' || p.estado === 'PLANIFICADO' || p.estado === 'PAUSADO')
  }
  if (activeFilter.value === 'completed') {
    return projects.value.filter(p => p.estado === 'COMPLETADO')
  }
  if (activeFilter.value === 'last30') {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    return projects.value.filter(p => new Date(p.fecha_inicio) >= cutoff)
  }
  return projects.value
})

const completedCount = computed(() =>
  projects.value.filter(p => p.estado === 'COMPLETADO').length
)

const totalBudget = computed(() =>
  projects.value.reduce((sum, p) => sum + (parseFloat(p.presupuesto_total) || 0), 0)
)

// ── Helpers ────────────────────────────────────────────────────────────────
const STATUS_MAP = {
  PLANIFICADO: { label: 'Planned',     color: '#60a5fa', bg: 'rgba(96,165,250,0.1)'  },
  EN_PROGRESO: { label: 'In Progress', color: '#4ade80', bg: 'rgba(74,222,128,0.1)'  },
  PAUSADO:     { label: 'On Hold',     color: '#fb923c', bg: 'rgba(251,146,60,0.1)'  },
  COMPLETADO:  { label: 'Completed',   color: '#c9a962', bg: 'rgba(201,169,98,0.1)'  },
  CANCELADO:   { label: 'Cancelled',   color: '#fb7185', bg: 'rgba(251,113,133,0.1)' },
}

function statusLabel(estado) { return STATUS_MAP[estado]?.label ?? estado }
function statusPill(estado)  { return STATUS_MAP[estado] ?? { label: estado, color: '#888', bg: 'rgba(255,255,255,0.06)' } }

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatBudget(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function goToDetail(id) {
  router.push({ name: 'report-detail', params: { id } })
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
  gap: 6px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  background: rgba(255,255,255,0.03);
  border: 1px solid #1e1e1e;
  color: #666;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  cursor: pointer;
  transition: all .2s;
}

.filter-btn:hover { border-color: rgba(255,255,255,0.15); color: #aaa; }

.filter-btn.active {
  background: rgba(201,169,98,0.1);
  border-color: rgba(201,169,98,0.4);
  color: #c9a962;
}

.chevron { opacity: 0.5; }

/* ─── KPI Cards ──────────────────────────────────────────────────────────── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 28px;
}

.kpi-grid :deep(.card) {
  max-width: none;
  width: 100%;
  margin: 0;
  border-radius: 0;
  padding: 16px;
  gap: 10px;
  transition: border-color .2s, background .2s;
}

.kpi-grid :deep(.card:hover) {
  border-color: rgba(201,169,98,0.3) !important;
}

.kpi-grid :deep(.card-title) {
  font-family: 'Playfair Display', serif;
  font-size: 1.6rem;
  line-height: 1;
}

.kpi-grid :deep(.card-subtitle) {
  font-size: 11px;
  color: var(--TextMuted);
  font-family: 'Manrope', sans-serif;
}

.kpi-grid :deep(.pill) {
  margin-top: 4px;
}

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

.donut-svg { width: 90px; height: 90px; }

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
