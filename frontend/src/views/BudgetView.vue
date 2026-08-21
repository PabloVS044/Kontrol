<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppNavbar           from '@/components/AppNavbar.vue'
import Button              from '@/components/UI/Button/Button.vue'
import ProgressBar         from '@/components/UI/ProgressBar/ProgressBar.vue'
import BudgetSummaryCard       from '@/components/budget/BudgetSummaryCard.vue'
import BudgetAlertBox          from '@/components/budget/BudgetAlertBox.vue'
import ActivityRow             from '@/components/budget/ActivityRow.vue'
import SpendingBreakdownCard   from '@/components/budget/SpendingBreakdownCard.vue'
import ProductFinancialsTable  from '@/components/budget/ProductFinancialsTable.vue'
import FundingHistoryCard      from '@/components/budget/FundingHistoryCard.vue'
import ActivityModal           from '@/components/budget/ActivityModal.vue'
import ExpenseModal            from '@/components/budget/ExpenseModal.vue'
import AddFundsModal           from '@/components/budget/AddFundsModal.vue'

const route = useRoute()
const authStore = useAuthStore()
const { t } = useI18n()

const projects = ref([])
const selectedProjectId = ref(null)
const summary = ref(null)
const productsFinancial = ref({ productos: [], totales: {} })
const productsLoading = ref(false)
const fundingHistory = ref([])
const fundingLoading = ref(false)
const loading = ref(false)
const error = ref(null)

const showActivityModal = ref(false)
const showExpenseModal  = ref(false)
const showFundsModal    = ref(false)
const modalLoading      = ref(false)
const modalError        = ref(null)
const editingActivity   = ref(null)

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function authHeader() {
  const token   = localStorage.getItem('token')
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  if (authStore.idEmpresaActual) headers['X-Company-ID'] = authStore.idEmpresaActual
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

// ── Permissions ───────────────────────────────────────────────────────────────
// Write operations (create/edit/delete activity, register expense) require
// company role owner/admin/manager — matches the backend route guards.
const WRITE_ROLES = ['owner', 'admin', 'manager']
const canWriteBudget = computed(() => {
  const rol = authStore.empresaActual?.rol
  return WRITE_ROLES.includes(rol)
})
const canDeleteActivity = computed(() => {
  const rol = authStore.empresaActual?.rol
  return rol === 'owner' || rol === 'admin'
})
// Adjusting allocated capital is a privileged operation — owner/admin only,
// mirroring the backend route guard for POST /budgets/project/:id/funding.
const canAddFunds = computed(() => {
  const rol = authStore.empresaActual?.rol
  return rol === 'owner' || rol === 'admin'
})

// ── Data loading ──────────────────────────────────────────────────────────────

async function loadProjects() {
  if (!authStore.user) await authStore.fetchMe()
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

async function loadProductsFinancial() {
  if (!selectedProjectId.value) {
    productsFinancial.value = { productos: [], totales: {} }
    return
  }
  productsLoading.value = true
  try {
    const res = await apiFetch(
      `/api/budgets/project/${selectedProjectId.value}/products-financial`
    )
    productsFinancial.value = res.data
  } catch (err) {
    productsFinancial.value = { productos: [], totales: {} }
  } finally {
    productsLoading.value = false
  }
}

async function loadFundingHistory() {
  if (!selectedProjectId.value) {
    fundingHistory.value = []
    return
  }
  fundingLoading.value = true
  try {
    const res = await apiFetch(`/api/budgets/project/${selectedProjectId.value}/funding`)
    fundingHistory.value = res.data
  } catch {
    fundingHistory.value = []
  } finally {
    fundingLoading.value = false
  }
}

// Per-activity history lookup, used by ActivityRow when the row is expanded.
async function fetchActivityHistory(activityId) {
  try {
    const res = await apiFetch(`/api/budgets/${activityId}/expenses`)
    return res.data
  } catch {
    return { gastos: [] }
  }
}

async function refreshAllData() {
  await Promise.all([
    loadSummary(),
    loadProductsFinancial(),
    loadFundingHistory(),
  ])
}

async function reloadAll() {
  try { await loadProjects() } catch (err) { error.value = err.message }
  await refreshAllData()
}

onMounted(reloadAll)
watch(() => authStore.idEmpresaActual, reloadAll)
watch(selectedProjectId, refreshAllData)

// ── Derived values ────────────────────────────────────────────────────────────

const selectedProject       = computed(() => projects.value.find(p => p.id_proyecto === selectedProjectId.value))
const totalAllocated        = computed(() => summary.value?.presupuesto_total ?? 0)
const totalGastado          = computed(() => summary.value?.total_gastado ?? 0)
const totalIngresos         = computed(() => summary.value?.total_ingresos ?? 0)
const resultadoNeto         = computed(() => summary.value?.resultado_neto ?? 0)
const totalPlanned          = computed(() => summary.value?.total_planificado ?? 0)
const totalActivities       = computed(() => summary.value?.total_gastado_actividades ?? 0)
const totalInventoryStock   = computed(() => summary.value?.gasto_inventario_compras ?? 0)
const totalInventoryAdmin   = computed(() => summary.value?.gasto_inventario_admin ?? 0)
const remaining             = computed(() => summary.value?.disponible ?? 0)
const usageRatio            = computed(() => summary.value?.porcentaje_uso ?? 0)
const completedPct          = computed(() => {
  const pct = usageRatio.value * 100
  if (pct <= 0) return 0
  if (pct < 1)  return Math.round(pct * 10) / 10
  return Math.round(Math.min(999, pct))
})
const activities            = computed(() => summary.value?.actividades ?? [])
const alerta                = computed(() => summary.value?.alerta ?? null)
const alertaNivel           = computed(() => summary.value?.alerta_nivel ?? null)
const movimientosCompra     = computed(() => summary.value?.movimientos_compra ?? 0)
const movimientosVenta      = computed(() => summary.value?.movimientos_venta ?? 0)
const movimientosAdmin      = computed(() => summary.value?.movimientos_admin ?? 0)
const presupuestoBase       = computed(() => summary.value?.presupuesto_base ?? 0)
const totalAjustes          = computed(() => summary.value?.total_ajustes ?? 0)

const plannedVsBudgetPct = computed(() => {
  if (!totalAllocated.value) return 0
  return Math.min(100, (totalPlanned.value / totalAllocated.value) * 100)
})

function formatMoney(v) {
  const n = Number(v || 0)
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Activity CRUD ─────────────────────────────────────────────────────────────

function openNewActivity() {
  if (!canWriteBudget.value) return
  editingActivity.value = null
  modalError.value = null
  showActivityModal.value = true
}

function openEditActivity(act) {
  if (!canWriteBudget.value) return
  editingActivity.value = act
  modalError.value = null
  showActivityModal.value = true
}

async function submitActivity(payload) {
  modalLoading.value = true
  modalError.value = null
  try {
    const body = {
      nombre: payload.nombre,
      monto_planificado: payload.monto_planificado,
    }
    if (payload.monto_real !== null && payload.monto_real !== '' && payload.monto_real !== undefined) {
      body.monto_real = payload.monto_real
    }

    if (editingActivity.value) {
      await apiFetch(`/api/budgets/${editingActivity.value.id_actividad}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      })
    } else {
      body.projectId = selectedProjectId.value
      await apiFetch('/api/budgets', { method: 'POST', body: JSON.stringify(body) })
    }
    showActivityModal.value = false
    await refreshAllData()
  } catch (err) {
    modalError.value = err.message
  } finally {
    modalLoading.value = false
  }
}

async function deleteActivity(act) {
  if (!canDeleteActivity.value) return
  if (!confirm(t('budget.deleteActivityConfirm', { name: act.nombre }))) return
  try {
    await apiFetch(`/api/budgets/${act.id_actividad}`, { method: 'DELETE' })
    await refreshAllData()
  } catch (err) {
    error.value = err.message
  }
}

// ── Expense registration ──────────────────────────────────────────────────────

function openExpense() {
  if (!canWriteBudget.value) return
  modalError.value = null
  showExpenseModal.value = true
}

async function submitExpense(payload) {
  modalLoading.value = true
  modalError.value = null
  try {
    await apiFetch('/api/budgets/register-expense', {
      method: 'POST',
      body: JSON.stringify({
        projectId:      selectedProjectId.value,
        activityName:   payload.nombre_actividad,
        expenseAmount:  payload.monto_gasto,
        motivo:         payload.motivo,
      }),
    })
    showExpenseModal.value = false
    await refreshAllData()
  } catch (err) {
    modalError.value = err.message
  } finally {
    modalLoading.value = false
  }
}

// ── Funding adjustments ───────────────────────────────────────────────────────

function openAddFunds() {
  if (!canAddFunds.value) return
  modalError.value = null
  showFundsModal.value = true
}

async function submitFunds(payload) {
  modalLoading.value = true
  modalError.value = null
  try {
    await apiFetch(`/api/budgets/project/${selectedProjectId.value}/funding`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    showFundsModal.value = false
    await refreshAllData()
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

    <ActivityModal
      v-model="showActivityModal"
      :editing-activity="editingActivity"
      :submitting="modalLoading"
      :error="modalError"
      @submit="submitActivity"
    />

    <ExpenseModal
      v-model="showExpenseModal"
      :activities="activities"
      :submitting="modalLoading"
      :error="modalError"
      @submit="submitExpense"
    />

    <AddFundsModal
      v-model="showFundsModal"
      :submitting="modalLoading"
      :error="modalError"
      @submit="submitFunds"
    />

    <main class="content">
      <header class="header">
        <div class="header-titles">
          <h1 class="title">{{ $t('budget.header.title') }}</h1>
          <p v-if="selectedProject" class="subtitle">
            {{ selectedProject.nombre }}
            <span v-if="selectedProject.estado" class="estado-tag">{{ selectedProject.estado }}</span>
          </p>
        </div>
        <div class="header-actions">
          <select
            v-model="selectedProjectId"
            class="project-select"
            :disabled="!projects.length"
          >
            <option v-if="!projects.length" :value="null">{{ $t('budget.header.noProjects') }}</option>
            <option v-for="p in projects" :key="p.id_proyecto" :value="p.id_proyecto">
              {{ p.nombre }}
            </option>
          </select>
          <Button
            v-if="canAddFunds"
            data-birdie="add-funds"
            :label="$t('budget.header.addFunds')"
            :disabled="!selectedProjectId"
            @click="openAddFunds"
          />
          <Button
            data-birdie="add-activity"
            :label="$t('budget.header.addActivity')"
            :disabled="!selectedProjectId || !canWriteBudget"
            @click="openNewActivity"
          />
          <Button
            data-birdie="add-expense"
            :label="$t('budget.header.addExpense')"
            :disabled="!selectedProjectId || !canWriteBudget"
            @click="openExpense"
          />
        </div>
      </header>

      <p v-if="!canWriteBudget && selectedProjectId" class="readonly-hint">
        {{ $t('budget.readOnlyHint') }}
      </p>

      <div v-if="error" class="state-msg error">{{ error }}</div>
      <div v-if="loading" class="state-msg">{{ $t('budget.loading') }}</div>

      <div v-else-if="!selectedProjectId" class="state-msg">
        {{ $t('budget.noProject') }}
      </div>

      <template v-else-if="summary">
        <BudgetSummaryCard
          :total-allocated="totalAllocated"
          :total-spent="totalGastado"
          :total-income="totalIngresos"
          :total-planned="totalPlanned"
          :remaining="remaining"
          :net-result="resultadoNeto"
          :usage-ratio="usageRatio"
        />

        <div class="movements-strip" v-if="movimientosCompra + movimientosVenta + movimientosAdmin > 0">
          <div class="mv-chip">
            <span class="mv-dot purchase"></span>
            <span class="mv-label">{{ $t('budget.movements.purchases') }}</span>
            <span class="mv-count">{{ movimientosCompra }}</span>
          </div>
          <div class="mv-chip">
            <span class="mv-dot sale"></span>
            <span class="mv-label">{{ $t('budget.movements.sales') }}</span>
            <span class="mv-count">{{ movimientosVenta }}</span>
          </div>
          <div class="mv-chip">
            <span class="mv-dot admin"></span>
            <span class="mv-label">{{ $t('budget.movements.admin') }}</span>
            <span class="mv-count">{{ movimientosAdmin }}</span>
          </div>
          <p class="mv-hint">
            {{ $t('budget.movements.hint') }}
          </p>
        </div>

        <div class="main-grid">
          <!-- LEFT PANEL -->
          <div class="left-panel">
            <section class="distribution-section">
              <div class="section-header">
                <h2 class="section-subtitle">{{ $t('budget.distribution.title') }}</h2>
                <span class="activities-count" v-if="activities.length">
                  {{ $t('budget.distribution.count', { count: activities.length }) }}
                </span>
              </div>

              <div v-if="totalAllocated > 0" class="planning-row">
                <div class="planning-head">
                  <span>{{ $t('budget.distribution.planningLabel') }}</span>
                  <span class="planning-value">{{ $t('budget.distribution.planningValue', { pct: Math.round(plannedVsBudgetPct) }) }}</span>
                </div>
                <ProgressBar :pct="plannedVsBudgetPct" color="#6b6b6b" height="4px" /> <!-- sin token exacto -->
              </div>

              <div v-if="!activities.length" class="empty-hint">
                {{ $t('budget.distribution.empty') }}
              </div>

              <ActivityRow
                v-for="act in activities"
                :key="act.id_actividad"
                :activity="act"
                :can-edit="canWriteBudget"
                :can-delete="canDeleteActivity"
                :fetch-history="fetchActivityHistory"
                @edit="openEditActivity"
                @delete="deleteActivity"
              />
            </section>

            <ProductFinancialsTable
              :products="productsFinancial.productos"
              :totals="productsFinancial.totales"
              :loading="productsLoading"
            />
          </div>

          <!-- RIGHT PANEL -->
          <div class="right-panel">
            <div class="ai-insight-box">
              <h4 class="gold">{{ $t('budget.health.title') }}</h4>
              <p v-if="totalAllocated > 0">
                {{ $t('budget.health.projectPrefix') }} <strong>{{ summary.proyecto?.nombre }}</strong> {{ $t('budget.health.hasUsed') }}
                <strong :class="usageRatio > 1 ? 'danger' : 'gold'">{{ completedPct }}%</strong>
                {{ $t('budget.health.ofAllocated', { spent: formatMoney(totalGastado), total: formatMoney(totalAllocated) }) }}
                <span v-if="totalAjustes !== 0" class="muted">
                  {{ $t('budget.health.includes') }}
                  <span :class="totalAjustes < 0 ? 'danger' : 'income'">
                    {{ totalAjustes < 0 ? '−' : '+' }}${{ formatMoney(Math.abs(totalAjustes)) }}
                  </span>
                  {{ $t('budget.health.inAdjustments') }}
                </span>
              </p>
              <p v-else>{{ $t('budget.health.noBudget') }}</p>
              <p v-if="totalIngresos > 0" class="health-extra">
                <span class="gold">{{ $t('budget.health.salesLabel') }}</span> ${{ formatMoney(totalIngresos) }} —
                <span :class="resultadoNeto < 0 ? 'danger' : 'income'">
                  {{ resultadoNeto < 0 ? $t('budget.health.loss') : $t('budget.health.profit') }}
                  ${{ formatMoney(Math.abs(resultadoNeto)) }}
                </span>.
              </p>
            </div>

            <BudgetAlertBox :level="alertaNivel" :message="alerta || ''" />

            <FundingHistoryCard
              :history="fundingHistory"
              :presupuesto-base="presupuestoBase"
              :total-ajustes="totalAjustes"
              :loading="fundingLoading"
            />

            <SpendingBreakdownCard
              :total-budget="totalAllocated"
              :total-activities="totalActivities"
              :total-inventory-stock="totalInventoryStock"
              :total-inventory-admin="totalInventoryAdmin"
              :total-income="totalIngresos"
            />
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Manrope:wght@400;500;600&display=swap');

.budget-layout { min-height: 100vh; color: var(--k-color-text); font-family: var(--k-font-sans); background: transparent; }
.content { padding: 80px 56px 48px; max-width: 1400px; margin: 0 auto; }

.header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
.header-titles { display: flex; flex-direction: column; gap: 6px; }
.title { font-family: var(--k-font-display); font-size: var(--k-font-size-display); font-weight: 400; color: var(--k-color-text); }
.subtitle { font-size: var(--k-font-size-body-small); color: var(--k-gray-5); display: inline-flex; gap: 8px; align-items: center; }
.estado-tag {
  font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; /* sin token exacto */
  color: var(--k-color-primary); background: rgba(var(--k-color-primary-rgb), 0.1);
  padding: 2px 8px; border: 1px solid rgba(var(--k-color-primary-rgb), 0.2);
}

.header-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.project-select {
  background: var(--k-shade-1); border: 1px solid #3a3a3a; color: var(--k-color-text); /* sin token exacto */
  padding: 10px 12px; font-size: var(--k-font-size-body-small); font-family: var(--k-font-sans);
  outline: none; min-width: 220px;
}
.project-select:focus    { border-color: var(--k-color-primary); }
.project-select:disabled { opacity: 0.5; cursor: not-allowed; }
.project-select option   { background: var(--k-shade-2); }

.readonly-hint {
  font-size: var(--k-font-size-caption-lg); color: var(--k-gray-5);
  background: rgba(17, 17, 17, 0.92); /* sin triplete rgb declarado para los shades */
  border: 1px solid var(--k-shade-6); border-left: 2px solid var(--k-color-primary);
  padding: 10px 14px; margin-bottom: 20px;
  font-family: var(--k-font-sans);
}

.state-msg { padding: 40px; text-align: center; color: var(--k-gray-5); }
.state-msg.error { color: var(--k-state-error-text); }

.main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: 32px;
}
@media (max-width: 1100px) { .main-grid { grid-template-columns: 1fr; } }

/* Movements strip */
.movements-strip {
  display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
  padding: 12px 16px; margin-bottom: 24px;
  background: rgba(10, 10, 10, 0.92); /* sin triplete rgb declarado para los shades */
  border: 1px solid var(--k-shade-6);
  font-family: var(--k-font-sans);
}
.mv-chip {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 4px 12px;
  background: var(--k-shade-3);
  border: 1px solid var(--k-shade-6);
  font-size: var(--k-font-size-caption);
}
.mv-dot {
  width: 8px; height: 8px; border-radius: 50%; display: inline-block;
}
.mv-dot.purchase { background: var(--k-color-primary); }
.mv-dot.sale     { background: var(--k-state-success-text); }
.mv-dot.admin    { background: #60a5fa; } /* sin token de marca, ver ProjectDetailsView.css .area-badge */
.mv-label  { color: #d4d4d4; letter-spacing: 0.05em; } /* sin token exacto */
.mv-count  {
  color: var(--k-color-text); font-weight: 700; font-variant-numeric: tabular-nums;
  padding-left: 6px; border-left: 1px solid var(--k-shade-7);
}
.mv-hint   {
  font-size: var(--k-font-size-caption); color: var(--k-gray-5); margin: 0 0 0 auto;
  flex: 1 1 200px; min-width: 0;
}
@media (max-width: 600px) {
  .mv-hint { flex: 1 1 100%; margin-left: 0; }
}

.health-extra {
  margin-top: 8px; padding-top: 8px;
  border-top: 1px dashed var(--k-shade-7);
}
.income { color: var(--k-state-success-text); }
.muted { color: var(--k-gray-5); display: block; margin-top: 6px; font-size: var(--k-font-size-caption); }

/* Distribution */
.distribution-section { background: rgba(12, 12, 12, 0.92); border: 1px solid var(--k-shade-7); padding: 24px; } /* sin triplete rgb declarado */
.section-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 16px; gap: 12px;
}
.section-subtitle {
  letter-spacing: 0.15em; font-size: var(--k-font-size-caption); color: var(--k-color-primary);
  font-weight: 600; text-transform: uppercase;
}
.activities-count { font-size: var(--k-font-size-caption); color: var(--k-gray-5); }

.planning-row { margin-bottom: 20px; }
.planning-head {
  display: flex; justify-content: space-between;
  font-size: var(--k-font-size-caption); color: var(--k-gray-5); margin-bottom: 5px;
}
.planning-value { color: var(--k-text-soft); }
.planning-row :deep(.pb-bg) { background: var(--k-shade-4); height: 4px; }
.planning-row :deep(.pb-fill) { height: 100% !important; }

.empty-hint {
  color: var(--k-gray-5); font-size: var(--k-font-size-body-small); padding: 20px 0;
  text-align: center; border: 1px dashed var(--k-shade-7);
}

/* AI Box */
.ai-insight-box {
  border: 1px dashed #4a4a4a; padding: 18px; background: rgba(10, 10, 10, 0.92); /* sin token exacto */
  margin-bottom: 16px;
}
.ai-insight-box h4 {
  font-size: var(--k-font-size-caption-lg); margin-bottom: 8px; letter-spacing: 0.1em;
  color: var(--k-color-primary); text-transform: uppercase;
}
.ai-insight-box p  { font-size: var(--k-font-size-caption-lg); color: #d4d4d4; line-height: 1.6; margin: 0; } /* sin token exacto */
.gold   { color: var(--k-color-primary); }
.danger { color: var(--k-state-error-text); }

.header-actions :deep(.btn) {
  border-radius: 0; font-size: var(--k-font-size-caption-lg); font-weight: 600;
  padding: 10px 16px; background: var(--k-color-primary); color: var(--k-shade-1);
}
.header-actions :deep(.btn:disabled) { opacity: 0.4; cursor: not-allowed; }

@media (max-width: 640px) {
  .content { padding: 70px 20px 32px; }
  .title { font-size: var(--k-font-size-display-2); }
  .header { flex-direction: column; align-items: stretch; }
  .header-actions { width: 100%; }
  .project-select { flex: 1; min-width: 0; }
}
</style>
