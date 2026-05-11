<template>
  <div class="reports-root">
    <AppNavbar />

    <div class="reports-layout">
      <main class="main-panel">
        <ReportsHeader />

        <ReportsFilterBar v-model="activeFilter" :filters="filters" />

        <ReportsKpiGrid
          :loading="loading"
          :project-count="projects.length"
          :completed-count="completedCount"
          :total-budget="totalBudget"
        />

        <div v-if="fetchError" class="state-error">
          {{ fetchError }}
        </div>

        <ReportsTable
          :projects="displayedProjects"
          :loading="loading"
          @open="goToDetail"
        />

        <ReportsPerformanceChart />
      </main>

      <ReportsAssistantPanel v-model="aiEnabled" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppNavbar from '../components/AppNavbar.vue'
import ReportsAssistantPanel from '../components/reports/ReportsAssistantPanel.vue'
import ReportsFilterBar from '../components/reports/ReportsFilterBar.vue'
import ReportsHeader from '../components/reports/ReportsHeader.vue'
import ReportsKpiGrid from '../components/reports/ReportsKpiGrid.vue'
import ReportsPerformanceChart from '../components/reports/ReportsPerformanceChart.vue'
import ReportsTable from '../components/reports/ReportsTable.vue'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const projects = ref([])
const loading = ref(true)
const fetchError = ref(null)
const activeFilter = ref('all')
const aiEnabled = ref(true)

const filters = [
  { key: 'all', label: 'All Projects' },
  { key: 'active', label: 'Active' },
  { key: 'last30', label: 'Last 30 Days' },
  { key: 'completed', label: 'Completed' },
]

function authHeader() {
  const headers = {}
  const token = authStore.token || localStorage.getItem('token')
  if (token) headers.Authorization = `Bearer ${token}`
  if (authStore.idEmpresaActual) headers['X-Company-ID'] = authStore.idEmpresaActual
  return headers
}

async function loadProjects() {
  loading.value = true
  fetchError.value = null
  try {
    const params = new URLSearchParams({ page: 1, limit: 50 })
    const companyId = authStore.idEmpresaActual || authStore.idEmpresa
    if (companyId) params.set('id_empresa', companyId)
    const res = await fetch(`/api/projects?${params}`, { headers: authHeader() })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.message || `Error ${res.status}`)
    projects.value = json.data ?? []
  } catch (error) {
    fetchError.value = error.message
  } finally {
    loading.value = false
  }
}

onMounted(loadProjects)

const displayedProjects = computed(() => {
  if (activeFilter.value === 'active') {
    return projects.value.filter(project =>
      ['EN_PROGRESO', 'PLANIFICADO', 'PAUSADO'].includes(project.estado)
    )
  }
  if (activeFilter.value === 'completed') {
    return projects.value.filter(project => project.estado === 'COMPLETADO')
  }
  if (activeFilter.value === 'last30') {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    return projects.value.filter(project => new Date(project.fecha_inicio) >= cutoff)
  }
  return projects.value
})

const completedCount = computed(() =>
  projects.value.filter(project => project.estado === 'COMPLETADO').length
)

const totalBudget = computed(() =>
  projects.value.reduce((sum, project) => sum + (parseFloat(project.presupuesto_total) || 0), 0)
)

function goToDetail(id) {
  router.push({ name: 'report-detail', params: { id } })
}
</script>

<style scoped>
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

.main-panel {
  padding: 32px 32px 48px;
  border-right: 1px solid #1e1e1e;
  overflow-y: auto;
  background: rgba(10,10,10,0.82);
}

.state-error {
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px solid rgba(251,113,133,0.45);
  background: rgba(251,113,133,0.1);
  color: #fecdd3;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
}

@media (max-width: 1100px) {
  .reports-layout { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .main-panel { padding: 20px 16px 32px; }
}
</style>
