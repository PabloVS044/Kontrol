<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AppNavbar from '../components/AppNavbar.vue'
import BaseModal from '../components/UI/Modal/BaseModal.vue'
import Button from '../components/UI/Button/Button.vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const CAMPAIGN_STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'COMPLETED', label: 'Completed' },
]

const PUBLICATION_STATUS_OPTIONS = [
  { value: 'PLANNED', label: 'Planned' },
  { value: 'IN_DESIGN', label: 'In design' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const PLATFORM_OPTIONS = [
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'X', label: 'X' },
  { value: 'YOUTUBE', label: 'YouTube' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'OTHER', label: 'Other' },
]

const FORMAT_OPTIONS = [
  { value: 'POST', label: 'Post' },
  { value: 'STORY', label: 'Story' },
  { value: 'REEL', label: 'Reel' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'CAROUSEL', label: 'Carousel' },
  { value: 'SHORT', label: 'Short' },
  { value: 'AD', label: 'Ad' },
  { value: 'OTHER', label: 'Other' },
]

const loading = ref(false)
const errorMessage = ref('')
const actionMessage = ref('')
const actionError = ref('')
const metricsLoading = ref(false)
const metricsError = ref('')

const projects = ref([])
const campaigns = ref([])
const publications = ref([])
const publicationMetrics = ref({
  publicationId: null,
  summary: { current: null, previous: null, delta: null },
  snapshots: [],
})

const selectedProjectId = ref(null)
const selectedCampaignId = ref(null)
const selectedPublicationId = ref(null)

const showCampaignModal = ref(false)
const showPublicationModal = ref(false)
const showMetricModal = ref(false)
const campaignModalLoading = ref(false)
const publicationModalLoading = ref(false)
const metricModalLoading = ref(false)
const campaignModalError = ref('')
const publicationModalError = ref('')
const metricModalError = ref('')
const editingCampaign = ref(null)
const editingPublication = ref(null)
const editingMetricSnapshot = ref(null)

function dateInputValue(value) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

function datetimeLocalNow() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function datetimeInputValue(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function defaultCampaignForm() {
  return {
    name: '',
    description: '',
    objective: '',
    channel: '',
    status: 'DRAFT',
    projectId: selectedProjectId.value ? String(selectedProjectId.value) : '',
    startDate: '',
    endDate: '',
  }
}

function defaultPublicationForm() {
  return {
    title: '',
    caption: '',
    platform: 'INSTAGRAM',
    format: 'POST',
    status: 'PLANNED',
    campaignId: selectedCampaignId.value ? String(selectedCampaignId.value) : '',
    projectId: selectedProjectId.value ? String(selectedProjectId.value) : '',
    scheduledFor: '',
    publishedAt: '',
    assetUrl: '',
    publicationUrl: '',
    notes: '',
  }
}

function defaultMetricForm() {
  return {
    capturedAt: datetimeLocalNow(),
    impressions: 0,
    reach: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    clicks: 0,
    leads: 0,
    followersGained: 0,
    spend: 0,
    notes: '',
  }
}

const campaignForm = ref(defaultCampaignForm())
const publicationForm = ref(defaultPublicationForm())
const metricForm = ref(defaultMetricForm())

const canManageMarketing = computed(() => authStore.canManageMarketing)
const canDeleteMarketing = computed(() => {
  const role = authStore.accessContext?.empresa?.rol_empresa
  return role === 'owner' || role === 'admin'
})

function authHeaders() {
  const headers = {}
  if (authStore.token) headers.Authorization = `Bearer ${authStore.token}`
  if (authStore.idEmpresaActual) headers['X-Company-ID'] = authStore.idEmpresaActual
  return headers
}

async function apiFetch(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {}),
    },
    ...options,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.message || `HTTP ${response.status}`)
  }

  return payload
}

function resetFeedback() {
  actionMessage.value = ''
  actionError.value = ''
}

function parseSelectId(value) {
  if (!value) return null
  return Number(value)
}

function formatInteger(value) {
  return Number(value || 0).toLocaleString('en-US')
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function formatPercent(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`
}

function formatDate(value) {
  if (!value) return 'No date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No date'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(value) {
  if (!value) return 'No timestamp'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No timestamp'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function campaignStatusLabel(status) {
  return CAMPAIGN_STATUS_OPTIONS.find((option) => option.value === status)?.label || status
}

function publicationStatusLabel(status) {
  return PUBLICATION_STATUS_OPTIONS.find((option) => option.value === status)?.label || status
}

function platformLabel(platform) {
  return PLATFORM_OPTIONS.find((option) => option.value === platform)?.label || platform
}

function formatLabel(format) {
  return FORMAT_OPTIONS.find((option) => option.value === format)?.label || format
}

function campaignTone(status) {
  return {
    DRAFT: 'neutral',
    ACTIVE: 'success',
    PAUSED: 'warm',
    COMPLETED: 'muted',
  }[status] || 'neutral'
}

function publicationTone(status) {
  return {
    PLANNED: 'neutral',
    IN_DESIGN: 'warm',
    SCHEDULED: 'brand',
    PUBLISHED: 'success',
    PAUSED: 'muted',
    CANCELLED: 'danger',
  }[status] || 'neutral'
}

async function loadProjects() {
  const response = await apiFetch('/api/projects?limit=100')
  projects.value = response.data || []
}

async function loadCampaigns() {
  const response = await apiFetch('/api/marketing/campaigns')
  campaigns.value = response.data || []
}

async function loadPublications() {
  const response = await apiFetch('/api/marketing/publications?limit=300')
  publications.value = response.data || []
}

async function loadSelectedPublicationMetrics() {
  if (!selectedPublicationId.value) {
    publicationMetrics.value = {
      publicationId: null,
      summary: { current: null, previous: null, delta: null },
      snapshots: [],
    }
    metricsError.value = ''
    return
  }

  metricsLoading.value = true
  metricsError.value = ''

  try {
    const response = await apiFetch(`/api/marketing/publications/${selectedPublicationId.value}/metrics`)
    publicationMetrics.value = {
      publicationId: selectedPublicationId.value,
      summary: response.data.summary,
      snapshots: response.data.snapshots || [],
    }
  } catch (error) {
    publicationMetrics.value = {
      publicationId: selectedPublicationId.value,
      summary: { current: null, previous: null, delta: null },
      snapshots: [],
    }
    metricsError.value = error.message
  } finally {
    metricsLoading.value = false
  }
}

function ensureSelections() {
  const availableProjectIds = projects.value.map((project) => project.id_proyecto)
  if (!availableProjectIds.includes(selectedProjectId.value)) {
    selectedProjectId.value = availableProjectIds[0] ?? null
  }

  const projectCampaignIds = campaigns.value
    .filter((campaign) => campaign.projectId === selectedProjectId.value)
    .map((campaign) => campaign.id)

  if (!projectCampaignIds.includes(selectedCampaignId.value)) {
    selectedCampaignId.value = projectCampaignIds[0] ?? null
  }

  const campaignPublicationIds = publications.value
    .filter((publication) => publication.campaignId === selectedCampaignId.value)
    .map((publication) => publication.id)

  if (!campaignPublicationIds.includes(selectedPublicationId.value)) {
    selectedPublicationId.value = campaignPublicationIds[0] ?? null
  }
}

async function refreshAll() {
  if (!authStore.token) return

  if (!authStore.empresas.length) {
    await authStore.loadEmpresas()
  }

  if (!authStore.idEmpresaActual) return

  loading.value = true
  errorMessage.value = ''

  try {
    await Promise.all([loadProjects(), loadCampaigns(), loadPublications()])
    ensureSelections()
    await loadSelectedPublicationMetrics()
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

const projectSummaries = computed(() =>
  projects.value.map((project) => {
    const projectCampaigns = campaigns.value.filter((campaign) => campaign.projectId === project.id_proyecto)
    const projectPublications = publications.value.filter((publication) => publication.projectId === project.id_proyecto)

    return {
      id: project.id_proyecto,
      name: project.nombre,
      description: project.descripcion || '',
      campaignsCount: projectCampaigns.length,
      publicationsCount: projectPublications.length,
      scheduledCount: projectPublications.filter((publication) => publication.status === 'SCHEDULED').length,
      publishedCount: projectPublications.filter((publication) => publication.status === 'PUBLISHED').length,
      totals: projectPublications.reduce((accumulator, publication) => {
        const metrics = publication.latestMetrics || {}
        accumulator.impressions += Number(metrics.impressions || 0)
        accumulator.reach += Number(metrics.reach || 0)
        accumulator.clicks += Number(metrics.clicks || 0)
        accumulator.leads += Number(metrics.leads || 0)
        accumulator.engagements += Number(metrics.engagements || 0)
        accumulator.spend += Number(metrics.spend || 0)
        return accumulator
      }, {
        impressions: 0,
        reach: 0,
        clicks: 0,
        leads: 0,
        engagements: 0,
        spend: 0,
      }),
    }
  })
)

const selectedProjectSummary = computed(() =>
  projectSummaries.value.find((project) => project.id === selectedProjectId.value) || null
)

const campaignsBySelectedProject = computed(() =>
  campaigns.value.filter((campaign) => campaign.projectId === selectedProjectId.value)
)

const selectedCampaign = computed(() =>
  campaignsBySelectedProject.value.find((campaign) => campaign.id === selectedCampaignId.value) || null
)

const publicationsBySelectedCampaign = computed(() =>
  publications.value.filter((publication) => publication.campaignId === selectedCampaignId.value)
)

const selectedPublication = computed(() =>
  publicationsBySelectedCampaign.value.find((publication) => publication.id === selectedPublicationId.value) || null
)

const metricSummary = computed(() => publicationMetrics.value.summary || { current: null, previous: null, delta: null })
const metricSnapshots = computed(() => publicationMetrics.value.snapshots || [])

function openNewCampaign() {
  editingCampaign.value = null
  campaignForm.value = defaultCampaignForm()
  campaignModalError.value = ''
  showCampaignModal.value = true
}

function openEditCampaign(campaign) {
  editingCampaign.value = campaign
  campaignForm.value = {
    name: campaign.name,
    description: campaign.description || '',
    objective: campaign.objective || '',
    channel: campaign.channel || '',
    status: campaign.status,
    projectId: campaign.projectId ? String(campaign.projectId) : '',
    startDate: dateInputValue(campaign.startDate),
    endDate: dateInputValue(campaign.endDate),
  }
  campaignModalError.value = ''
  showCampaignModal.value = true
}

function openNewPublication() {
  editingPublication.value = null
  publicationForm.value = defaultPublicationForm()
  publicationModalError.value = ''
  showPublicationModal.value = true
}

function openEditPublication(publication) {
  editingPublication.value = publication
  publicationForm.value = {
    title: publication.title,
    caption: publication.caption || '',
    platform: publication.platform,
    format: publication.format,
    status: publication.status,
    campaignId: publication.campaignId ? String(publication.campaignId) : '',
    projectId: publication.projectId ? String(publication.projectId) : '',
    scheduledFor: datetimeInputValue(publication.scheduledFor),
    publishedAt: datetimeInputValue(publication.publishedAt),
    assetUrl: publication.assetUrl || '',
    publicationUrl: publication.publicationUrl || '',
    notes: publication.notes || '',
  }
  publicationModalError.value = ''
  showPublicationModal.value = true
}

function openNewMetricSnapshot() {
  editingMetricSnapshot.value = null
  metricForm.value = defaultMetricForm()
  metricModalError.value = ''
  showMetricModal.value = true
}

function openEditMetricSnapshot(snapshot) {
  editingMetricSnapshot.value = snapshot
  metricForm.value = {
    capturedAt: datetimeInputValue(snapshot.capturedAt),
    impressions: snapshot.impressions,
    reach: snapshot.reach,
    likes: snapshot.likes,
    comments: snapshot.comments,
    shares: snapshot.shares,
    saves: snapshot.saves,
    clicks: snapshot.clicks,
    leads: snapshot.leads,
    followersGained: snapshot.followersGained,
    spend: snapshot.spend,
    notes: snapshot.notes || '',
  }
  metricModalError.value = ''
  showMetricModal.value = true
}

function campaignPayloadFromForm() {
  return {
    name: campaignForm.value.name,
    description: campaignForm.value.description || null,
    objective: campaignForm.value.objective || null,
    channel: campaignForm.value.channel || null,
    status: campaignForm.value.status,
    projectId: parseSelectId(campaignForm.value.projectId),
    startDate: campaignForm.value.startDate || null,
    endDate: campaignForm.value.endDate || null,
  }
}

function publicationPayloadFromForm() {
  return {
    title: publicationForm.value.title,
    caption: publicationForm.value.caption || null,
    platform: publicationForm.value.platform,
    format: publicationForm.value.format,
    status: publicationForm.value.status,
    campaignId: parseSelectId(publicationForm.value.campaignId),
    projectId: parseSelectId(publicationForm.value.projectId),
    scheduledFor: publicationForm.value.scheduledFor || null,
    publishedAt: publicationForm.value.publishedAt || null,
    assetUrl: publicationForm.value.assetUrl || null,
    publicationUrl: publicationForm.value.publicationUrl || null,
    notes: publicationForm.value.notes || null,
  }
}

function metricPayloadFromForm() {
  return {
    capturedAt: metricForm.value.capturedAt || null,
    impressions: Number(metricForm.value.impressions || 0),
    reach: Number(metricForm.value.reach || 0),
    likes: Number(metricForm.value.likes || 0),
    comments: Number(metricForm.value.comments || 0),
    shares: Number(metricForm.value.shares || 0),
    saves: Number(metricForm.value.saves || 0),
    clicks: Number(metricForm.value.clicks || 0),
    leads: Number(metricForm.value.leads || 0),
    followersGained: Number(metricForm.value.followersGained || 0),
    spend: Number(metricForm.value.spend || 0),
    notes: metricForm.value.notes || null,
  }
}

async function submitCampaign() {
  campaignModalLoading.value = true
  campaignModalError.value = ''

  try {
    const response = await apiFetch(
      editingCampaign.value ? `/api/marketing/campaigns/${editingCampaign.value.id}` : '/api/marketing/campaigns',
      {
        method: editingCampaign.value ? 'PUT' : 'POST',
        body: JSON.stringify(campaignPayloadFromForm()),
      }
    )

    actionMessage.value = editingCampaign.value ? 'Campaign updated.' : 'Campaign created.'
    showCampaignModal.value = false
    selectedProjectId.value = response.data.projectId
    selectedCampaignId.value = response.data.id
    await refreshAll()
  } catch (error) {
    campaignModalError.value = error.message
  } finally {
    campaignModalLoading.value = false
  }
}

async function submitPublication() {
  publicationModalLoading.value = true
  publicationModalError.value = ''

  try {
    const response = await apiFetch(
      editingPublication.value ? `/api/marketing/publications/${editingPublication.value.id}` : '/api/marketing/publications',
      {
        method: editingPublication.value ? 'PUT' : 'POST',
        body: JSON.stringify(publicationPayloadFromForm()),
      }
    )

    actionMessage.value = editingPublication.value ? 'Publication updated.' : 'Publication created.'
    showPublicationModal.value = false
    selectedProjectId.value = response.data.projectId
    selectedCampaignId.value = response.data.campaignId
    selectedPublicationId.value = response.data.id
    await refreshAll()
  } catch (error) {
    publicationModalError.value = error.message
  } finally {
    publicationModalLoading.value = false
  }
}

async function submitMetricSnapshot() {
  if (!selectedPublicationId.value) return

  metricModalLoading.value = true
  metricModalError.value = ''

  try {
    await apiFetch(
      editingMetricSnapshot.value
        ? `/api/marketing/publications/${selectedPublicationId.value}/metrics/${editingMetricSnapshot.value.id}`
        : `/api/marketing/publications/${selectedPublicationId.value}/metrics`,
      {
        method: editingMetricSnapshot.value ? 'PUT' : 'POST',
        body: JSON.stringify(metricPayloadFromForm()),
      }
    )

    actionMessage.value = editingMetricSnapshot.value ? 'Metric snapshot updated.' : 'Metric snapshot saved.'
    showMetricModal.value = false
    await Promise.all([loadCampaigns(), loadPublications(), loadSelectedPublicationMetrics()])
  } catch (error) {
    metricModalError.value = error.message
  } finally {
    metricModalLoading.value = false
  }
}

async function deleteCampaign(campaign) {
  if (!window.confirm(`Delete campaign "${campaign.name}"?`)) return
  resetFeedback()

  try {
    await apiFetch(`/api/marketing/campaigns/${campaign.id}`, { method: 'DELETE' })
    actionMessage.value = 'Campaign deleted.'
    if (selectedCampaignId.value === campaign.id) {
      selectedCampaignId.value = null
    }
    await refreshAll()
  } catch (error) {
    actionError.value = error.message
  }
}

async function deletePublication(publication) {
  if (!window.confirm(`Delete publication "${publication.title}"?`)) return
  resetFeedback()

  try {
    await apiFetch(`/api/marketing/publications/${publication.id}`, { method: 'DELETE' })
    actionMessage.value = 'Publication deleted.'
    if (selectedPublicationId.value === publication.id) {
      selectedPublicationId.value = null
    }
    await refreshAll()
  } catch (error) {
    actionError.value = error.message
  }
}

async function deleteMetricSnapshot(snapshot) {
  if (!selectedPublicationId.value) return
  if (!window.confirm('Delete this metric snapshot?')) return
  resetFeedback()

  try {
    await apiFetch(`/api/marketing/publications/${selectedPublicationId.value}/metrics/${snapshot.id}`, { method: 'DELETE' })
    actionMessage.value = 'Metric snapshot deleted.'
    await Promise.all([loadCampaigns(), loadPublications(), loadSelectedPublicationMetrics()])
  } catch (error) {
    actionError.value = error.message
  }
}

function selectProject(projectId) {
  selectedProjectId.value = projectId
}

function selectCampaign(campaignId) {
  selectedCampaignId.value = campaignId
}

function selectPublication(publicationId) {
  selectedPublicationId.value = publicationId
}

onMounted(refreshAll)

watch(() => authStore.idEmpresaActual, refreshAll)

watch(selectedProjectId, () => {
  const projectCampaignIds = campaigns.value
    .filter((campaign) => campaign.projectId === selectedProjectId.value)
    .map((campaign) => campaign.id)

  if (!projectCampaignIds.includes(selectedCampaignId.value)) {
    selectedCampaignId.value = projectCampaignIds[0] ?? null
  }
})

watch(selectedCampaignId, () => {
  const publicationIds = publications.value
    .filter((publication) => publication.campaignId === selectedCampaignId.value)
    .map((publication) => publication.id)

  if (!publicationIds.includes(selectedPublicationId.value)) {
    selectedPublicationId.value = publicationIds[0] ?? null
  }
})

watch(selectedPublicationId, loadSelectedPublicationMetrics)
</script>

<template>
  <div class="marketing-root">
    <AppNavbar />

    <BaseModal v-model="showCampaignModal" :title="editingCampaign ? 'Edit campaign' : 'New campaign'" max-width="720px">
      <form class="modal-form" @submit.prevent="submitCampaign">
        <div class="form-row">
          <div class="form-field">
            <label>Name</label>
            <input v-model="campaignForm.name" type="text" required placeholder="Summer launch campaign" />
          </div>
          <div class="form-field">
            <label>Project</label>
            <select v-model="campaignForm.projectId" required>
              <option value="" disabled>Select a project</option>
              <option v-for="project in projects" :key="project.id_proyecto" :value="String(project.id_proyecto)">
                {{ project.nombre }}
              </option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>Status</label>
            <select v-model="campaignForm.status">
              <option v-for="option in CAMPAIGN_STATUS_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>
          <div class="form-field">
            <label>Channel</label>
            <input v-model="campaignForm.channel" type="text" placeholder="Instagram + LinkedIn + paid support" />
          </div>
        </div>

        <div class="form-field">
          <label>Objective</label>
          <input v-model="campaignForm.objective" type="text" placeholder="Generate awareness and demos for the new launch" />
        </div>

        <div class="form-field">
          <label>Description</label>
          <textarea v-model="campaignForm.description" rows="4" placeholder="Brief, concept, and campaign context" />
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>Start date</label>
            <input v-model="campaignForm.startDate" type="date" />
          </div>
          <div class="form-field">
            <label>End date</label>
            <input v-model="campaignForm.endDate" type="date" />
          </div>
        </div>

        <p v-if="campaignModalError" class="modal-error">{{ campaignModalError }}</p>

        <div class="modal-actions">
          <Button label="Cancel" type="button" backColor="transparent" hoverBack="rgba(255,255,255,0.08)" @click="showCampaignModal = false" />
          <Button :label="campaignModalLoading ? 'Saving...' : (editingCampaign ? 'Save campaign' : 'Create campaign')" type="submit" :disabled="campaignModalLoading" />
        </div>
      </form>
    </BaseModal>

    <BaseModal v-model="showPublicationModal" :title="editingPublication ? 'Edit publication' : 'New publication'" max-width="820px">
      <form class="modal-form" @submit.prevent="submitPublication">
        <div class="form-row">
          <div class="form-field">
            <label>Title</label>
            <input v-model="publicationForm.title" type="text" required placeholder="Launch teaser week 1" />
          </div>
          <div class="form-field">
            <label>Campaign</label>
            <select v-model="publicationForm.campaignId" required>
              <option value="" disabled>Select a campaign</option>
              <option v-for="campaign in campaignsBySelectedProject" :key="campaign.id" :value="String(campaign.id)">
                {{ campaign.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>Platform</label>
            <select v-model="publicationForm.platform">
              <option v-for="option in PLATFORM_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>
          <div class="form-field">
            <label>Format</label>
            <select v-model="publicationForm.format">
              <option v-for="option in FORMAT_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>Status</label>
            <select v-model="publicationForm.status">
              <option v-for="option in PUBLICATION_STATUS_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>
          <div class="form-field">
            <label>Project</label>
            <select v-model="publicationForm.projectId" required>
              <option v-for="project in projects" :key="project.id_proyecto" :value="String(project.id_proyecto)">
                {{ project.nombre }}
              </option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>Scheduled for</label>
            <input v-model="publicationForm.scheduledFor" type="datetime-local" />
          </div>
          <div class="form-field">
            <label>Published at</label>
            <input v-model="publicationForm.publishedAt" type="datetime-local" />
          </div>
        </div>

        <div class="form-field">
          <label>Caption</label>
          <textarea v-model="publicationForm.caption" rows="5" placeholder="Copy, CTA, hashtags, and notes for the social team" />
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>Asset URL</label>
            <input v-model="publicationForm.assetUrl" type="text" placeholder="Drive, Canva, Figma, or CDN link" />
          </div>
          <div class="form-field">
            <label>Publication URL</label>
            <input v-model="publicationForm.publicationUrl" type="text" placeholder="Link to the live post when published" />
          </div>
        </div>

        <div class="form-field">
          <label>Notes</label>
          <textarea v-model="publicationForm.notes" rows="3" placeholder="Dependencies, review notes, or reminders" />
        </div>

        <p v-if="publicationModalError" class="modal-error">{{ publicationModalError }}</p>

        <div class="modal-actions">
          <Button label="Cancel" type="button" backColor="transparent" hoverBack="rgba(255,255,255,0.08)" @click="showPublicationModal = false" />
          <Button :label="publicationModalLoading ? 'Saving...' : (editingPublication ? 'Save publication' : 'Create publication')" type="submit" :disabled="publicationModalLoading" />
        </div>
      </form>
    </BaseModal>

    <BaseModal v-model="showMetricModal" :title="editingMetricSnapshot ? 'Edit metric snapshot' : 'New metric snapshot'" max-width="900px">
      <form class="modal-form" @submit.prevent="submitMetricSnapshot">
        <div class="form-row">
          <div class="form-field">
            <label>Captured at</label>
            <input v-model="metricForm.capturedAt" type="datetime-local" />
          </div>
          <div class="form-field">
            <label>Spend</label>
            <input v-model.number="metricForm.spend" type="number" min="0" step="0.01" />
          </div>
        </div>

        <div class="metrics-grid">
          <div class="form-field">
            <label>Impressions</label>
            <input v-model.number="metricForm.impressions" type="number" min="0" />
          </div>
          <div class="form-field">
            <label>Reach</label>
            <input v-model.number="metricForm.reach" type="number" min="0" />
          </div>
          <div class="form-field">
            <label>Likes</label>
            <input v-model.number="metricForm.likes" type="number" min="0" />
          </div>
          <div class="form-field">
            <label>Comments</label>
            <input v-model.number="metricForm.comments" type="number" min="0" />
          </div>
          <div class="form-field">
            <label>Shares</label>
            <input v-model.number="metricForm.shares" type="number" min="0" />
          </div>
          <div class="form-field">
            <label>Saves</label>
            <input v-model.number="metricForm.saves" type="number" min="0" />
          </div>
          <div class="form-field">
            <label>Clicks</label>
            <input v-model.number="metricForm.clicks" type="number" min="0" />
          </div>
          <div class="form-field">
            <label>Leads</label>
            <input v-model.number="metricForm.leads" type="number" min="0" />
          </div>
          <div class="form-field">
            <label>Followers gained</label>
            <input v-model.number="metricForm.followersGained" type="number" min="0" />
          </div>
        </div>

        <div class="form-field">
          <label>Notes</label>
          <textarea v-model="metricForm.notes" rows="3" placeholder="Context for this snapshot, paid push, creative change, etc." />
        </div>

        <p v-if="metricModalError" class="modal-error">{{ metricModalError }}</p>

        <div class="modal-actions">
          <Button label="Cancel" type="button" backColor="transparent" hoverBack="rgba(255,255,255,0.08)" @click="showMetricModal = false" />
          <Button :label="metricModalLoading ? 'Saving...' : (editingMetricSnapshot ? 'Save snapshot' : 'Add snapshot')" type="submit" :disabled="metricModalLoading" />
        </div>
      </form>
    </BaseModal>

    <div class="marketing-page">
      <section class="hero-card">
        <div>
          <p class="eyebrow">Project Marketing</p>
          <h1>Campaigns and social tracking, organized by project.</h1>
          <p class="hero-copy">
            Each project in the company can own its campaigns, each campaign can own its publications, and each publication can accumulate metric snapshots over time so the team can track real progress instead of static status notes.
          </p>
        </div>

        <div class="hero-actions">
          <button v-if="canManageMarketing" class="primary-action" @click="openNewCampaign">New campaign</button>
          <button v-if="canManageMarketing && selectedCampaignId" class="ghost-action" @click="openNewPublication">New publication</button>
          <span v-else-if="!canManageMarketing" class="read-only-pill">Read-only access</span>
        </div>
      </section>

      <div v-if="actionMessage || actionError" class="feedback-strip" :class="{ error: actionError }">
        <span>{{ actionError || actionMessage }}</span>
        <button class="mini-action" @click="resetFeedback">Dismiss</button>
      </div>

      <div class="marketing-layout">
        <aside class="sidebar">
          <section class="panel">
            <div class="panel-head">
              <div>
                <p class="panel-kicker">Projects</p>
                <h2>{{ projects.length }} active workspaces</h2>
              </div>
            </div>

            <div v-if="loading" class="state-card compact">
              <p>Loading projects...</p>
            </div>

            <div v-else-if="errorMessage" class="state-card compact error-state">
              <p>{{ errorMessage }}</p>
            </div>

            <div v-else class="project-list">
              <button
                v-for="project in projectSummaries"
                :key="project.id"
                class="project-card"
                :class="{ active: selectedProjectId === project.id }"
                @click="selectProject(project.id)"
              >
                <div class="project-top">
                  <strong>{{ project.name }}</strong>
                  <span>{{ project.campaignsCount }} campaigns</span>
                </div>
                <div class="project-meta">
                  <span>{{ project.publicationsCount }} posts</span>
                  <span>{{ project.publishedCount }} published</span>
                </div>
                <div class="project-metrics">
                  <span>Reach {{ formatInteger(project.totals.reach) }}</span>
                  <span>Leads {{ formatInteger(project.totals.leads) }}</span>
                </div>
              </button>
            </div>
          </section>
        </aside>

        <main class="content-column">
          <section class="stats-grid">
            <article class="stat-card">
              <span class="stat-label">Campaigns</span>
              <strong class="stat-value">{{ selectedProjectSummary?.campaignsCount ?? 0 }}</strong>
              <p class="stat-meta">Campaigns linked to this project</p>
            </article>
            <article class="stat-card">
              <span class="stat-label">Publications</span>
              <strong class="stat-value">{{ selectedProjectSummary?.publicationsCount ?? 0 }}</strong>
              <p class="stat-meta">Social pieces planned or published</p>
            </article>
            <article class="stat-card">
              <span class="stat-label">Reach</span>
              <strong class="stat-value">{{ formatInteger(selectedProjectSummary?.totals.reach ?? 0) }}</strong>
              <p class="stat-meta">Latest reported reach across publications</p>
            </article>
            <article class="stat-card">
              <span class="stat-label">Leads</span>
              <strong class="stat-value">{{ formatInteger(selectedProjectSummary?.totals.leads ?? 0) }}</strong>
              <p class="stat-meta">Accumulated leads attributed to posts</p>
            </article>
          </section>

          <section class="panel">
            <div class="panel-head">
              <div>
                <p class="panel-kicker">Campaigns for {{ selectedProjectSummary?.name || 'project' }}</p>
                <h2>Marketing execution plan</h2>
              </div>
              <button v-if="canManageMarketing" class="mini-action solid" @click="openNewCampaign">Add campaign</button>
            </div>

            <div v-if="campaignsBySelectedProject.length === 0" class="state-card compact">
              <p>No campaigns yet for this project.</p>
            </div>

            <div v-else class="campaign-grid">
              <article
                v-for="campaign in campaignsBySelectedProject"
                :key="campaign.id"
                class="campaign-card"
                :class="{ active: selectedCampaignId === campaign.id }"
                @click="selectCampaign(campaign.id)"
              >
                <div class="campaign-topline">
                  <span class="status-chip" :class="campaignTone(campaign.status)">{{ campaignStatusLabel(campaign.status) }}</span>
                  <span class="campaign-channel">{{ campaign.channel || 'Multi-channel' }}</span>
                </div>
                <h3>{{ campaign.name }}</h3>
                <p>{{ campaign.objective || campaign.description || 'No campaign brief defined yet.' }}</p>
                <div class="campaign-stats">
                  <span>{{ campaign.publicationsCount }} publications</span>
                  <span>{{ campaign.publishedCount }} published</span>
                  <span>{{ formatInteger(campaign.totals.reach) }} reach</span>
                </div>
                <div class="campaign-footer">
                  <span>{{ campaign.startDate ? `${formatDate(campaign.startDate)} - ${formatDate(campaign.endDate)}` : 'No schedule set' }}</span>
                  <div v-if="canManageMarketing" class="inline-actions">
                    <button class="mini-action" @click.stop="openEditCampaign(campaign)">Edit</button>
                    <button v-if="canDeleteMarketing" class="mini-action danger" @click.stop="deleteCampaign(campaign)">Delete</button>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section class="panel">
            <div class="panel-head">
              <div>
                <p class="panel-kicker">Publications</p>
                <h2>{{ selectedCampaign?.name || 'Select a campaign' }}</h2>
              </div>
              <button v-if="canManageMarketing && selectedCampaignId" class="mini-action solid" @click="openNewPublication">Add publication</button>
            </div>

            <div v-if="!selectedCampaignId" class="state-card compact">
              <p>Select a campaign to manage its publication calendar.</p>
            </div>

            <div v-else-if="publicationsBySelectedCampaign.length === 0" class="state-card compact">
              <p>No publications registered for this campaign yet.</p>
            </div>

            <div v-else class="publication-grid">
              <article
                v-for="publication in publicationsBySelectedCampaign"
                :key="publication.id"
                class="publication-card"
                :class="{ active: selectedPublicationId === publication.id }"
                @click="selectPublication(publication.id)"
              >
                <div class="publication-topline">
                  <div class="chip-row">
                    <span class="type-chip">{{ platformLabel(publication.platform) }}</span>
                    <span class="type-chip">{{ formatLabel(publication.format) }}</span>
                  </div>
                  <span class="status-chip" :class="publicationTone(publication.status)">{{ publicationStatusLabel(publication.status) }}</span>
                </div>
                <h3>{{ publication.title }}</h3>
                <p class="publication-caption">{{ publication.caption || publication.notes || 'No caption or notes yet.' }}</p>
                <div class="publication-metrics">
                  <span>Reach {{ formatInteger(publication.latestMetrics.reach) }}</span>
                  <span>Clicks {{ formatInteger(publication.latestMetrics.clicks) }}</span>
                  <span>Leads {{ formatInteger(publication.latestMetrics.leads) }}</span>
                </div>
                <div class="publication-footer">
                  <span>{{ publication.scheduledFor ? `Scheduled ${formatDateTime(publication.scheduledFor)}` : 'No schedule set' }}</span>
                  <div v-if="canManageMarketing" class="inline-actions">
                    <button class="mini-action" @click.stop="openEditPublication(publication)">Edit</button>
                    <button v-if="canDeleteMarketing" class="mini-action danger" @click.stop="deletePublication(publication)">Delete</button>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section class="metrics-layout">
            <section class="panel metrics-main">
              <div class="panel-head">
                <div>
                  <p class="panel-kicker">Performance tracking</p>
                  <h2>{{ selectedPublication?.title || 'Select a publication' }}</h2>
                </div>
                <button v-if="canManageMarketing && selectedPublicationId" class="mini-action solid" @click="openNewMetricSnapshot">Add snapshot</button>
              </div>

              <div v-if="metricsLoading" class="state-card compact">
                <p>Loading metrics...</p>
              </div>

              <div v-else-if="metricsError" class="state-card compact error-state">
                <p>{{ metricsError }}</p>
              </div>

              <div v-else-if="!selectedPublicationId" class="state-card compact">
                <p>Select a publication to review its metric history.</p>
              </div>

              <div v-else>
                <div class="metrics-summary-grid">
                  <article class="metric-card">
                    <span class="metric-label">Impressions</span>
                    <strong>{{ formatInteger(metricSummary.current?.impressions ?? 0) }}</strong>
                  </article>
                  <article class="metric-card">
                    <span class="metric-label">Reach</span>
                    <strong>{{ formatInteger(metricSummary.current?.reach ?? 0) }}</strong>
                  </article>
                  <article class="metric-card">
                    <span class="metric-label">Engagement rate</span>
                    <strong>{{ formatPercent(metricSummary.current?.engagementRate ?? 0) }}</strong>
                  </article>
                  <article class="metric-card">
                    <span class="metric-label">Leads</span>
                    <strong>{{ formatInteger(metricSummary.current?.leads ?? 0) }}</strong>
                  </article>
                </div>

                <div v-if="metricSummary.delta" class="delta-strip">
                  <span>Delta vs previous snapshot</span>
                  <div class="delta-values">
                    <span>Reach {{ metricSummary.delta.reach >= 0 ? '+' : '' }}{{ formatInteger(metricSummary.delta.reach) }}</span>
                    <span>Clicks {{ metricSummary.delta.clicks >= 0 ? '+' : '' }}{{ formatInteger(metricSummary.delta.clicks) }}</span>
                    <span>Leads {{ metricSummary.delta.leads >= 0 ? '+' : '' }}{{ formatInteger(metricSummary.delta.leads) }}</span>
                  </div>
                </div>

                <div v-if="metricSnapshots.length === 0" class="state-card compact">
                  <p>No metric snapshots yet for this publication.</p>
                </div>

                <div v-else class="snapshot-table">
                  <article v-for="snapshot in metricSnapshots" :key="snapshot.id" class="snapshot-row">
                    <div class="snapshot-when">
                      <strong>{{ formatDateTime(snapshot.capturedAt) }}</strong>
                      <span>Saved by {{ snapshot.createdByName }}</span>
                    </div>
                    <div class="snapshot-stats">
                      <span>Reach {{ formatInteger(snapshot.reach) }}</span>
                      <span>Engagements {{ formatInteger(snapshot.engagements) }}</span>
                      <span>Clicks {{ formatInteger(snapshot.clicks) }}</span>
                      <span>Leads {{ formatInteger(snapshot.leads) }}</span>
                    </div>
                    <div class="snapshot-actions">
                      <button v-if="canManageMarketing" class="mini-action" @click="openEditMetricSnapshot(snapshot)">Edit</button>
                      <button v-if="canDeleteMarketing" class="mini-action danger" @click="deleteMetricSnapshot(snapshot)">Delete</button>
                    </div>
                  </article>
                </div>
              </div>
            </section>

            <aside class="panel metrics-side">
              <p class="panel-kicker">Current post summary</p>
              <h2>{{ selectedPublication?.title || 'No publication selected' }}</h2>

              <div v-if="selectedPublication" class="summary-list">
                <div class="summary-row">
                  <span>Status</span>
                  <strong>{{ publicationStatusLabel(selectedPublication.status) }}</strong>
                </div>
                <div class="summary-row">
                  <span>Campaign</span>
                  <strong>{{ selectedPublication.campaignName }}</strong>
                </div>
                <div class="summary-row">
                  <span>Platform</span>
                  <strong>{{ platformLabel(selectedPublication.platform) }}</strong>
                </div>
                <div class="summary-row">
                  <span>Format</span>
                  <strong>{{ formatLabel(selectedPublication.format) }}</strong>
                </div>
                <div class="summary-row">
                  <span>Scheduled</span>
                  <strong>{{ selectedPublication.scheduledFor ? formatDateTime(selectedPublication.scheduledFor) : 'Not scheduled' }}</strong>
                </div>
                <div class="summary-row">
                  <span>Published</span>
                  <strong>{{ selectedPublication.publishedAt ? formatDateTime(selectedPublication.publishedAt) : 'Not published yet' }}</strong>
                </div>
                <div class="summary-row">
                  <span>Snapshots</span>
                  <strong>{{ selectedPublication.latestMetrics.snapshotsCount }}</strong>
                </div>
                <div class="summary-row">
                  <span>Spend</span>
                  <strong>{{ formatMoney(selectedPublication.latestMetrics.spend) }}</strong>
                </div>
                <a v-if="selectedPublication.publicationUrl" class="external-link" :href="selectedPublication.publicationUrl" target="_blank" rel="noreferrer">
                  Open live publication
                </a>
              </div>

              <div v-else class="state-card compact">
                <p>Select a publication card to inspect its metrics and history.</p>
              </div>
            </aside>
          </section>
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
.marketing-root {
  min-height: 100vh;
}

.marketing-page {
  max-width: 1480px;
  margin: 0 auto;
  padding: 94px 20px 36px;
}

.hero-card,
.panel,
.stat-card,
.metric-card,
.state-card {
  background: linear-gradient(180deg, rgba(11, 11, 11, 0.96), rgba(8, 8, 8, 0.94));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 18px 58px rgba(0, 0, 0, 0.24);
}

.hero-card {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(240px, 0.8fr);
  gap: 24px;
  padding: 28px 30px;
  align-items: center;
}

.eyebrow,
.panel-kicker,
.stat-label,
.metric-label {
  margin: 0 0 8px;
  color: var(--Primary);
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.hero-card h1,
.panel h2,
.campaign-card h3,
.publication-card h3 {
  margin: 0;
  color: var(--Text);
  font-family: 'Playfair Display', serif;
}

.hero-card h1 {
  font-size: clamp(2.1rem, 4vw, 3.1rem);
  line-height: 1.05;
}

.hero-copy,
.panel p,
.state-card p,
.campaign-card p,
.publication-caption,
.stat-meta,
.summary-row span,
.snapshot-when span {
  color: #beb8af;
}

.hero-copy {
  margin: 14px 0 0;
  max-width: 840px;
  line-height: 1.6;
}

.hero-actions,
.panel-head,
.publication-topline,
.campaign-topline,
.campaign-footer,
.publication-footer,
.snapshot-row,
.summary-row,
.delta-strip,
.delta-values,
.inline-actions,
.snapshot-actions {
  display: flex;
  gap: 12px;
}

.hero-actions {
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
}

.primary-action,
.ghost-action,
.mini-action,
.project-card,
.campaign-card,
.publication-card,
.form-field input,
.form-field textarea,
.form-field select {
  font: inherit;
}

.primary-action,
.ghost-action,
.mini-action,
.project-card,
.campaign-card,
.publication-card {
  border: 1px solid transparent;
  cursor: pointer;
  transition: 0.18s ease;
}

.primary-action {
  background: #caa860;
  color: #0b0b0b;
  padding: 12px 18px;
  font-weight: 700;
}

.ghost-action,
.mini-action {
  background: #111111;
  color: var(--Text);
  border-color: rgba(255, 255, 255, 0.14);
  padding: 10px 14px;
}

.mini-action.solid {
  background: #caa860;
  color: #f5e3ae;
}

.mini-action.danger {
  border-color: rgba(251, 113, 133, 0.28);
  color: #ffb8c4;
}

.read-only-pill {
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #beb8af;
  padding: 10px 14px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 12px;
}

.feedback-strip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  margin: 18px 0;
  background: #1f6243;
  border: 1px solid rgba(52, 211, 153, 0.3);
  color: #d8fff0;
}

.feedback-strip.error {
  background: #711d29;
  border-color: rgba(251, 113, 133, 0.35);
  color: #ffe4e8;
}

.marketing-layout {
  display: grid;
  grid-template-columns: minmax(270px, 320px) minmax(0, 1fr);
  gap: 18px;
}

.sidebar,
.content-column {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.panel {
  padding: 22px;
}

.panel-head {
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.project-list,
.campaign-grid,
.publication-grid,
.snapshot-table {
  display: grid;
  gap: 12px;
}

.project-card,
.campaign-card,
.publication-card,
.snapshot-row {
  background: #111111;
  border-color: rgba(255, 255, 255, 0.08);
  padding: 16px;
  text-align: left;
}

.project-card.active,
.campaign-card.active,
.publication-card.active {
  border-color: rgba(202, 168, 96, 0.48);
  background: rgba(202, 168, 96, 0.11);
}

.project-top,
.project-meta,
.project-metrics,
.campaign-stats,
.publication-metrics {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.project-top strong,
.campaign-card h3,
.publication-card h3,
.snapshot-when strong,
.summary-row strong {
  color: var(--Text);
}

.project-meta,
.project-metrics,
.campaign-stats,
.publication-metrics,
.campaign-channel,
.campaign-footer span,
.publication-footer span {
  color: #ccc3b7;
  font-size: 13px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.stat-card {
  padding: 18px 20px;
}

.stat-value {
  display: block;
  color: var(--Text);
  font-size: 2rem;
  margin-bottom: 8px;
}

.campaign-grid,
.publication-grid {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.campaign-topline,
.publication-topline,
.campaign-footer,
.publication-footer {
  justify-content: space-between;
  align-items: center;
}

.campaign-card p,
.publication-caption {
  margin: 10px 0 14px;
  line-height: 1.55;
}

.chip-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.type-chip,
.status-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  font-size: 12px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.type-chip {
  background: #111111;
  color: #e8dfcf;
}

.status-chip {
  color: var(--Text);
}

.status-chip.neutral {
  background: #111111;
}

.status-chip.warm {
  background: rgba(251, 191, 36, 0.16);
  color: #f5d27d;
}

.status-chip.brand {
  background: rgba(202, 168, 96, 0.18);
  color: #f1d287;
}

.status-chip.success {
  background: rgba(52, 211, 153, 0.15);
  color: #91f4ca;
}

.status-chip.muted {
  background: rgba(113, 113, 122, 0.2);
  color: #d3d6de;
}

.status-chip.danger {
  background: rgba(251, 113, 133, 0.18);
  color: #ffc1cd;
}

.metrics-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
  gap: 18px;
}

.metrics-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.metric-card {
  padding: 16px;
}

.metric-card strong {
  color: var(--Text);
  font-size: 1.6rem;
}

.delta-strip {
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  margin-bottom: 14px;
  background: #111111;
  color: #d7d0c5;
}

.delta-values {
  flex-wrap: wrap;
}

.snapshot-row {
  justify-content: space-between;
  align-items: center;
}

.snapshot-when,
.snapshot-stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.snapshot-stats {
  flex-direction: row;
  flex-wrap: wrap;
  color: #d7d0c5;
}

.summary-list {
  display: grid;
  gap: 12px;
}

.summary-row {
  justify-content: space-between;
  align-items: center;
}

.external-link {
  color: #e6c87f;
  text-decoration: none;
}

.form-row,
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.metrics-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 24px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-field label {
  color: #f5efe6;
  font-size: 13px;
}

.form-field input,
.form-field textarea,
.form-field select {
  width: 100%;
  background: #111111;
  border: 1px solid rgba(255, 255, 255, 0.09);
  color: var(--Text);
  padding: 12px 14px;
  resize: vertical;
}

.modal-error {
  margin: 0;
  color: #ffb8c4;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.state-card {
  padding: 24px;
  text-align: center;
}

.state-card.compact {
  padding: 18px;
}

.error-state {
  color: #ffe4e8;
}

@media (max-width: 1200px) {
  .marketing-layout,
  .metrics-layout,
  .hero-card {
    grid-template-columns: 1fr;
  }

  .stats-grid,
  .metrics-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .marketing-page {
    padding: 82px 14px 28px;
  }

  .stats-grid,
  .campaign-grid,
  .publication-grid,
  .metrics-summary-grid,
  .form-row,
  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .panel-head,
  .hero-actions,
  .campaign-footer,
  .publication-footer,
  .snapshot-row,
  .delta-strip {
    flex-direction: column;
    align-items: stretch;
  }

  .project-top,
  .project-meta,
  .project-metrics,
  .campaign-stats,
  .publication-metrics,
  .snapshot-stats,
  .summary-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
