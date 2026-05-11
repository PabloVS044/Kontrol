<template>
  <div class="adm-page">
    <div class="adm-header">
      <h1 class="adm-title">Overview</h1>
      <p class="adm-subtitle">Global platform summary</p>
    </div>

    <div v-if="loading" class="adm-loading">Loading...</div>
    <div v-else-if="error" class="adm-error">{{ error }}</div>

    <template v-else>
      <!-- KPI row -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">Companies</span>
          <span class="kpi-value">{{ stats.total_empresas }}</span>
          <span class="kpi-sub">registered</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Active Users</span>
          <span class="kpi-value">{{ stats.total_usuarios }}</span>
          <span class="kpi-sub">{{ activeRate }}% active</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Projects</span>
          <span class="kpi-value">{{ stats.total_proyectos }}</span>
          <span class="kpi-sub">across all companies</span>
        </div>
        <div class="kpi-card kpi-dim">
          <span class="kpi-label">Inactive Users</span>
          <span class="kpi-value">{{ stats.total_usuarios_inactivos }}</span>
          <span class="kpi-sub">deactivated accounts</span>
        </div>
      </div>

      <!-- Charts row -->
      <div class="charts-grid">

        <!-- Top companies by projects -->
        <div class="chart-card">
          <p class="chart-title">Top Companies by Projects</p>
          <div class="bar-list">
            <div v-if="!topCompanies.length" class="chart-empty">No data</div>
            <div v-for="c in topCompanies" :key="c.id_empresa" class="bar-row">
              <span class="bar-label" :title="c.nombre">{{ truncate(c.nombre, 18) }}</span>
              <div class="bar-track">
                <div
                  class="bar-fill"
                  :style="{ width: maxProjects > 0 ? (c.total_proyectos / maxProjects * 100) + '%' : '0%' }"
                />
              </div>
              <span class="bar-val">{{ c.total_proyectos }}</span>
            </div>
          </div>
        </div>

        <!-- Users by role -->
        <div class="chart-card">
          <p class="chart-title">Users by Role</p>
          <div class="donut-wrap">
            <svg width="140" height="140" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r="52" fill="none" stroke="var(--Background3)" stroke-width="20"/>
              <circle
                cx="70" cy="70" r="52"
                fill="none"
                stroke="var(--Primary)"
                stroke-width="20"
                stroke-dasharray="326.7"
                :stroke-dashoffset="adminOffset"
                stroke-linecap="butt"
                transform="rotate(-90 70 70)"
              />
            </svg>
            <div class="donut-center">
              <span class="donut-pct">{{ adminPct }}%</span>
              <span class="donut-sub">admin</span>
            </div>
          </div>
          <div class="legend">
            <div class="legend-item">
              <span class="legend-dot gold"></span>
              <span class="legend-label">Admin</span>
              <span class="legend-val">{{ roleCounts.admin }}</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot dim"></span>
              <span class="legend-label">Usuario</span>
              <span class="legend-val">{{ roleCounts.usuario }}</span>
            </div>
          </div>
        </div>

        <!-- Active vs Inactive -->
        <div class="chart-card">
          <p class="chart-title">User Status</p>
          <div class="status-bars">
            <div class="status-row">
              <span class="status-lbl">Active</span>
              <div class="bar-track">
                <div
                  class="bar-fill green"
                  :style="{ width: totalUsers > 0 ? (stats.total_usuarios / totalUsers * 100) + '%' : '0%' }"
                />
              </div>
              <span class="bar-val">{{ stats.total_usuarios }}</span>
            </div>
            <div class="status-row">
              <span class="status-lbl">Inactive</span>
              <div class="bar-track">
                <div
                  class="bar-fill red"
                  :style="{ width: totalUsers > 0 ? (stats.total_usuarios_inactivos / totalUsers * 100) + '%' : '0%' }"
                />
              </div>
              <span class="bar-val">{{ stats.total_usuarios_inactivos }}</span>
            </div>
          </div>

          <p class="chart-title" style="margin-top: 28px">Top Companies by Members</p>
          <div class="bar-list">
            <div v-if="!topByMembers.length" class="chart-empty">No data</div>
            <div v-for="c in topByMembers" :key="c.id_empresa" class="bar-row">
              <span class="bar-label" :title="c.nombre">{{ truncate(c.nombre, 18) }}</span>
              <div class="bar-track">
                <div
                  class="bar-fill gold"
                  :style="{ width: maxMembers > 0 ? (c.total_miembros / maxMembers * 100) + '%' : '0%' }"
                />
              </div>
              <span class="bar-val">{{ c.total_miembros }}</span>
            </div>
          </div>
        </div>

      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const stats     = ref({})
const companies = ref([])
const users     = ref([])
const loading   = ref(true)
const error     = ref(null)

const totalUsers = computed(() =>
  (stats.value.total_usuarios ?? 0) + (stats.value.total_usuarios_inactivos ?? 0)
)

const activeRate = computed(() => {
  const t = totalUsers.value
  return t > 0 ? Math.round((stats.value.total_usuarios / t) * 100) : 0
})

const topCompanies = computed(() =>
  [...companies.value].sort((a, b) => b.total_proyectos - a.total_proyectos).slice(0, 6)
)

const topByMembers = computed(() =>
  [...companies.value].sort((a, b) => b.total_miembros - a.total_miembros).slice(0, 4)
)

const maxProjects = computed(() => Math.max(...topCompanies.value.map(c => c.total_proyectos), 1))
const maxMembers  = computed(() => Math.max(...topByMembers.value.map(c => c.total_miembros), 1))

const roleCounts = computed(() => {
  const counts = { admin: 0, usuario: 0 }
  for (const u of users.value) {
    if (u.nombre_rol === 'admin') counts.admin++
    else counts.usuario++
  }
  return counts
})

const adminPct = computed(() => {
  const t = users.value.length
  return t > 0 ? Math.round((roleCounts.value.admin / t) * 100) : 0
})

const adminOffset = computed(() => 326.7 - (adminPct.value / 100) * 326.7)

function truncate(str, n) {
  return str.length > n ? str.slice(0, n - 1) + '…' : str
}

onMounted(async () => {
  try {
    const headers = { Authorization: `Bearer ${authStore.token}` }
    const [sRes, cRes, uRes] = await Promise.all([
      fetch('/api/admin/stats',     { headers }),
      fetch('/api/admin/companies', { headers }),
      fetch('/api/admin/users',     { headers }),
    ])
    if (!sRes.ok || !cRes.ok || !uRes.ok) throw new Error('Failed to load data')
    const [s, c, u] = await Promise.all([sRes.json(), cRes.json(), uRes.json()])
    stats.value     = s.data
    companies.value = c.data
    users.value     = u.data
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.adm-page { max-width: 1100px; }

.adm-header { padding-bottom: 2rem; }

.adm-title {
  font-family: 'Playfair Display', serif;
  font-size: 48px;
  font-weight: 400;
  color: var(--Text);
  line-height: 1.1;
  margin: 0;
}

.adm-subtitle {
  padding-top: 0.5rem;
  font-size: 14px;
  color: var(--TextMuted);
  font-family: 'DM Sans', sans-serif;
  margin: 0;
}

.adm-loading { font-size: 0.9rem; color: var(--TextMuted); font-family: 'DM Sans', sans-serif; }
.adm-error   { font-size: 0.9rem; color: var(--ErrorText); font-family: 'DM Sans', sans-serif; }

/* ── KPI row ── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.kpi-card {
  background: var(--Background2);
  border: 1px solid var(--Border);
  border-radius: 10px;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kpi-dim { opacity: 0.65; }

.kpi-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--TextMuted);
  font-family: 'DM Sans', sans-serif;
}

.kpi-value {
  font-size: 2.4rem;
  font-weight: 700;
  color: var(--Primary);
  font-family: 'DM Sans', sans-serif;
  line-height: 1.1;
}

.kpi-sub {
  font-size: 12px;
  color: var(--TextDim);
  font-family: 'DM Sans', sans-serif;
}

/* ── Charts row ── */
.charts-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: 16px;
}

.chart-card {
  background: var(--Background2);
  border: 1px solid var(--Border);
  border-radius: 10px;
  padding: 24px 20px;
}

.chart-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--TextMuted);
  font-family: 'DM Sans', sans-serif;
  margin: 0 0 16px;
}

.chart-empty {
  font-size: 13px;
  color: var(--TextDim);
  font-family: 'DM Sans', sans-serif;
}

/* ── Horizontal bars ── */
.bar-list  { display: flex; flex-direction: column; gap: 10px; }

.bar-row, .status-row {
  display: grid;
  grid-template-columns: 110px 1fr 28px;
  align-items: center;
  gap: 10px;
}

.status-row { grid-template-columns: 60px 1fr 28px; }

.bar-label, .status-lbl {
  font-size: 12px;
  color: var(--TextMuted);
  font-family: 'DM Sans', sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bar-track {
  height: 6px;
  background: var(--Background3);
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: var(--Primary);
  border-radius: 3px;
  transition: width 0.4s ease;
}

.bar-fill.green { background: var(--SuccessText); }
.bar-fill.red   { background: var(--ErrorText); }
.bar-fill.gold  { background: var(--Primary); }

.bar-val {
  font-size: 12px;
  color: var(--TextMuted);
  font-family: 'DM Sans', sans-serif;
  text-align: right;
}

/* ── Status bars ── */
.status-bars { display: flex; flex-direction: column; gap: 10px; }

/* ── Donut chart ── */
.donut-wrap {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
}

.donut-center {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.donut-pct {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--Primary);
  font-family: 'DM Sans', sans-serif;
  line-height: 1;
}

.donut-sub {
  font-size: 11px;
  color: var(--TextDim);
  font-family: 'DM Sans', sans-serif;
}

/* ── Legend ── */
.legend { display: flex; flex-direction: column; gap: 8px; }

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  color: var(--TextMuted);
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-dot.gold { background: var(--Primary); }
.legend-dot.dim  { background: var(--Background3); }

.legend-label { flex: 1; }

.legend-val {
  font-weight: 600;
  color: var(--Text);
}

@media (max-width: 900px) {
  .kpi-grid    { grid-template-columns: 1fr 1fr; }
  .charts-grid { grid-template-columns: 1fr; }
}
</style>
