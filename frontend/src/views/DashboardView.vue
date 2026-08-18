<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppNavbar from '../components/AppNavbar.vue'
import Card from '../components/UI/Card/Card.vue'
import Button from '../components/UI/Button/Button.vue'
import Pill from '../components/UI/Pill/Pill.vue'
import { useAuthStore } from '../stores/auth'
import { statusLabel } from '../utils/statusHelpers'
import { projectPermissionLabel } from '../utils/projectAccessLabels'

const { t } = useI18n()
const authStore = useAuthStore()

const projects = ref([])
const budgetByProj = ref({}) // id_proyecto -> summary
const overviewLoading = ref(false)
const overviewError = ref(null)

const CRITICAL_BUDGET_LEVELS = ['CRITICO', 'EXCEDIDO']
const WARNING_BUDGET_LEVELS = ['PRECAUCION', 'ADVERTENCIA']

function isCriticalBudgetLevel(level) {
  return CRITICAL_BUDGET_LEVELS.includes(level)
}

function isWarningBudgetLevel(level) {
  return WARNING_BUDGET_LEVELS.includes(level)
}

function budgetLevelClass(level) {
  if (isCriticalBudgetLevel(level)) return 'critico'
  if (isWarningBudgetLevel(level)) return 'advertencia'
  return ''
}

function money(n) {
  const num = Number(n || 0)
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

const totalSpent = computed(() =>
  Object.values(budgetByProj.value).reduce((s, b) => s + Number(b?.total_gastado || 0), 0)
)
const totalAllocated = computed(() =>
  Object.values(budgetByProj.value).reduce((s, b) => s + Number(b?.presupuesto_total || 0), 0)
)
const activeProjectsCount = computed(() =>
  projects.value.filter(p => p.estado === 'EN_PROGRESO').length
)
const overrunCount = computed(() =>
  Object.values(budgetByProj.value).filter(b => isCriticalBudgetLevel(b?.alerta_nivel)).length
)
const warningCount = computed(() =>
  Object.values(budgetByProj.value).filter(b => isWarningBudgetLevel(b?.alerta_nivel)).length
)
const spentPct = computed(() => {
  const t = totalAllocated.value
  return t > 0 ? Math.round((totalSpent.value / t) * 100) : 0
})

// TODO SCRUM-15: trendColor se queda en hex porque el template lo concatena
// (`:btnColor="stat.trendColor + '18'"`) para construir un hex de 8 digitos con
// alpha. var() no se puede concatenar, y separarlo en dos campos seria
// refactorizar la estructura, que queda fuera del alcance de este ticket.
const stats = computed(() => [
  {
    label: t('dashboard.stats.totalSpent'),
    value: money(totalSpent.value),
    trend: totalAllocated.value > 0 ? t('dashboard.stats.ofBudget', { pct: spentPct.value }) : t('dashboard.stats.noBudget'),
    trendColor: spentPct.value >= 80 ? '#fb7185' : '#34d399',
    back: 'var(--k-color-tertiary)',
  },
  {
    label: t('dashboard.stats.activeProjects'),
    value: String(activeProjectsCount.value),
    trend: t('dashboard.stats.totalProjects', { count: projects.value.length }),
    trendColor: '#c9a962',
    back: 'var(--k-color-tertiary)',
  },
  {
    label: t('dashboard.stats.overrunAlerts'),
    value: String(overrunCount.value),
    trend: warningCount.value ? t('dashboard.stats.warning', { count: warningCount.value }) : (overrunCount.value ? t('dashboard.stats.critical') : t('dashboard.stats.allHealthy')),
    trendColor: overrunCount.value ? '#fb7185' : (warningCount.value ? '#c9a962' : '#34d399'),
    back: overrunCount.value ? 'rgba(var(--k-color-error-rgb), 0.12)' : 'var(--k-color-tertiary)',
  },
])

function fmtDate(d) {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt)) return '—'
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Trend chart ─────────────────────────────────────────────────────────────
const trendProjectId = ref(null)
const trend = ref(null)
const trendLoading = ref(false)
const trendError = ref(null)

const trendEligibleProjects = computed(() =>
  projects.value.filter(p => p.fecha_inicio && p.fecha_fin_planificada && Number(p.presupuesto_total) > 0)
)

async function loadTrend() {
  if (!trendProjectId.value) { trend.value = null; return }
  trendLoading.value = true
  trendError.value = null
  try {
    const res = await fetch(`/api/budgets/project/${trendProjectId.value}/trend`, { headers: authHeaders() })
    const payload = await res.json()
    if (!res.ok) throw new Error(payload.message || `HTTP ${res.status}`)
    trend.value = payload.data
  } catch (err) {
    trendError.value = err.message
    trend.value = null
  } finally {
    trendLoading.value = false
  }
}

watch(trendProjectId, loadTrend)
watch(trendEligibleProjects, (list) => {
  if (!trendProjectId.value && list.length) trendProjectId.value = list[0].id_proyecto
})

// Chart geometry
const CHART = { w: 800, h: 280, padL: 70, padR: 24, padT: 20, padB: 46 }
const chartArea = computed(() => ({
  x: CHART.padL,
  y: CHART.padT,
  w: CHART.w - CHART.padL - CHART.padR,
  h: CHART.h - CHART.padT - CHART.padB,
}))

const chartData = computed(() => {
  if (!trend.value) return null
  const p = trend.value.proyecto
  const start = new Date(p.fecha_inicio).getTime()
  const end   = new Date(p.fecha_fin_planificada).getTime()
  const total = Number(p.presupuesto_total) || 0
  if (!(end > start) || total <= 0) return null

  const a = chartArea.value
  const xScale = (t) => a.x + ((Math.max(start, Math.min(end, t)) - start) / (end - start)) * a.w
  const yScale = (v) => a.y + a.h - (Math.max(0, Math.min(total, v)) / total) * a.h

  // Planned line: (start,0) → (end,total)
  const plannedPath = `M ${xScale(start)} ${yScale(0)} L ${xScale(end)} ${yScale(total)}`

  // Actual: stepwise cumulative. Start at (start, 0), each point (date, acumulado), then extend to today.
  const points = [{ t: start, v: 0 }]
  for (const pt of trend.value.puntos) {
    const t = new Date(pt.fecha).getTime()
    if (t < start) continue
    points.push({ t, v: pt.acumulado })
  }
  const today = Date.now()
  const lastV = points[points.length - 1].v
  if (today > points[points.length - 1].t) points.push({ t: today, v: lastV })

  let actualPath = ''
  points.forEach((pt, i) => {
    const x = xScale(pt.t)
    const y = yScale(pt.v)
    if (i === 0) actualPath = `M ${x} ${y}`
    else {
      // stepwise: horizontal then vertical
      const prev = points[i - 1]
      const px = xScale(prev.t)
      actualPath += ` L ${x} ${yScale(prev.v)} L ${x} ${y}`
      void px
    }
  })

  // Y ticks (0, 25, 50, 75, 100 %)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y: yScale(total * f),
    label: (total * f).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
  }))

  // X ticks (start, mid, end) — plus today if inside range
  const mid = start + (end - start) / 2
  const xTicks = [
    { x: xScale(start), label: fmtDate(p.fecha_inicio) },
    { x: xScale(mid),   label: fmtDate(new Date(mid)) },
    { x: xScale(end),   label: fmtDate(p.fecha_fin_planificada) },
  ]

  const todayClamped = Math.max(start, Math.min(end, today))
  const todayLine = (today >= start && today <= end)
    ? { x: xScale(todayClamped), label: 'Today' }
    : null

  return { plannedPath, actualPath, yTicks, xTicks, todayLine, lastActual: lastV, total }
})

const topBudgetProjects = computed(() => {
  return projects.value
    .map(p => {
      const b = budgetByProj.value[p.id_proyecto]
      const planned = Number(b?.presupuesto_total ?? p.presupuesto_total ?? 0)
      const spent   = Number(b?.total_gastado ?? 0)
      const pct     = planned > 0 ? Math.min(100, Math.round((spent / planned) * 100)) : 0
      return {
        id_proyecto: p.id_proyecto,
        nombre: p.nombre,
        planned, spent, pct,
        level: b?.alerta_nivel ?? null,
      }
    })
    .filter(r => r.planned > 0)
    .sort((a, b) => b.planned - a.planned)
    .slice(0, 5)
})

const worstProject = computed(() => {
  const entries = Object.entries(budgetByProj.value)
    .map(([id, b]) => {
      const planned = Number(b?.presupuesto_total || 0)
      const spent   = Number(b?.total_gastado || 0)
      const pct     = planned > 0 ? spent / planned : 0
      const p = projects.value.find(x => String(x.id_proyecto) === String(id))
      return { id, nombre: p?.nombre || 'Project', pct, level: b?.alerta_nivel }
    })
    .filter(r => r.pct > 0)
    .sort((a, b) => b.pct - a.pct)
  return entries[0] ?? null
})

const aiInsight = computed(() => {
  if (!projects.value.length) return t('dashboard.ai.noProjects')
  const w = worstProject.value
  if (w && isCriticalBudgetLevel(w.level)) {
    return t('dashboard.ai.exceeded', { name: w.nombre, pct: Math.round(w.pct * 100) })
  }
  if (w && isWarningBudgetLevel(w.level)) {
    return t('dashboard.ai.approaching', { name: w.nombre, pct: Math.round(w.pct * 100) })
  }
  if (overrunCount.value === 0 && warningCount.value === 0 && totalAllocated.value > 0) {
    return t('dashboard.ai.allGood', { count: projects.value.length, pct: spentPct.value })
  }
  return t('dashboard.ai.default', projects.value.length, { named: { count: projects.value.length } })
})

async function loadOverview() {
  if (!authStore.idEmpresaActual || !authStore.token) return
  overviewLoading.value = true
  overviewError.value = null
  try {
    const headers = authHeaders()
    const pr = await fetch('/api/projects?limit=100', { headers })
    const prPayload = await pr.json()
    if (!pr.ok) throw new Error(prPayload.message || `HTTP ${pr.status}`)
    projects.value = prPayload.data || []

    const results = await Promise.allSettled(
      projects.value.map(p =>
        fetch(`/api/budgets/project/${p.id_proyecto}/summary`, { headers })
          .then(r => r.json().then(j => [p.id_proyecto, j]))
      )
    )
    const map = {}
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value[1]?.success) {
        map[r.value[0]] = r.value[1].data
      }
    }
    budgetByProj.value = map
  } catch (err) {
    overviewError.value = err.message
  } finally {
    overviewLoading.value = false
  }
}

const loading = ref(true)
const errorMessage = ref('')
const actionMessage = ref('')
const actionError = ref('')

const generatingInvite = ref(false)
const deactivatingInvite = ref(false)
const updatingMemberId = ref(null)
const removingMemberId = ref(null)
const assigningProjectMemberId = ref(null)
const savingProjectAccessKey = ref('')
const removingProjectAccessKey = ref('')

const panel = ref(null)
const selectedProjectDrafts = ref({})
const permissionDrafts = ref({})

const members = computed(() => panel.value?.members ?? [])
const availableRoles = computed(() => panel.value?.available_roles ?? [])
const invitation = computed(() => panel.value?.invitation ?? null)
const isOwner = computed(() => authStore.canManageUsers)
const empresa = computed(() => panel.value?.empresa ?? null)
const companyProjects = computed(() => panel.value?.projects ?? [])
const projectPermissionCatalog = computed(() => panel.value?.project_permission_catalog ?? [])

const currentUserName = computed(() => {
  const fullName = [authStore.user?.nombre, authStore.user?.apellido].filter(Boolean).join(' ').trim()
  return fullName || authStore.user?.email || 'User'
})

const totalMembers = computed(() => members.value.length)
const collaboratorCount = computed(() => members.value.filter((member) => member.rol_empresa === 'collaborator').length)
const adminLikeCount = computed(() =>
  members.value.filter((member) => ['owner', 'admin', 'manager'].includes(member.rol_empresa)).length
)

function authHeaders() {
  return {
    Authorization: `Bearer ${authStore.token}`,
    'X-Company-ID': authStore.idEmpresaActual,
  }
}

async function loadPanel() {
  if (!authStore.idEmpresaActual || !authStore.token) return

  loading.value = true
  errorMessage.value = ''

  try {
    if (!authStore.user) {
      await authStore.fetchMe()
    }

    const accessEmpresaId = authStore.accessContext?.empresa?.id_empresa
    if (accessEmpresaId !== authStore.idEmpresaActual) {
      await authStore.loadAccessContext()
    }

    if (!authStore.canManageUsers) {
      panel.value = null
      return
    }

    const res = await fetch('/api/companies/members-panel', {
      headers: authHeaders(),
    })
    const payload = await res.json()

    if (!res.ok) {
      errorMessage.value = payload.message || t('dashboard.collaborators.errors.loadPanel')
      panel.value = null
      return
    }

    panel.value = payload.data
    syncProjectDrafts(payload.data.members ?? [])
  } catch {
    errorMessage.value = t('dashboard.collaborators.errors.loadPanel')
    panel.value = null
  } finally {
    loading.value = false
  }
}

async function generateInvite() {
  actionMessage.value = ''
  actionError.value = ''
  generatingInvite.value = true

  try {
    const res = await fetch('/api/companies/invitation', {
      method: 'POST',
      headers: authHeaders(),
    })
    const payload = await res.json()

    if (!res.ok) {
      actionError.value = payload.message || t('dashboard.collaborators.errors.generateInvite')
      return
    }

    if (panel.value) {
      panel.value.invitation = payload.data
    }
    actionMessage.value = t('dashboard.collaborators.actions.inviteReady')
  } catch {
    actionError.value = t('dashboard.collaborators.errors.generateInvite')
  } finally {
    generatingInvite.value = false
  }
}

async function deactivateInvite() {
  actionMessage.value = ''
  actionError.value = ''
  deactivatingInvite.value = true

  try {
    const res = await fetch('/api/companies/invitation', {
      method: 'DELETE',
      headers: authHeaders(),
    })
    const payload = await res.json()

    if (!res.ok) {
      actionError.value = payload.message || t('dashboard.collaborators.errors.deactivateInvite')
      return
    }

    if (panel.value) {
      panel.value.invitation = null
    }
    actionMessage.value = payload.message || t('dashboard.collaborators.actions.inviteDeactivated')
  } catch {
    actionError.value = t('dashboard.collaborators.errors.deactivateInvite')
  } finally {
    deactivatingInvite.value = false
  }
}

async function copyInviteLink() {
  if (!invitation.value?.link) return

  actionMessage.value = ''
  actionError.value = ''

  try {
    await navigator.clipboard.writeText(invitation.value.link)
    actionMessage.value = t('dashboard.collaborators.actions.linkCopied')
  } catch {
    actionError.value = t('dashboard.collaborators.errors.copyLink')
  }
}

async function updateMemberRole(member, newRole) {
  if (member.rol_empresa === newRole) return

  actionMessage.value = ''
  actionError.value = ''
  updatingMemberId.value = member.id_usuario

  try {
    const res = await fetch(`/api/companies/members/${member.id_usuario}/role`, {
      method: 'PATCH',
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rol: newRole }),
    })

    const payload = await res.json()
    if (!res.ok) {
      actionError.value = payload.message || t('dashboard.collaborators.errors.updateRole')
      return
    }

    if (panel.value) {
      panel.value.members = panel.value.members.map((currentMember) =>
        currentMember.id_usuario === member.id_usuario ? payload.data : currentMember
      )
    }
    actionMessage.value = t('dashboard.collaborators.actions.roleUpdated')
  } catch {
    actionError.value = t('dashboard.collaborators.errors.updateRole')
  } finally {
    updatingMemberId.value = null
  }
}

async function removeMember(member) {
  actionMessage.value = ''
  actionError.value = ''
  removingMemberId.value = member.id_usuario

  try {
    const res = await fetch(`/api/companies/members/${member.id_usuario}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    const payload = await res.json()

    if (!res.ok) {
      actionError.value = payload.message || t('dashboard.collaborators.errors.removeUser')
      return
    }

    if (panel.value) {
      panel.value.members = panel.value.members.filter(
        ({ id_usuario }) => id_usuario !== member.id_usuario
      )
    }
    actionMessage.value = payload.message || t('dashboard.collaborators.actions.userRemoved')
  } catch {
    actionError.value = t('dashboard.collaborators.errors.removeUser')
  } finally {
    removingMemberId.value = null
  }
}

function projectDraftKey(idUsuario, idProyecto) {
  return `${idUsuario}:${idProyecto}`
}

function syncProjectDrafts(currentMembers) {
  const nextDrafts = {}

  for (const member of currentMembers) {
    for (const assignment of member.project_assignments || []) {
      nextDrafts[projectDraftKey(member.id_usuario, assignment.id_proyecto)] = [...assignment.permisos]
    }
  }

  permissionDrafts.value = nextDrafts
}

function availableProjectsForMember(member) {
  const assignedProjectIds = new Set(
    (member.project_assignments || []).map(({ id_proyecto }) => id_proyecto)
  )

  return companyProjects.value.filter(({ id_proyecto }) => !assignedProjectIds.has(id_proyecto))
}

function getDraftPermissions(memberId, projectId) {
  return permissionDrafts.value[projectDraftKey(memberId, projectId)] ?? []
}

function toggleProjectPermission(memberId, projectId, permissionName, enabled) {
  const key = projectDraftKey(memberId, projectId)
  const currentPermissions = new Set(getDraftPermissions(memberId, projectId))

  if (enabled) {
    currentPermissions.add(permissionName)
  } else {
    currentPermissions.delete(permissionName)
  }

  permissionDrafts.value = {
    ...permissionDrafts.value,
    [key]: Array.from(currentPermissions),
  }
}

async function assignProjectToMember(member) {
  const idProyecto = selectedProjectDrafts.value[member.id_usuario]
  if (!idProyecto) return

  actionMessage.value = ''
  actionError.value = ''
  assigningProjectMemberId.value = member.id_usuario

  try {
    const res = await fetch(`/api/companies/members/${member.id_usuario}/projects/${idProyecto}`, {
      method: 'PUT',
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ permisos: [] }),
    })
    const payload = await res.json()

    if (!res.ok) {
      actionError.value = payload.message || t('dashboard.collaborators.errors.assignProject')
      return
    }

    selectedProjectDrafts.value = {
      ...selectedProjectDrafts.value,
      [member.id_usuario]: '',
    }
    actionMessage.value = t('dashboard.collaborators.actions.projectAssigned')
    await loadPanel()
  } catch {
    actionError.value = t('dashboard.collaborators.errors.assignProject')
  } finally {
    assigningProjectMemberId.value = null
  }
}

async function saveProjectPermissions(member, assignment) {
  actionMessage.value = ''
  actionError.value = ''

  const key = projectDraftKey(member.id_usuario, assignment.id_proyecto)
  savingProjectAccessKey.value = key

  try {
    const res = await fetch(
      `/api/companies/members/${member.id_usuario}/projects/${assignment.id_proyecto}`,
      {
        method: 'PUT',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permisos: getDraftPermissions(member.id_usuario, assignment.id_proyecto) }),
      }
    )
    const payload = await res.json()

    if (!res.ok) {
      actionError.value = payload.message || t('dashboard.collaborators.errors.savePermissions')
      return
    }

    actionMessage.value = t('dashboard.collaborators.actions.permissionsUpdated')
    await loadPanel()
  } catch {
    actionError.value = t('dashboard.collaborators.errors.savePermissions')
  } finally {
    savingProjectAccessKey.value = ''
  }
}

async function removeProjectAccess(member, assignment) {
  actionMessage.value = ''
  actionError.value = ''

  const key = projectDraftKey(member.id_usuario, assignment.id_proyecto)
  removingProjectAccessKey.value = key

  try {
    const res = await fetch(
      `/api/companies/members/${member.id_usuario}/projects/${assignment.id_proyecto}`,
      {
        method: 'DELETE',
        headers: authHeaders(),
      }
    )
    const payload = await res.json()

    if (!res.ok) {
      actionError.value = payload.message || t('dashboard.collaborators.errors.removeProjectAccess')
      return
    }

    actionMessage.value = payload.message || t('dashboard.collaborators.actions.permissionsUpdated')
    await loadPanel()
  } catch {
    actionError.value = t('dashboard.collaborators.errors.removeProjectAccess')
  } finally {
    removingProjectAccessKey.value = ''
  }
}

watch(() => authStore.idEmpresaActual, () => {
  loadPanel()
  loadOverview()
}, { immediate: true })
</script>

<template>
  <div class="dashboard-layout">
    <AppNavbar />

    <main class="content">
      <header class="header">
        <h1 class="title">{{ $t('dashboard.title') }}</h1>
        <p class="subtitle">{{ $t('dashboard.welcome', { name: currentUserName }) }}</p>
      </header>

      <section
        v-if="authStore.accessContext && !authStore.canManageUsers && !authStore.canViewProjects && !authStore.canViewInventory"
        class="access-waiting"
      >
        <p class="team-eyebrow">{{ $t('dashboard.pendingAccess.eyebrow') }}</p>
        <h2 class="access-waiting-title">{{ $t('dashboard.pendingAccess.title') }}</h2>
        <p class="team-subtitle">
          {{ $t('dashboard.pendingAccess.subtitle', { company: authStore.empresaActual?.nombre || 'this company' }) }}
        </p>
      </section>

      <section class="kpi-grid">
        <Card
          v-for="stat in stats"
          :key="stat.label"
          :title="stat.value"
          :subtitle="stat.label"
          :back="stat.back"
          titleColor="var(--k-color-text)"
          borderColor="var(--k-color-border)"
          shadowColor="rgba(var(--k-color-black-rgb), 0.5)"
        >
          <Pill
            :label="stat.trend"
            :btnColor="stat.trendColor + '18'"
            :circleColor="stat.trendColor"
            :textColor="stat.trendColor"
          />
        </Card>
      </section>

      <section class="ai-box">
        <div class="ai-content">
          <h3 class="ai-title">{{ $t('dashboard.ai.label') }}</h3>
          <p class="ai-message">"{{ currentUserName }}, {{ aiInsight }}"</p>
        </div>
        <Button
          v-if="worstProject"
          :label="$t('dashboard.ai.reviewBudget')"
          @click="$router.push({ name: 'budget', query: { project: worstProject.id } })"
        />
      </section>

      <section class="chart-card trend-card">
        <div class="trend-head">
          <div>
            <h3>{{ $t('dashboard.trend.title') }}</h3>
            <p class="timeline-hint">{{ $t('dashboard.trend.hint') }}</p>
          </div>
          <select
            v-if="trendEligibleProjects.length"
            v-model="trendProjectId"
            class="trend-select"
          >
            <option v-for="p in trendEligibleProjects" :key="p.id_proyecto" :value="p.id_proyecto">
              {{ p.nombre }}
            </option>
          </select>
        </div>

        <div v-if="trendLoading" class="chart-state">{{ $t('dashboard.trend.loading') }}</div>
        <div v-else-if="trendError" class="chart-state chart-state--error">{{ trendError }}</div>
        <div v-else-if="!trendEligibleProjects.length" class="chart-state">
          {{ $t('dashboard.trend.noProjects') }}
        </div>
        <div v-else-if="!chartData" class="chart-state">
          {{ $t('dashboard.trend.noData') }}
        </div>
        <svg v-else class="trend-svg" :viewBox="`0 0 ${CHART.w} ${CHART.h}`" preserveAspectRatio="xMidYMid meet">
          <!-- Y grid -->
          <g>
            <line
              v-for="t in chartData.yTicks"
              :key="`yg-${t.label}`"
              :x1="chartArea.x" :x2="chartArea.x + chartArea.w"
              :y1="t.y" :y2="t.y"
              stroke="var(--k-color-border)" stroke-width="1"
            />
            <text
              v-for="t in chartData.yTicks"
              :key="`yt-${t.label}`"
              :x="chartArea.x - 8" :y="t.y + 4"
              fill="var(--k-text-dim)" font-size="10" text-anchor="end"
              font-family="var(--k-font-sans)"
            >{{ t.label }}</text>
          </g>

          <!-- X axis -->
          <line
            :x1="chartArea.x" :x2="chartArea.x + chartArea.w"
            :y1="chartArea.y + chartArea.h" :y2="chartArea.y + chartArea.h"
            stroke="var(--k-color-border)" stroke-width="1"
          />
          <text
            v-for="(t, i) in chartData.xTicks"
            :key="`xt-${i}`"
            :x="t.x" :y="chartArea.y + chartArea.h + 18"
            fill="var(--k-text-muted)" font-size="10"
            :text-anchor="i === 0 ? 'start' : i === chartData.xTicks.length - 1 ? 'end' : 'middle'"
            font-family="var(--k-font-sans)"
          >{{ t.label }}</text>

          <!-- Planned line (dashed gold) -->
          <path
            :d="chartData.plannedPath"
            fill="none" stroke="var(--k-color-primary)" stroke-width="1.5"
            stroke-dasharray="6,5" opacity="0.75"
          />

          <!-- Actual cumulative line -->
          <path
            :d="chartData.actualPath"
            fill="none" stroke="var(--k-state-success-text)" stroke-width="2"
          />

          <!-- Today marker -->
          <template v-if="chartData.todayLine">
            <line
              :x1="chartData.todayLine.x" :x2="chartData.todayLine.x"
              :y1="chartArea.y" :y2="chartArea.y + chartArea.h"
              stroke="var(--k-color-text)" stroke-width="1" stroke-dasharray="3,3" opacity="0.5"
            />
            <text
              :x="chartData.todayLine.x" :y="chartArea.y - 6"
              fill="var(--k-color-text)" font-size="10" text-anchor="middle" opacity="0.8"
              font-family="var(--k-font-sans)"
            >{{ $t('dashboard.trend.today') }}</text>
          </template>

          <!-- Legend -->
          <g :transform="`translate(${chartArea.x + chartArea.w - 210}, ${chartArea.y + 8})`">
            <rect x="0" y="0" width="210" height="40" fill="var(--k-color-bg)" stroke="var(--k-color-border)"/>
            <line x1="10" y1="14" x2="32" y2="14" stroke="var(--k-color-primary)" stroke-width="1.5" stroke-dasharray="6,5"/>
            <text x="40" y="17" fill="var(--k-text-muted)" font-size="10" font-family="var(--k-font-sans)">{{ $t('dashboard.trend.legend.planned') }}</text>
            <line x1="10" y1="30" x2="32" y2="30" stroke="var(--k-state-success-text)" stroke-width="2"/>
            <text x="40" y="33" fill="var(--k-text-muted)" font-size="10" font-family="var(--k-font-sans)">{{ $t('dashboard.trend.legend.actual') }}</text>
          </g>
        </svg>
      </section>

      <div class="charts-container">
        <div class="chart-card main-chart">
          <h3>{{ $t('dashboard.budget.title') }}</h3>

          <div v-if="overviewLoading" class="chart-state">{{ $t('dashboard.budget.loading') }}</div>
          <div v-else-if="overviewError" class="chart-state chart-state--error">{{ overviewError }}</div>
          <div v-else-if="!topBudgetProjects.length" class="chart-state">
            {{ $t('dashboard.budget.empty') }}
          </div>
          <div v-else class="project-bars">
            <div v-for="row in topBudgetProjects" :key="row.id_proyecto" class="project-bar-row">
              <div class="project-bar-head">
                <span class="project-bar-name">{{ row.nombre }}</span>
                <span class="project-bar-meta">
                  <span>{{ money(row.spent) }} / {{ money(row.planned) }}</span>
                  <span class="project-bar-pct" :class="budgetLevelClass(row.level)">{{ row.pct }}%</span>
                </span>
              </div>
              <div class="bar-bg">
                <div class="bar-fill" :class="budgetLevelClass(row.level)" :style="{ width: row.pct + '%' }"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="chart-card mini-chart">
          <h3>{{ $t('dashboard.snapshot.title') }}</h3>
          <div class="snapshot-row">
            <span class="snapshot-label">{{ $t('dashboard.snapshot.allocated') }}</span>
            <span class="snapshot-value">{{ money(totalAllocated) }}</span>
          </div>
          <div class="snapshot-row">
            <span class="snapshot-label">{{ $t('dashboard.snapshot.spent') }}</span>
            <span class="snapshot-value">{{ money(totalSpent) }}</span>
          </div>
          <div class="snapshot-row">
            <span class="snapshot-label">{{ $t('dashboard.snapshot.remaining') }}</span>
            <span class="snapshot-value gold">{{ money(totalAllocated - totalSpent) }}</span>
          </div>
          <div class="snapshot-bar bar-bg">
            <div class="bar-fill" :style="{ width: spentPct + '%' }"></div>
          </div>
          <p class="snapshot-foot">{{ $t('dashboard.snapshot.summary', projects.length, { named: { pct: spentPct, count: projects.length } }) }}</p>
        </div>
      </div>

      <section v-if="isOwner" class="company-collaborators">
        <div class="team-header">
          <div>
            <p class="team-eyebrow">{{ $t('dashboard.collaborators.eyebrow') }}</p>
            <h2 class="team-title">{{ $t('dashboard.collaborators.title') }}</h2>
            <p class="team-subtitle">{{ $t('dashboard.collaborators.subtitle') }}</p>
          </div>
          <div class="team-summary">
            <span class="team-chip">{{ $t('dashboard.collaborators.membersCount', { count: totalMembers }) }}</span>
            <span class="team-chip">{{ $t('dashboard.collaborators.collaboratorsCount', { count: collaboratorCount }) }}</span>
            <span class="team-chip">{{ $t('dashboard.collaborators.managementCount', { count: adminLikeCount }) }}</span>
          </div>
        </div>

        <div v-if="loading" class="team-state">{{ $t('dashboard.collaborators.loading') }}</div>
        <div v-else-if="errorMessage" class="team-state team-state--error">{{ errorMessage }}</div>

        <template v-else-if="panel">
          <div class="team-grid">
            <article class="team-card invite-panel">
              <div class="team-card-head">
                <div>
                  <p class="team-card-kicker">{{ $t('dashboard.collaborators.invite.eyebrow') }}</p>
                  <h3>{{ $t('dashboard.collaborators.invite.title') }}</h3>
                </div>
                <span class="team-chip" :class="{ inactive: !invitation }">
                  {{ invitation ? $t('dashboard.collaborators.invite.active') : $t('dashboard.collaborators.invite.inactive') }}
                </span>
              </div>

              <p class="team-copy">{{ $t('dashboard.collaborators.invite.description') }}</p>

              <template v-if="isOwner">
                <div v-if="invitation" class="invite-link-box">
                  <span class="invite-link">{{ invitation.link }}</span>
                </div>

                <div class="team-actions">
                  <button
                    v-if="!invitation"
                    class="team-btn team-btn--primary"
                    :disabled="generatingInvite"
                    @click="generateInvite"
                  >
                    {{ generatingInvite ? $t('dashboard.collaborators.invite.generating') : $t('dashboard.collaborators.invite.generate') }}
                  </button>

                  <template v-else>
                    <button class="team-btn team-btn--primary" @click="copyInviteLink">
                      {{ $t('dashboard.collaborators.invite.copy') }}
                    </button>
                    <button
                      class="team-btn team-btn--secondary"
                      :disabled="deactivatingInvite"
                      @click="deactivateInvite"
                    >
                      {{ deactivatingInvite ? $t('dashboard.collaborators.invite.deactivating') : $t('dashboard.collaborators.invite.deactivate') }}
                    </button>
                  </template>
                </div>
              </template>

              <p v-else class="team-copy muted">{{ $t('dashboard.collaborators.invite.ownerOnly') }}</p>

              <p v-if="actionMessage" class="feedback feedback--ok">{{ actionMessage }}</p>
              <p v-if="actionError" class="feedback feedback--error">{{ actionError }}</p>
            </article>

            <article class="team-card members-panel">
              <div class="team-card-head">
                <div>
                  <p class="team-card-kicker">{{ $t('dashboard.collaborators.users.eyebrow') }}</p>
                  <h3>{{ $t('dashboard.collaborators.users.title') }}</h3>
                </div>
                <span class="team-chip">{{ $t('dashboard.collaborators.users.total', { count: members.length }) }}</span>
              </div>

              <div class="members-list">
                <div v-for="member in members" :key="member.id_usuario" class="member-row">
                  <div class="member-main">
                    <div class="member-avatar">
                      {{ (member.nombre || member.email || 'U').charAt(0).toUpperCase() }}
                    </div>
                    <div class="member-info">
                      <strong class="member-name">
                        {{ [member.nombre, member.apellido].filter(Boolean).join(' ') || member.email }}
                      </strong>
                      <span class="member-email">{{ member.email }}</span>
                    </div>
                  </div>

                  <div class="member-meta">
                    <span class="role-chip" :class="member.rol_empresa">{{ member.rol_empresa }}</span>

                    <template v-if="isOwner && member.rol_empresa !== 'owner'">
                      <select
                        class="role-select"
                        :value="member.rol_empresa"
                        :disabled="updatingMemberId === member.id_usuario"
                        @change="updateMemberRole(member, $event.target.value)"
                      >
                        <option
                          v-for="role in availableRoles"
                          :key="role.nombre"
                          :value="role.nombre"
                        >
                          {{ role.nombre }}
                        </option>
                      </select>

                      <button
                        class="team-btn team-btn--danger"
                        :disabled="removingMemberId === member.id_usuario"
                        @click="removeMember(member)"
                      >
                        {{ removingMemberId === member.id_usuario ? $t('dashboard.collaborators.projectAccess.removing') : $t('dashboard.collaborators.projectAccess.remove') }}
                      </button>
                    </template>
                  </div>

                  <div v-if="member.rol_empresa !== 'owner'" class="member-project-access">
                    <div class="member-project-access-head">
                      <div>
                        <span class="member-project-access-title">{{ $t('dashboard.collaborators.projectAccess.title') }}</span>
                        <p class="member-project-access-subtitle">{{ $t('dashboard.collaborators.projectAccess.subtitle') }}</p>
                      </div>

                      <div class="member-project-assignment-controls">
                        <select
                          v-model="selectedProjectDrafts[member.id_usuario]"
                          class="role-select"
                          :disabled="assigningProjectMemberId === member.id_usuario || !availableProjectsForMember(member).length"
                        >
                          <option value="">{{ $t('dashboard.collaborators.projectAccess.selectProject') }}</option>
                          <option
                            v-for="project in availableProjectsForMember(member)"
                            :key="project.id_proyecto"
                            :value="project.id_proyecto"
                          >
                            {{ project.nombre }}
                          </option>
                        </select>

                        <button
                          class="team-btn team-btn--primary"
                          :disabled="assigningProjectMemberId === member.id_usuario || !selectedProjectDrafts[member.id_usuario]"
                          @click="assignProjectToMember(member)"
                        >
                          {{ assigningProjectMemberId === member.id_usuario ? $t('dashboard.collaborators.projectAccess.assigning') : $t('dashboard.collaborators.projectAccess.assign') }}
                        </button>
                      </div>
                    </div>

                    <div v-if="member.project_assignments.length" class="project-assignment-list">
                      <div
                        v-for="assignment in member.project_assignments"
                        :key="`${member.id_usuario}-${assignment.id_proyecto}`"
                        class="project-assignment-card"
                      >
                        <div class="project-assignment-head">
                          <div>
                            <strong class="member-name">{{ assignment.proyecto_nombre }}</strong>
                            <p class="member-email">{{ statusLabel(assignment.proyecto_estado) }}</p>
                          </div>

                          <button
                            class="team-btn team-btn--danger"
                            :disabled="removingProjectAccessKey === `${member.id_usuario}:${assignment.id_proyecto}`"
                            @click="removeProjectAccess(member, assignment)"
                          >
                            {{ removingProjectAccessKey === `${member.id_usuario}:${assignment.id_proyecto}` ? $t('dashboard.collaborators.projectAccess.removing') : $t('dashboard.collaborators.projectAccess.removeProject') }}
                          </button>
                        </div>

                        <div class="permission-grid">
                          <label
                            v-for="permission in projectPermissionCatalog"
                            :key="`${assignment.id_proyecto}-${permission.nombre_permiso}`"
                            class="permission-toggle"
                          >
                            <input
                              type="checkbox"
                              :checked="getDraftPermissions(member.id_usuario, assignment.id_proyecto).includes(permission.nombre_permiso)"
                              @change="toggleProjectPermission(member.id_usuario, assignment.id_proyecto, permission.nombre_permiso, $event.target.checked)"
                            />
                            <span class="permission-name">{{ projectPermissionLabel(permission.nombre_permiso) }}</span>
                            <small class="permission-description">{{ permission.descripcion }}</small>
                          </label>
                        </div>

                        <div class="project-assignment-actions">
                          <button
                            class="team-btn team-btn--secondary"
                            :disabled="savingProjectAccessKey === `${member.id_usuario}:${assignment.id_proyecto}`"
                            @click="saveProjectPermissions(member, assignment)"
                          >
                            {{ savingProjectAccessKey === `${member.id_usuario}:${assignment.id_proyecto}` ? $t('dashboard.collaborators.projectAccess.saving') : $t('dashboard.collaborators.projectAccess.savePermissions') }}
                          </button>
                        </div>
                      </div>
                    </div>

                    <p v-else class="team-copy muted">{{ $t('dashboard.collaborators.projectAccess.noProjects') }}</p>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </template>
      </section>
    </main>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;700&family=Manrope:wght@400;500;600;700&display=swap');

.dashboard-layout {
  display: flex;
  flex-direction: column;
  background: transparent;
  min-height: 100vh;
}

.content {
  flex: 1;
  padding: 80px 100px;
  color: var(--k-color-text);
  background: transparent;
  margin-top: 56px;
}

.title {
  font-family: var(--k-font-display);
  letter-spacing: -0.02em;
  font-size: var(--k-font-size-display);
  color: var(--k-color-text);
  margin-bottom: 10px;
}

.subtitle {
  font-family: var(--k-font-sans);
  color: var(--k-text-dim);
  margin-bottom: 40px;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 40px;
}

.access-waiting {
  background: var(--k-color-bg);
  border: 1px dashed var(--k-color-primary);
  padding: 28px 32px;
  margin-bottom: var(--k-space-6);
}

.access-waiting-title {
  font-family: var(--k-font-display);
  font-size: var(--k-font-size-heading-1);
  color: var(--k-color-text);
  margin: 10px 0 8px;
}

.kpi-grid :deep(.card) {
  max-width: none;
  width: 100%;
  margin: 0;
  border-radius: var(--k-radius-sm);
  padding: var(--k-space-5);
  gap: var(--k-space-3);
}

.kpi-grid :deep(.card-title) {
  font-size: var(--k-font-size-heading-1);
  font-family: var(--k-font-display);
}

.kpi-grid :deep(.card-subtitle) {
  font-size: var(--k-font-size-caption);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--k-text-dim);
}

.ai-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--k-color-bg);
  border: 1px dashed var(--k-color-primary);
  padding: 40px;
  margin-bottom: 40px;
  gap: var(--k-space-6);
}

.ai-title {
  color: var(--k-color-primary);
  font-size: var(--k-font-size-caption);
  letter-spacing: 0.1em;
  margin-bottom: var(--k-space-3);
  font-family: var(--k-font-sans);
}

.ai-message {
  font-style: italic;
  font-size: var(--k-font-size-body-large);
  max-width: 800px;
  line-height: 1.6;
  font-family: var(--k-font-sans);
}

.ai-box :deep(.btn) {
  background: var(--k-color-primary);
  color: var(--k-form-btn-text);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption);
  font-weight: 700;
  letter-spacing: 0.1em;
  border-radius: 0;
  padding: var(--k-space-3) 24px;
  white-space: nowrap;
  flex-shrink: 0;
}

.ai-box :deep(.btn:hover) {
  filter: brightness(1.15);
}

.charts-container {
  display: flex;
  gap: 20px;
  margin-bottom: 48px;
}

.chart-card {
  background: var(--k-color-bg);
  border: 1px solid var(--k-color-border);
  padding: 30px;
  flex: 1;
}

.chart-card h3 {
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-main);
  font-weight: 600;
  color: var(--k-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: var(--k-space-1);
}

.chart-placeholder {
  margin-top: 20px;
}

.line-chart {
  width: 100%;
  height: 150px;
}

.chart-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  color: var(--k-text-faint);
  font-size: var(--k-font-size-caption);
  font-family: var(--k-font-sans);
}

.bar-group {
  margin-bottom: 20px;
}

.bar-group label {
  font-size: var(--k-font-size-caption);
  display: block;
  margin-bottom: var(--k-space-2);
  color: var(--k-text-muted);
  font-family: var(--k-font-sans);
}

.bar-bg {
  background: var(--k-color-tertiary);
  height: 6px;
  border-radius: 3px;
}

.bar-fill {
  background: var(--k-color-primary);
  height: 100%;
  border-radius: 3px;
  transition: width .4s ease;
}

/* TODO SCRUM-15: sin token. --k-color-warning es rgb(120,80,10), pensado para
   fondos, no para una barra o un texto de aviso sobre superficie oscura. */
.bar-fill.advertencia { background: #f59e0b; }
.bar-fill.critico     { background: var(--k-state-error-text); }

.chart-state {
  padding: var(--k-space-5) 0;
  color: var(--k-text-muted);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-main);
}
.chart-state--error { color: var(--k-state-error-text); }

.project-bars {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-top: 12px;
}
.project-bar-row { display: flex; flex-direction: column; gap: var(--k-space-1); }
.project-bar-head {
  display: flex;
  justify-content: space-between;
  gap: var(--k-space-3);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-main);
  color: var(--k-color-text);
}
.project-bar-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 60%;
}
.project-bar-meta {
  display: flex;
  gap: 10px;
  color: var(--k-text-muted);
  font-size: var(--k-font-size-caption);
  font-variant-numeric: tabular-nums;
}
.project-bar-pct { color: var(--k-color-primary); font-weight: 600; }
.project-bar-pct.advertencia { color: #f59e0b; } /* TODO SCRUM-15: sin token de aviso claro */
.project-bar-pct.critico     { color: var(--k-state-error-text); }

.snapshot-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 10px 0;
  border-bottom: 1px solid rgba(var(--k-color-white-rgb), 0.05);
  font-family: var(--k-font-sans);
}
.snapshot-label { color: var(--k-text-muted); font-size: var(--k-font-size-caption); letter-spacing: 0.08em; text-transform: uppercase; }
.snapshot-value { color: var(--k-color-text); font-size: var(--k-font-size-body-main); font-variant-numeric: tabular-nums; }
.snapshot-value.gold { color: var(--k-color-primary); }
.snapshot-bar { margin: 14px 0 10px; height: 6px; border-radius: 3px; }
.snapshot-foot { color: var(--k-text-muted); font-family: var(--k-font-sans); font-size: var(--k-font-size-caption); line-height: 1.5; }

.trend-card { margin-bottom: 20px; }
.trend-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--k-space-4);
  margin-bottom: var(--k-space-2);
  flex-wrap: wrap;
}
.timeline-hint {
  color: var(--k-text-muted);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption);
  line-height: 1.6;
  margin: 4px 0 12px;
  max-width: 520px;
}
.trend-select {
  background: var(--k-color-tertiary);
  border: 1px solid var(--k-color-border);
  color: var(--k-color-text);
  padding: 10px 12px;
  font-size: var(--k-font-size-body-main);
  font-family: var(--k-font-sans);
  min-width: 220px;
}
.trend-svg {
  width: 100%;
  height: auto;
  display: block;
  margin-top: 8px;
}

.company-collaborators {
  background: var(--k-color-bg);
  border: 1px solid var(--k-color-border);
  padding: var(--k-space-6);
}

.team-header {
  display: flex;
  justify-content: space-between;
  gap: var(--k-space-5);
  align-items: flex-start;
  margin-bottom: var(--k-space-5);
}

.team-eyebrow,
.team-card-kicker {
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--k-color-primary);
}

.team-title {
  font-family: var(--k-font-display);
  font-size: var(--k-font-size-heading-1);
  color: var(--k-color-text);
  margin: 10px 0 8px;
}

.team-subtitle,
.team-copy,
.member-email,
.muted {
  font-family: var(--k-font-sans);
  color: var(--k-text-muted);
  line-height: 1.7;
}

.team-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.team-chip,
.role-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  border: 1px solid rgba(var(--k-color-white-rgb), 0.12);
  background: var(--k-color-tertiary);
  color: var(--k-color-text);
}

.team-chip.inactive {
  color: var(--k-text-dim);
}

.team-grid {
  display: grid;
  grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
  gap: 20px;
}

.team-card {
  background: var(--k-color-bg-2);
  border: 1px solid var(--k-color-border);
  padding: var(--k-space-5);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.team-card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--k-space-4);
}

.team-card h3 {
  font-family: var(--k-font-display);
  font-size: var(--k-font-size-heading-1);
  color: var(--k-color-text);
  margin-top: 8px;
}

.invite-link-box {
  padding: var(--k-space-4);
  background: var(--k-color-tertiary);
  border: 1px dashed rgba(var(--k-color-primary-rgb), 0.28);
}

.invite-link {
  display: block;
  color: var(--k-color-primary);
  word-break: break-all;
  line-height: 1.7;
}

.team-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--k-space-3);
}

.team-btn,
.role-select {
  appearance: none;
  border: none;
  font: inherit;
}

.team-btn {
  padding: 13px 16px;
  cursor: pointer;
  transition: transform .16s ease, opacity .16s ease;
}

.team-btn--primary {
  background: var(--k-color-primary);
  color: var(--k-form-btn-text);
  font-weight: 700;
}

.team-btn--secondary {
  background: var(--k-color-tertiary);
  border: 1px solid rgba(var(--k-color-white-rgb), 0.12);
  color: var(--k-color-text);
}

.team-btn--danger {
  background: rgba(var(--k-color-error-rgb), 0.12);
  border: 1px solid rgba(var(--k-color-error-rgb), 0.22);
  color: var(--k-state-error-text);
}

.team-btn:hover {
  transform: translateY(-1px);
}

.team-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

.feedback {
  padding: 14px 16px;
  border: 1px solid rgba(var(--k-color-white-rgb), 0.08);
  background: var(--k-color-tertiary);
  font-family: var(--k-font-sans);
}

.feedback--ok {
  border-color: rgba(var(--k-color-success-rgb), 0.24);
  color: var(--k-state-success-text);
}

.feedback--error,
.team-state--error {
  border-color: rgba(var(--k-color-error-rgb), 0.24);
  color: var(--k-state-error-text);
}

.team-state {
  padding: 18px;
  border: 1px solid rgba(var(--k-color-white-rgb), 0.08);
  background: var(--k-color-tertiary);
  font-family: var(--k-font-sans);
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: var(--k-space-3);
}

.member-row {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 20px;
  padding: 18px;
  background: var(--k-color-tertiary);
  border: 1px solid rgba(var(--k-color-white-rgb), 0.06);
}

.member-main,
.member-meta {
  display: flex;
  align-items: center;
  gap: 14px;
}

.member-meta {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.member-project-access {
  display: flex;
  flex-direction: column;
  gap: var(--k-space-4);
  padding-top: 8px;
  border-top: 1px solid rgba(var(--k-color-white-rgb), 0.06);
}

.member-project-access-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--k-space-4);
}

.member-project-access-title {
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--k-color-primary);
}

.member-project-access-subtitle {
  margin-top: 6px;
  color: var(--k-text-dim);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-main);
}

.member-project-assignment-controls {
  display: flex;
  gap: var(--k-space-3);
  flex-wrap: wrap;
  justify-content: flex-end;
}

.project-assignment-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.project-assignment-card {
  padding: var(--k-space-4);
  border: 1px solid rgba(var(--k-color-white-rgb), 0.08);
  background: var(--k-color-tertiary);
  display: flex;
  flex-direction: column;
  gap: var(--k-space-4);
}

.project-assignment-head,
.project-assignment-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--k-space-3);
}

.permission-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--k-space-3);
}

.permission-toggle {
  display: flex;
  flex-direction: column;
  gap: var(--k-space-1);
  padding: var(--k-space-3);
  border: 1px solid rgba(var(--k-color-white-rgb), 0.08);
  background: var(--k-color-tertiary);
  cursor: pointer;
}

.permission-toggle input {
  accent-color: var(--k-color-primary);
}

.permission-name {
  color: var(--k-color-text);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-main);
  font-weight: 600;
}

.permission-description {
  color: var(--k-text-dim);
  font-family: var(--k-font-sans);
  line-height: 1.5;
}

.member-avatar {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--k-color-primary-rgb), 0.12);
  border: 1px solid rgba(var(--k-color-primary-rgb), 0.2);
  color: var(--k-color-primary);
  font-weight: 700;
}

.member-info {
  display: flex;
  flex-direction: column;
}

.member-name {
  font-family: var(--k-font-sans);
  color: var(--k-color-text);
}

.role-chip.owner {
  color: var(--k-color-primary);
}

/* TODO SCRUM-15: la codificacion por rol usa azul/rojo/verde claros que no
   existen en la paleta v2 (no hay azul, y los tokens de estado son semanticos:
   error/exito, no etiquetas de rol). Pendiente de definicion con Diseno. */
.role-chip.admin {
  color: #93c5fd;
}

.role-chip.manager {
  color: #fca5a5;
}

.role-chip.collaborator {
  color: #86efac;
}

.role-select {
  padding: var(--k-space-3) 14px;
  background: var(--k-color-tertiary);
  border: 1px solid rgba(var(--k-color-white-rgb), 0.12);
  color: var(--k-color-text);
}

@media (max-width: 1100px) {
  .content {
    padding: 60px;
  }
}

@media (max-width: 900px) {
  .content {
    padding: 40px 32px;
  }

  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .charts-container,
  .team-grid {
    flex-direction: column;
    grid-template-columns: 1fr;
  }

  .ai-box {
    flex-direction: column;
    align-items: flex-start;
    padding: 28px;
    gap: 20px;
  }

  .ai-box :deep(.btn) {
    align-self: flex-start;
  }

  .team-header {
    flex-direction: column;
  }

  .team-summary {
    justify-content: flex-start;
  }
}

@media (max-width: 600px) {
  .content {
    padding: var(--k-space-5) 16px;
  }

  .subtitle {
    margin-bottom: var(--k-space-5);
  }

  .kpi-grid {
    grid-template-columns: 1fr;
    gap: var(--k-space-3);
    margin-bottom: var(--k-space-5);
  }

  .ai-box {
    padding: 20px;
  }

  .company-collaborators {
    padding: 20px 16px;
  }

  .member-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .member-meta {
    width: 100%;
    justify-content: flex-start;
  }

  .member-project-access-head,
  .project-assignment-head,
  .project-assignment-actions {
    flex-direction: column;
    align-items: flex-start;
  }

  .permission-grid {
    grid-template-columns: 1fr;
  }
}
</style>
