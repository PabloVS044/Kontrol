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
                <Pill
                  :label="statusPill(project.estado).label"
                  :btnColor="statusPill(project.estado).bg"
                  :circleColor="statusPill(project.estado).color"
                  :textColor="statusPill(project.estado).color"
                />
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
                <span class="meta-value">{{ mock.budgetUsedPct }}%</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Project ID</span>
                <span class="meta-value dim">#{{ project.id_proyecto }}</span>
              </div>
            </div>

            <!-- Overall progress bar -->
            <div class="overall-progress">
              <div class="op-track">
                <div class="op-fill" :style="{ width: mock.budgetUsedPct + '%' }"></div>
              </div>
              <span class="op-label">{{ mock.budgetUsedPct }}% complete</span>
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
              <span class="card-tag">Q{{ mock.quarter }} {{ mock.year }}</span>
            </div>
            <div class="budget-body">
              <div class="donut-wrap">
                <svg viewBox="0 0 80 80" class="donut-svg">
                  <circle cx="40" cy="40" r="28" fill="none" stroke="#181818" stroke-width="10"/>
                  <circle
                    cx="40" cy="40" r="28" fill="none"
                    stroke="#c9a962" stroke-width="10"
                    :stroke-dasharray="`${175.9 * mock.budgetUsedPct / 100} 175.9`"
                    stroke-dashoffset="44"
                    stroke-linecap="butt"
                    transform="rotate(-90 40 40)"
                  />
                  <text x="40" y="43" text-anchor="middle" fill="#c9a962" font-size="11" font-family="Manrope" font-weight="700">{{ mock.budgetUsedPct }}%</text>
                  <text x="40" y="53" text-anchor="middle" fill="#555" font-size="6" font-family="Manrope">used</text>
                </svg>
              </div>
              <div class="budget-stats">
                <div class="bstat">
                  <span class="bstat-val gold">{{ formatBudget(project.presupuesto_total) }}</span>
                  <span class="bstat-label">Total Budget</span>
                </div>
                <div class="bstat">
                  <span class="bstat-val">{{ formatBudget(mock.budgetSpent) }}</span>
                  <span class="bstat-label">Spent</span>
                </div>
                <div class="bstat">
                  <span class="bstat-val" style="color:#4ade80">{{ formatBudget(mock.budgetRemaining) }}</span>
                  <span class="bstat-label">Remaining</span>
                </div>
              </div>
            </div>
            <div class="budget-bars">
              <div class="bb-item">
                <span class="bb-label">Operational</span>
                <div class="bb-track"><div class="bb-fill gold" :style="{ width: mock.opPct + '%' }"></div></div>
                <span class="bb-pct">{{ mock.opPct }}%</span>
              </div>
              <div class="bb-item">
                <span class="bb-label">Personnel</span>
                <div class="bb-track"><div class="bb-fill blue" :style="{ width: mock.personnelPct + '%' }"></div></div>
                <span class="bb-pct">{{ mock.personnelPct }}%</span>
              </div>
              <div class="bb-item">
                <span class="bb-label">Equipment</span>
                <div class="bb-track"><div class="bb-fill purple" :style="{ width: mock.equipPct + '%' }"></div></div>
                <span class="bb-pct">{{ mock.equipPct }}%</span>
              </div>
            </div>
          </div>

          <!-- Task Management -->
          <div class="detail-card">
            <div class="card-header">
              <span class="card-title">Task Management</span>
              <span class="card-tag">{{ mock.totalTasks }} tasks</span>
            </div>
            <div class="task-completion-circle">
              <svg viewBox="0 0 60 60" class="mini-donut">
                <circle cx="30" cy="30" r="22" fill="none" stroke="#181818" stroke-width="8"/>
                <circle
                  cx="30" cy="30" r="22" fill="none"
                  stroke="#4ade80" stroke-width="8"
                  :stroke-dasharray="`${138.2 * mock.tasksCompletedPct / 100} 138.2`"
                  stroke-dashoffset="34.5"
                  stroke-linecap="butt"
                  transform="rotate(-90 30 30)"
                />
                <text x="30" y="33" text-anchor="middle" fill="#fff" font-size="9" font-family="Manrope" font-weight="700">{{ mock.tasksCompletedPct }}%</text>
              </svg>
              <div class="task-summary">
                <span class="ts-big">{{ mock.tasksCompleted }} / {{ mock.totalTasks }}</span>
                <span class="ts-label">tasks completed</span>
              </div>
            </div>
            <div class="task-list">
              <div class="tl-row">
                <span class="tl-dot green"></span>
                <span class="tl-label">Completed</span>
                <div class="tl-bar-wrap">
                  <div class="tl-track"><div class="tl-fill green" :style="{ width: (mock.tasksCompleted / mock.totalTasks * 100) + '%' }"></div></div>
                </div>
                <span class="tl-val">{{ mock.tasksCompleted }}</span>
              </div>
              <div class="tl-row">
                <span class="tl-dot blue"></span>
                <span class="tl-label">In Progress</span>
                <div class="tl-bar-wrap">
                  <div class="tl-track"><div class="tl-fill blue" :style="{ width: (mock.tasksInProgress / mock.totalTasks * 100) + '%' }"></div></div>
                </div>
                <span class="tl-val">{{ mock.tasksInProgress }}</span>
              </div>
              <div class="tl-row">
                <span class="tl-dot gold"></span>
                <span class="tl-label">Pending</span>
                <div class="tl-bar-wrap">
                  <div class="tl-track"><div class="tl-fill gold" :style="{ width: (mock.tasksPending / mock.totalTasks * 100) + '%' }"></div></div>
                </div>
                <span class="tl-val">{{ mock.tasksPending }}</span>
              </div>
              <div class="tl-row">
                <span class="tl-dot red"></span>
                <span class="tl-label">Blocked</span>
                <div class="tl-bar-wrap">
                  <div class="tl-track"><div class="tl-fill red" :style="{ width: (mock.tasksBlocked / mock.totalTasks * 100) + '%' }"></div></div>
                </div>
                <span class="tl-val">{{ mock.tasksBlocked }}</span>
              </div>
            </div>
          </div>

          <!-- Team -->
          <div class="detail-card">
            <div class="card-header">
              <span class="card-title">Team</span>
              <span class="card-tag">{{ mock.team.length }} members</span>
            </div>
            <div class="team-list">
              <div v-for="member in mock.team" :key="member.name" class="member-row">
                <div class="member-avatar" :style="{ background: member.avatarBg }">
                  {{ member.initials }}
                </div>
                <div class="member-info">
                  <span class="member-name">{{ member.name }}</span>
                  <span class="member-role">{{ member.role }}</span>
                </div>
                <span class="member-status" :class="member.statusCls">{{ member.status }}</span>
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

          <!-- Efficiency Metrics (full width) -->
          <div class="detail-card span-2">
            <div class="card-header">
              <span class="card-title">Efficiency Metrics</span>
              <div class="card-header-right">
                <span
                  v-for="p in ['1W','1M','3M']" :key="p"
                  class="period-btn"
                  :class="{ active: activePeriod === p }"
                  @click="activePeriod = p"
                >{{ p }}</span>
              </div>
            </div>
            <div class="metrics-grid">
              <div v-for="metric in mock.metrics" :key="metric.label" class="metric-card">
                <div class="metric-top">
                  <span class="metric-val" :style="{ color: metric.color }">{{ metric.value }}</span>
                  <span class="metric-delta" :class="metric.deltaPos ? 'pos' : 'neg'">
                    {{ metric.deltaPos ? '↑' : '↓' }} {{ metric.delta }}
                  </span>
                </div>
                <span class="metric-label">{{ metric.label }}</span>
                <div class="metric-sparkline">
                  <svg :viewBox="`0 0 80 28`" preserveAspectRatio="none" class="spark-svg">
                    <path :d="metric.spark" fill="none" :stroke="metric.color" stroke-width="1.5" opacity="0.7"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Activity (full width) -->
          <div class="detail-card span-2">
            <div class="card-header">
              <span class="card-title">Recent Activity</span>
              <button class="view-all-btn">View all →</button>
            </div>
            <div class="activity-list">
              <div v-for="act in mock.activity" :key="act.id" class="activity-row">
                <div class="act-icon" :style="{ background: act.iconBg }">
                  <svg v-if="act.type === 'task'" width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <rect x="1" y="1" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.1"/>
                    <path d="M3 5l1.5 1.5 2.5-2.5" stroke="currentColor" stroke-width="1" stroke-linecap="square"/>
                  </svg>
                  <svg v-else-if="act.type === 'budget'" width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <circle cx="5" cy="5" r="4" stroke="currentColor" stroke-width="1.1"/>
                    <path d="M5 2.5v5M3.5 3.5h2.5a1 1 0 0 1 0 2H3.5" stroke="currentColor" stroke-width="1" stroke-linecap="square"/>
                  </svg>
                  <svg v-else-if="act.type === 'member'" width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <circle cx="5" cy="3.5" r="1.8" stroke="currentColor" stroke-width="1.1"/>
                    <path d="M1.5 9c0-2 1.6-3.5 3.5-3.5S8.5 7 8.5 9" stroke="currentColor" stroke-width="1.1" stroke-linecap="square"/>
                  </svg>
                  <svg v-else width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M5 1v4l2.5 1.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="square"/>
                    <circle cx="5" cy="5" r="4" stroke="currentColor" stroke-width="1.1"/>
                  </svg>
                </div>
                <div class="act-content">
                  <span class="act-text">{{ act.text }}</span>
                  <span class="act-meta">{{ act.who }} · {{ act.time }}</span>
                </div>
                <span class="act-tag" :class="act.tagCls">{{ act.tag }}</span>
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
            <div class="qstat">
              <span class="qstat-label">Velocity</span>
              <span class="qstat-val gold">{{ mock.velocity }} t/w</span>
            </div>
          </div>
        </div>

        <div class="side-divider"></div>

        <div class="side-section">
          <p class="side-label">Actions</p>
          <div class="side-actions">
            <Button label="Generate Report" />
            <Button label="Add Member" />
            <Button label="Settings" />
          </div>
        </div>

        <div class="side-divider"></div>

        <div class="side-section">
          <p class="side-label">Project Info</p>
          <div class="info-list">
            <div class="info-row">
              <span class="info-key">Status</span>
              <Pill
                :label="statusPill(project.estado).label"
                :btnColor="statusPill(project.estado).bg"
                :circleColor="statusPill(project.estado).color"
                :textColor="statusPill(project.estado).color"
              />
            </div>
            <div class="info-row">
              <span class="info-key">Company</span>
              <span class="info-val">#{{ project.id_empresa }}</span>
            </div>
            <div class="info-row">
              <span class="info-key">Manager</span>
              <span class="info-val">#{{ project.id_encargado }}</span>
            </div>
            <div class="info-row">
              <span class="info-key">Budget</span>
              <span class="info-val gold">{{ formatBudget(project.presupuesto_total) }}</span>
            </div>
          </div>
        </div>

        <div class="side-divider"></div>

        <!-- Risk indicator -->
        <div class="side-section">
          <p class="side-label">Risk Level</p>
          <div class="risk-bars">
            <div v-for="r in mock.risks" :key="r.label" class="risk-row">
              <span class="risk-label">{{ r.label }}</span>
              <div class="risk-track">
                <div class="risk-fill" :style="{ width: r.pct + '%', background: r.color }"></div>
              </div>
              <span class="risk-val" :style="{ color: r.color }">{{ r.level }}</span>
            </div>
          </div>
        </div>

      </aside>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppNavbar from '../components/AppNavbar.vue'
import Pill   from '../components/UI/Pill/Pill.vue'
import Button from '../components/UI/Button/Button.vue'
import { useAuthStore } from '../stores/auth'

const route     = useRoute()
const authStore = useAuthStore()

const project    = ref(null)
const loading    = ref(true)
const activePeriod = ref('1M')

// ── API ────────────────────────────────────────────────────────────────────
async function loadProject() {
  loading.value = true
  try {
    const res = await fetch(`/api/projects/${route.params.id}`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    })
    if (!res.ok) throw new Error()
    const json = await res.json()
    project.value = json.data
  } catch {
    project.value = null
  } finally {
    loading.value = false
  }
}

onMounted(loadProject)

// ── Status helpers ─────────────────────────────────────────────────────────
const STATUS_MAP = {
  PLANIFICADO: { label: 'Planned',     color: '#60a5fa', bg: 'rgba(96,165,250,0.1)'  },
  EN_PROGRESO: { label: 'In Progress', color: '#4ade80', bg: 'rgba(74,222,128,0.1)'  },
  PAUSADO:     { label: 'On Hold',     color: '#fb923c', bg: 'rgba(251,146,60,0.1)'  },
  COMPLETADO:  { label: 'Completed',   color: '#c9a962', bg: 'rgba(201,169,98,0.1)'  },
  CANCELADO:   { label: 'Cancelled',   color: '#fb7185', bg: 'rgba(251,113,133,0.1)' },
}
function statusLabel(e) { return STATUS_MAP[e]?.label ?? e }
function statusPill(e)  { return STATUS_MAP[e] ?? { label: e, color: '#888', bg: 'rgba(255,255,255,0.06)' } }

// ── Formatting ─────────────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function formatBudget(n) {
  const num = parseFloat(n) || 0
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000)     return `$${(num / 1_000).toFixed(0)}K`
  return `$${num.toFixed(0)}`
}

// ── Seeded mock data (deterministic from project id) ──────────────────────
function seeded(id, min, max) {
  const s = Math.sin(id * 9301 + 49297) * 0.5 + 0.5
  return Math.floor(s * (max - min + 1)) + min
}

const mock = computed(() => {
  if (!project.value) return {}
  const id = project.value.id_proyecto

  const budgetUsedPct   = seeded(id,      35, 90)
  const total           = parseFloat(project.value.presupuesto_total) || 100_000
  const budgetSpent     = total * budgetUsedPct / 100
  const budgetRemaining = total - budgetSpent

  const opPct         = seeded(id + 1, 40, 70)
  const personnelPct  = seeded(id + 2, 20, 50)
  const equipPct      = seeded(id + 3, 10, 30)

  const totalTasks        = seeded(id,     20, 80)
  const tasksCompletedPct = seeded(id + 5, 40, 85)
  const tasksCompleted    = Math.floor(totalTasks * tasksCompletedPct / 100)
  const tasksInProgress   = seeded(id + 6, 3, Math.max(4, Math.floor(totalTasks * 0.2)))
  const tasksPending      = Math.max(0, totalTasks - tasksCompleted - tasksInProgress - seeded(id + 7, 0, 3))
  const tasksBlocked      = totalTasks - tasksCompleted - tasksInProgress - tasksPending

  const names = [
    { name: 'Ana García',    role: 'Project Lead',   initials: 'AG', avatarBg: 'rgba(201,169,98,0.15)',  statusCls: 'st-active',    status: 'Active'   },
    { name: 'Carlos Ruiz',   role: 'Developer',      initials: 'CR', avatarBg: 'rgba(96,165,250,0.12)',  statusCls: 'st-active',    status: 'Active'   },
    { name: 'María López',   role: 'Designer',       initials: 'ML', avatarBg: 'rgba(167,139,250,0.12)', statusCls: 'st-idle',      status: 'Idle'     },
    { name: 'Diego Martínez',role: 'QA Engineer',    initials: 'DM', avatarBg: 'rgba(74,222,128,0.1)',   statusCls: 'st-active',    status: 'Active'   },
    { name: 'Sofia Herrera', role: 'Analyst',        initials: 'SH', avatarBg: 'rgba(251,146,60,0.1)',   statusCls: 'st-away',      status: 'Away'     },
  ]
  const teamSize = seeded(id + 8, 2, 5)
  const team = names.slice(0, teamSize)

  const quarter = Math.ceil((new Date().getMonth() + 1) / 3)
  const year    = new Date().getFullYear()

  const velocity = seeded(id + 9, 6, 18)

  const spark1 = `M0,20 C10,18 20,14 30,12 C40,10 50,8 60,6 C65,5 70,4 80,3`
  const spark2 = `M0,22 C10,20 20,22 30,18 C40,14 50,16 60,12 C70,10 75,8 80,7`
  const spark3 = `M0,24 C10,20 20,18 30,16 C40,14 50,12 60,14 C70,16 75,12 80,10`
  const spark4 = `M0,18 C10,16 20,14 30,18 C40,22 50,16 60,12 C70,8 75,10 80,6`
  const spark5 = `M0,20 C10,18 20,22 30,20 C40,18 50,14 60,16 C70,18 75,14 80,12`

  const metrics = [
    { label: 'ROI',               value: `${seeded(id+10,8,24)}%`,  color:'#c9a962', delta:`${seeded(id+11,1,5)}.${seeded(id+12,0,9)}%`, deltaPos:true,  spark:spark1 },
    { label: 'Budget Efficiency', value: `${seeded(id+13,70,95)}%`, color:'#4ade80', delta:`${seeded(id+14,1,8)}%`,                       deltaPos:true,  spark:spark2 },
    { label: 'Time Efficiency',   value: `${seeded(id+15,55,88)}%`, color:'#60a5fa', delta:`${seeded(id+16,1,6)}%`,                       deltaPos:false, spark:spark3 },
    { label: 'Team Velocity',     value: `${velocity}t/w`,          color:'#a78bfa', delta:`${seeded(id+17,1,4)}`,                        deltaPos:true,  spark:spark4 },
    { label: 'Risk Score',        value: `${seeded(id+18,10,45)}/100`,color:'#fb7185',delta:`${seeded(id+19,1,5)}`,                       deltaPos:false, spark:spark5 },
  ]

  const activities = [
    { id:1, type:'task',   text:`Task "${project.value.nombre} — Sprint ${seeded(id,1,5)}" marked as complete`, who:'Ana García',     time:'2h ago',  tag:'Task',   tagCls:'tag-green'  },
    { id:2, type:'budget', text:`Budget allocation updated: +${formatBudget(seeded(id+1,1000,8000))} approved`,  who:'Carlos Ruiz',    time:'5h ago',  tag:'Budget', tagCls:'tag-gold'   },
    { id:3, type:'member', text:`María López joined as Designer`,                                                 who:'System',         time:'1d ago',  tag:'Team',   tagCls:'tag-purple' },
    { id:4, type:'status', text:`Project status changed to ${statusLabel(project.value.estado)}`,                who:'Diego Martínez', time:'2d ago',  tag:'Status', tagCls:'tag-blue'   },
    { id:5, type:'task',   text:`${seeded(id+2,3,10)} tasks moved to In Progress`,                              who:'Ana García',     time:'3d ago',  tag:'Task',   tagCls:'tag-green'  },
  ]

  const risks = [
    { label: 'Schedule',  pct: seeded(id+20,20,70), color:'#fb923c', level: seeded(id+20,20,70) > 50 ? 'High' : 'Medium' },
    { label: 'Budget',    pct: seeded(id+21,10,60), color:'#fb7185', level: seeded(id+21,10,60) > 50 ? 'High' : 'Low'    },
    { label: 'Technical', pct: seeded(id+22,15,55), color:'#a78bfa', level: seeded(id+22,15,55) > 40 ? 'Medium' : 'Low'  },
  ]

  return {
    budgetUsedPct, budgetSpent, budgetRemaining,
    opPct, personnelPct, equipPct,
    totalTasks, tasksCompletedPct, tasksCompleted,
    tasksInProgress, tasksPending, tasksBlocked: Math.max(0, tasksBlocked),
    team, quarter, year, velocity,
    metrics, activity: activities, risks,
  }
})

// ── Timeline (derived from project states) ────────────────────────────────
const TIMELINE_PHASES = [
  { key: 'PLANIFICADO', label: 'Planning',    desc: 'Scope definition, resource allocation and goal setting.' },
  { key: 'EN_PROGRESO', label: 'Execution',   desc: 'Active development and task completion by the team.' },
  { key: 'REVISION',    label: 'Review',      desc: 'Quality assurance, testing and stakeholder review.' },
  { key: 'COMPLETADO',  label: 'Delivery',    desc: 'Final delivery, documentation and project closure.' },
]

const ESTADO_ORDER = ['PLANIFICADO', 'EN_PROGRESO', 'REVISION', 'COMPLETADO']

const timelinePhases = computed(() => {
  if (!project.value) return []
  const estado = project.value.estado
  const isCancelled = estado === 'CANCELADO'
  const isPaused    = estado === 'PAUSADO'

  let currentIdx = ESTADO_ORDER.indexOf(estado)
  if (currentIdx === -1) currentIdx = 1  // default to execution for PAUSADO/CANCELADO

  return TIMELINE_PHASES.map((phase, i) => {
    const phaseIdx = ESTADO_ORDER.indexOf(phase.key)
    let state = 'future'
    if (isCancelled)       state = phaseIdx === 0 ? 'done' : 'skip'
    else if (isPaused)     state = phaseIdx <  1  ? 'done' : phaseIdx === 1 ? 'current' : 'future'
    else if (phaseIdx < currentIdx)  state = 'done'
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
.donut-wrap { flex-shrink: 0; }
.donut-svg { width: 72px; height: 72px; }
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
.mini-donut { width: 56px; height: 56px; }
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
