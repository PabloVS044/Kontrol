<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppNavbar from '../components/AppNavbar.vue'
import Button from '../components/UI/Button/Button.vue'

const route = useRoute()
const authStore = useAuthStore()

const projects = ref([])
const selectedProjectId = ref(null)
const summary = ref(null)
const loading = ref(false)
const error = ref(null)

// Modals
const showActivityModal = ref(false)
const showExpenseModal = ref(false)
const modalLoading = ref(false)
const modalError = ref(null)
const editingActivity = ref(null)

const activityForm = ref({ nombre: '', monto_planificado: null, monto_real: null })
const expenseForm  = ref({ nombre_actividad: '', monto_gasto: null })

const DONUT_CIRCUMFERENCE = 2 * Math.PI * 40 // r=40

function authHeader() {
  const token   = localStorage.getItem('token')
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  if (authStore.idEmpresaActual) headers['X-Empresa-ID'] = authStore.idEmpresaActual
  return headers
}

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...authHeader(), ...(options.headers || {}) },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

async function loadProjects() {
  if (!authStore.user) await authStore.fetchMe()
  // Ensure we have empresas loaded (router guard already does this, but be defensive on hot reload)
  if (!authStore.empresas.length) await authStore.loadEmpresas()

  const params = new URLSearchParams({ limit: 100 })
  const res = await apiFetch(`/api/projects?${params}`)
  projects.value = res.data
  if (projects.value.length) {
    const queryPid = Number(route.query.project)
    const stillValid = projects.value.some(p => p.id_proyecto === selectedProjectId.value)
    if (!stillValid) {
      selectedProjectId.value =
        (queryPid && projects.value.some(p => p.id_proyecto === queryPid))
          ? queryPid
          : projects.value[0].id_proyecto
    }
  } else {
    selectedProjectId.value = null
    summary.value = null
  }
}

async function loadSummary() {
  if (!selectedProjectId.value) return
  loading.value = true
  error.value = null
  try {
    const res = await apiFetch(`/api/budgets/project/${selectedProjectId.value}/summary`)
    summary.value = res.data
  } catch (err) {
    error.value = err.message
    summary.value = null
  } finally {
    loading.value = false
  }
}

async function reloadAll() {
  try { await loadProjects() } catch (err) { error.value = err.message }
  await loadSummary()
}

onMounted(reloadAll)

// Reload when the active empresa changes (workspace switch)
watch(() => authStore.idEmpresaActual, reloadAll)

// Reload summary when project selection changes
watch(selectedProjectId, loadSummary)

// Derived values
const totalAllocated = computed(() => summary.value?.presupuesto_total ?? 0)
const totalGastado   = computed(() => summary.value?.total_gastado ?? 0)
const remaining      = computed(() => summary.value?.disponible ?? 0)
const usageRatio     = computed(() => summary.value?.porcentaje_uso ?? 0) // 0..1 (raw)
const completedPct   = computed(() => {
  const pct = usageRatio.value * 100
  if (pct <= 0) return 0
  if (pct < 1)  return Math.round(pct * 10) / 10 // 1 decimal for <1%
  return Math.round(Math.min(100, pct))
})
const activities     = computed(() => summary.value?.actividades ?? [])
const alerta         = computed(() => summary.value?.alerta ?? null)
const alertaNivel    = computed(() => summary.value?.alerta_nivel ?? null)

const activitiesWithPct = computed(() => {
  const totalPlan = activities.value.reduce(
    (s, a) => s + parseFloat(a.monto_planificado || 0), 0,
  )
  if (!totalPlan) return activities.value.map(a => ({ ...a, percentage: 0 }))
  return activities.value.map(a => ({
    ...a,
    percentage: Math.round((parseFloat(a.monto_planificado || 0) / totalPlan) * 100),
  }))
})

function formatMoney(v) {
  const n = Number(v || 0)
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Activity CRUD ─────────────────────────────────────────────────────────────

function openNewActivity() {
  editingActivity.value = null
  activityForm.value = { nombre: '', monto_planificado: null, monto_real: null }
  modalError.value = null
  showActivityModal.value = true
}

function openEditActivity(act) {
  editingActivity.value = act
  activityForm.value = {
    nombre:            act.nombre,
    monto_planificado: parseFloat(act.monto_planificado),
    monto_real:        act.monto_real != null ? parseFloat(act.monto_real) : null,
  }
  modalError.value = null
  showActivityModal.value = true
}

async function submitActivity() {
  modalLoading.value = true
  modalError.value = null
  try {
    if (editingActivity.value) {
      const body = {
        nombre: activityForm.value.nombre,
        monto_planificado: activityForm.value.monto_planificado,
      }
      if (activityForm.value.monto_real !== null && activityForm.value.monto_real !== '') {
        body.monto_real = activityForm.value.monto_real
      }
      await apiFetch(`/api/budgets/${editingActivity.value.id_actividad}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      })
    } else {
      const body = {
        nombre:            activityForm.value.nombre,
        monto_planificado: activityForm.value.monto_planificado,
        id_proyecto:       selectedProjectId.value,
      }
      if (activityForm.value.monto_real !== null && activityForm.value.monto_real !== '') {
        body.monto_real = activityForm.value.monto_real
      }
      await apiFetch('/api/budgets', { method: 'POST', body: JSON.stringify(body) })
    }
    showActivityModal.value = false
    await loadSummary()
  } catch (err) {
    modalError.value = err.message
  } finally {
    modalLoading.value = false
  }
}

async function deleteActivity(act) {
  if (!confirm(`Delete activity "${act.nombre}"?`)) return
  try {
    await apiFetch(`/api/budgets/${act.id_actividad}`, { method: 'DELETE' })
    await loadSummary()
  } catch (err) {
    error.value = err.message
  }
}

// ── Expense registration ──────────────────────────────────────────────────────

function openExpense() {
  expenseForm.value = { nombre_actividad: '', monto_gasto: null }
  modalError.value = null
  showExpenseModal.value = true
}

async function submitExpense() {
  modalLoading.value = true
  modalError.value = null
  try {
    await apiFetch('/api/budgets/register-expense', {
      method: 'POST',
      body: JSON.stringify({
        id_proyecto:      selectedProjectId.value,
        nombre_actividad: expenseForm.value.nombre_actividad,
        monto_gasto:      expenseForm.value.monto_gasto,
      }),
    })
    showExpenseModal.value = false
    await loadSummary()
  } catch (err) {
    modalError.value = err.message
  } finally {
    modalLoading.value = false
  }
}
</script>

<template>
  <div class="budget-layout">
    <AppNavbar />

    <!-- Activity Modal -->
    <Teleport to="body">
      <div v-if="showActivityModal" class="modal-overlay" @click.self="showActivityModal = false">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-title">{{ editingActivity ? 'Edit activity' : 'New activity' }}</span>
            <button class="modal-close" @click="showActivityModal = false">×</button>
          </div>
          <form class="modal-form" @submit.prevent="submitActivity">
            <div class="form-field">
              <label>Name <span class="req">*</span></label>
              <input v-model="activityForm.nombre" type="text" required />
            </div>
            <div class="form-row">
              <div class="form-field">
                <label>Planned <span class="req">*</span></label>
                <input v-model.number="activityForm.monto_planificado" type="number" min="0" step="0.01" required />
              </div>
              <div class="form-field">
                <label>Actual</label>
                <input v-model.number="activityForm.monto_real" type="number" min="0" step="0.01" />
              </div>
            </div>
            <p v-if="modalError" class="modal-error">{{ modalError }}</p>
            <div class="modal-actions">
              <Button label="Cancel" type="button" @click="showActivityModal = false" />
              <Button :label="modalLoading ? 'Saving…' : 'Save'" type="submit" :disabled="modalLoading" />
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Expense Modal -->
    <Teleport to="body">
      <div v-if="showExpenseModal" class="modal-overlay" @click.self="showExpenseModal = false">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-title">Register expense</span>
            <button class="modal-close" @click="showExpenseModal = false">×</button>
          </div>
          <form class="modal-form" @submit.prevent="submitExpense">
            <div class="form-field">
              <label>Activity name <span class="req">*</span></label>
              <input v-model="expenseForm.nombre_actividad" type="text" minlength="3" required
                     placeholder="Existing activity or new one" />
              <p class="hint">If it exists, the amount is accumulated. Otherwise a new activity is created (planned = 0).</p>
            </div>
            <div class="form-field">
              <label>Amount <span class="req">*</span></label>
              <input v-model.number="expenseForm.monto_gasto" type="number" min="0" step="0.01" required />
            </div>
            <p v-if="modalError" class="modal-error">{{ modalError }}</p>
            <div class="modal-actions">
              <Button label="Cancel" type="button" @click="showExpenseModal = false" />
              <Button :label="modalLoading ? 'Saving…' : 'Register'" type="submit" :disabled="modalLoading" />
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <main class="content">
      <header class="header">
        <div>
          <h1 class="title">Budget Management</h1>
        </div>
        <div class="header-actions">
          <select v-model="selectedProjectId" class="project-select">
            <option v-for="p in projects" :key="p.id_proyecto" :value="p.id_proyecto">
              {{ p.nombre }}
            </option>
          </select>
          <Button label="+ Activity" @click="openNewActivity" :disabled="!selectedProjectId" />
          <Button label="↑ Expense" @click="openExpense" :disabled="!selectedProjectId" />
        </div>
      </header>

      <div v-if="error" class="state-msg error">{{ error }}</div>

      <div v-if="loading" class="state-msg">Loading…</div>

      <div v-else-if="summary" class="main-grid">
        <!-- LEFT PANEL -->
        <div class="left-panel">
          <section class="summary-card">
            <div class="summary-info">
              <h2 class="card-title">Budget Summary</h2>
              <div class="amount-group">
                <span class="label">Total Allocated</span>
                <h3 class="total-value">${{ formatMoney(totalAllocated) }}</h3>
              </div>
              <div class="amount-group">
                <span class="label">Spent</span>
                <h3 class="spent-value">${{ formatMoney(totalGastado) }}</h3>
              </div>
              <div class="amount-group">
                <span class="label gold">Remaining</span>
                <h3 class="remaining-value gold">${{ formatMoney(remaining) }}</h3>
              </div>
            </div>

            <div class="chart-donut">
              <svg viewBox="0 0 100 100">
                <circle class="circle-bg" cx="50" cy="50" r="40" />
                <circle
                  class="circle-progress"
                  cx="50" cy="50" r="40"
                  :stroke-dasharray="DONUT_CIRCUMFERENCE"
                  :stroke-dashoffset="DONUT_CIRCUMFERENCE * (1 - Math.min(1, usageRatio))"
                />
              </svg>
              <div class="donut-text">
                <span class="p-label">Used</span>
                <span class="p-value">{{ completedPct }}%</span>
              </div>
            </div>
          </section>

          <section class="distribution-section">
            <div class="section-header">
              <h2 class="section-subtitle">BUDGET DISTRIBUTION BY ACTIVITY</h2>
            </div>

            <div v-if="!activitiesWithPct.length" class="empty-hint">
              No activities yet. Create one to start tracking your budget.
            </div>

            <div v-for="act in activitiesWithPct" :key="act.id_actividad" class="bar-item">
              <div class="bar-header">
                <span class="bar-name">{{ act.nombre }}</span>
                <span class="bar-right">
                  <span class="gold">{{ act.percentage }}%</span>
                  <button class="row-btn" @click="openEditActivity(act)" title="Edit">✎</button>
                  <button class="row-btn danger" @click="deleteActivity(act)" title="Delete">×</button>
                </span>
              </div>
              <div class="bar-amounts">
                <span>Planned: ${{ formatMoney(act.monto_planificado) }}</span>
                <span>Actual: ${{ formatMoney(act.monto_real || 0) }}</span>
              </div>
              <div class="bar-container">
                <div class="bar-fill" :style="{ width: act.percentage + '%' }"></div>
              </div>
            </div>
          </section>
        </div>

        <!-- RIGHT PANEL -->
        <div class="right-panel">
          <div class="ai-insight-box">
            <h4 class="gold">Budget Health</h4>
            <p v-if="totalAllocated > 0">
              Project <strong>{{ summary.proyecto?.nombre }}</strong> has used
              <strong class="gold">{{ completedPct }}%</strong> of its allocated budget
              (${{ formatMoney(totalGastado) }} / ${{ formatMoney(totalAllocated) }}).
            </p>
            <p v-else>This project has no budget allocated yet.</p>
          </div>

          <section class="monitoring-section">
            <h2 class="section-subtitle">Overrun Monitoring</h2>

            <div v-if="alerta" class="alert-box" :class="{ critical: alertaNivel === 'CRITICO' }">
              <div class="alert-content">
                <div class="alert-header">
                  <span class="icon">⚠</span>
                  <strong>{{ alertaNivel === 'CRITICO' ? 'Critical' : 'Warning' }}</strong>
                </div>
                <p>{{ alerta }}</p>
              </div>
            </div>
            <div v-else class="alert-ok">
              <strong>✓ On track.</strong> No budget overrun detected.
            </div>

            <div class="trend-chart">
              <p class="chart-label">Planned vs Actual (by activity)</p>
              <div v-for="act in activities" :key="'m' + act.id_actividad" class="mini-row">
                <span class="mini-name">{{ act.nombre }}</span>
                <div class="mini-bars">
                  <div class="mini-bar">
                    <div class="mini-fill planned"
                         :style="{ width: Math.min(100, (parseFloat(act.monto_planificado) / (totalAllocated || 1)) * 100) + '%' }"></div>
                  </div>
                  <div class="mini-bar">
                    <div class="mini-fill actual"
                         :style="{ width: Math.min(100, (parseFloat(act.monto_real || 0) / (totalAllocated || 1)) * 100) + '%' }"></div>
                  </div>
                </div>
              </div>
              <div class="chart-legend">
                <span><i class="dot gray"></i> Planned</span>
                <span><i class="dot gold"></i> Actual</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Manrope:wght@400;500;600&display=swap');

.budget-layout { min-height: 100vh; color: #faf8f5; font-family: 'Manrope', sans-serif; background: transparent; }
.content { padding: 80px 56px 48px; max-width: 1400px; margin: 0 auto; }

.header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 32px; gap: 16px; flex-wrap: wrap; }
.title { font-family: 'Playfair Display', serif; font-size: 42px; font-weight: 400; color: #faf8f5; }

.header-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.project-select {
  background: rgba(10,10,10,0.9); border: 1px solid #3a3a3a; color: #faf8f5;
  padding: 10px 12px; font-size: 13px; font-family: 'Manrope', sans-serif;
  outline: none; min-width: 220px;
}
.project-select:focus { border-color: #c9a962; }
.project-select option { background: #0f0f0f; }

.state-msg { padding: 40px; text-align: center; color: #b0b0b0; }
.state-msg.error { color: #fb7185; }

.main-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 40px; }
@media (max-width: 1000px) { .main-grid { grid-template-columns: 1fr; } }

/* SUMMARY CARD */
.summary-card {
  background: rgba(12,12,12,0.88); border: 1px solid #2a2a2a;
  padding: 32px; display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 32px; gap: 24px; flex-wrap: wrap;
}
.summary-info { flex: 1; min-width: 240px; }
.card-title { font-family: 'Playfair Display', serif; font-size: 24px; margin-bottom: 22px; color: #faf8f5; }
.amount-group { margin-bottom: 14px; }
.label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #a8a8a8; display: block; margin-bottom: 4px; }
.total-value    { font-size: 32px; font-weight: 700; color: #faf8f5; }
.spent-value    { font-size: 22px; font-weight: 600; color: #faf8f5; }
.remaining-value{ font-size: 26px; font-weight: 700; }

.chart-donut { width: 180px; height: 180px; position: relative; flex-shrink: 0; }
.chart-donut svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.circle-bg       { fill: none; stroke: #242424; stroke-width: 8; }
.circle-progress { fill: none; stroke: #c9a962; stroke-width: 8; stroke-linecap: round;
                   transition: stroke-dashoffset 0.6s ease; }
.donut-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
.p-label { font-size: 10px; letter-spacing: 0.1em; color: #a8a8a8; display: block; }
.p-value { font-size: 22px; font-weight: 700; color: #faf8f5; }

/* Distribution */
.distribution-section { background: rgba(12,12,12,0.85); border: 1px solid #2a2a2a; padding: 24px; }
.section-header { display: flex; justify-content: space-between; margin-bottom: 20px; }
.section-subtitle { letter-spacing: 0.15em; font-size: 11px; color: #c9a962; font-weight: 600; }
.empty-hint { color: #a8a8a8; font-size: 13px; padding: 20px 0; }
.bar-item { margin-bottom: 22px; }
.bar-header { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; align-items: center; gap: 8px; }
.bar-name { color: #faf8f5; font-weight: 500; }
.bar-right { display: flex; align-items: center; gap: 10px; }
.row-btn {
  background: transparent; border: 1px solid #2e2e2e; color: #b8b8b8;
  width: 24px; height: 24px; cursor: pointer; font-size: 12px; line-height: 1;
  display: inline-flex; align-items: center; justify-content: center;
  transition: color 0.15s, border-color 0.15s;
}
.row-btn:hover { color: #c9a962; border-color: #c9a962; }
.row-btn.danger:hover { color: #fb7185; border-color: #fb7185; }
.bar-amounts { display: flex; justify-content: space-between; font-size: 12px; color: #bcbcbc; margin-bottom: 6px; }
.bar-container { background: #202020; height: 10px; border-radius: 5px; overflow: hidden; border: 1px solid #2a2a2a; }
.bar-fill { background: linear-gradient(90deg, #b3904d, #c9a962); height: 100%; transition: width 0.4s; }

/* AI Box */
.ai-insight-box {
  border: 1px dashed #4a4a4a; padding: 20px; background: rgba(10,10,10,0.85);
  margin-bottom: 24px;
}
.ai-insight-box h4 { font-size: 13px; margin-bottom: 8px; letter-spacing: 0.05em; color: #c9a962; }
.ai-insight-box p  { font-size: 12px; color: #d4d4d4; line-height: 1.6; }

.alert-box {
  background: rgba(249,115,22,0.18); border: 1px solid rgba(249,115,22,0.55);
  padding: 16px; border-radius: 4px; margin-bottom: 20px;
}
.alert-box.critical { background: rgba(251,113,133,0.18); border-color: rgba(251,113,133,0.6); }
.alert-header { display: flex; gap: 8px; margin-bottom: 4px; font-size: 13px; color: #faf8f5; font-weight: 600; }
.alert-box p { font-size: 12px; color: #e8e8e8; }
.alert-ok {
  background: rgba(52,211,153,0.12); border: 1px solid rgba(52,211,153,0.4);
  padding: 14px; border-radius: 4px; margin-bottom: 20px; font-size: 13px; color: #6ee7b7;
}

.trend-chart { background: rgba(10,10,10,0.85); border: 1px solid #2a2a2a; padding: 16px; }
.chart-label { font-size: 11px; color: #bcbcbc; margin-bottom: 12px; letter-spacing: 0.05em; }
.mini-row { margin-bottom: 10px; }
.mini-name { font-size: 11px; color: #cfcfcf; display: block; margin-bottom: 4px; }
.mini-bars { display: flex; flex-direction: column; gap: 3px; }
.mini-bar  { height: 5px; background: #1c1c1c; border-radius: 2px; overflow: hidden; border: 1px solid #262626; }
.mini-fill.planned { background: #6b6b6b; height: 100%; }
.mini-fill.actual  { background: #c9a962; height: 100%; }
.chart-legend { display: flex; gap: 20px; margin-top: 12px; font-size: 11px; color: #bcbcbc; }
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 4px; }
.dot.gold { background: #c9a962; }
.dot.gray { background: #6b6b6b; }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
}
.modal {
  background: #0f0f0f; border: 1px solid #1f1f1f;
  width: 100%; max-width: 460px; max-height: 90vh; overflow-y: auto;
}
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 18px 22px; border-bottom: 1px solid #1a1a1a;
}
.modal-title { font-family: 'Playfair Display', serif; font-size: 19px; color: #faf8f5; }
.modal-close {
  background: none; border: none; color: #888; cursor: pointer;
  font-size: 22px; line-height: 1; padding: 0 6px;
}
.modal-form { padding: 22px; display: flex; flex-direction: column; gap: 14px; }
.form-field { display: flex; flex-direction: column; gap: 6px; }
.form-field label { font-size: 11px; letter-spacing: 0.05em; color: #c0c0c0; }
.form-field input, .form-field select {
  background: #0a0a0a; border: 1px solid #1f1f1f; color: #faf8f5;
  font-family: 'Manrope', sans-serif; font-size: 13px; padding: 10px 12px;
  outline: none; transition: border-color 0.15s;
}
.form-field input:focus { border-color: #c9a962; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.req { color: #c9a962; }
.hint { font-size: 11px; color: #a8a8a8; line-height: 1.4; }
.modal-error { font-size: 12px; color: #fb7185; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
.modal-actions :deep(.btn) {
  border-radius: 0; font-family: 'Manrope', sans-serif;
  font-size: 12px; font-weight: 600; padding: 10px 18px;
}
.modal-actions :deep(.btn:first-child) {
  background: transparent; border: 1px solid #1f1f1f; color: #faf8f5;
}
.modal-actions :deep(.btn:last-child) { background: #c9a962; color: #0a0a0a; }
.modal-actions :deep(.btn:last-child:disabled) { opacity: 0.6; }

.header-actions :deep(.btn) {
  border-radius: 0; font-size: 12px; font-weight: 600;
  padding: 10px 16px; background: #c9a962; color: #0a0a0a;
}
.header-actions :deep(.btn:disabled) { opacity: 0.4; cursor: not-allowed; }
</style>
