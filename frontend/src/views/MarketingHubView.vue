<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AppNavbar from '../components/AppNavbar.vue'
import BaseModal from '../components/UI/Modal/BaseModal.vue'
import Button from '../components/UI/Button/Button.vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const ITEM_STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'IN_REVIEW', label: 'In review' },
  { value: 'READY', label: 'Ready' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
]

const CONTENT_TYPE_OPTIONS = [
  { value: 'IDEA', label: 'Idea' },
  { value: 'COPY', label: 'Copy' },
  { value: 'POST', label: 'Post' },
  { value: 'ASSET', label: 'Asset' },
  { value: 'PROPOSAL', label: 'Proposal' },
]

const CAMPAIGN_STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'COMPLETED', label: 'Completed' },
]

const DEFAULT_ITEM_STATUS = 'DRAFT'
const DEFAULT_ITEM_TYPE = 'IDEA'
const DEFAULT_CAMPAIGN_STATUS = 'DRAFT'

const loading = ref(false)
const listError = ref('')
const actionError = ref('')
const actionMessage = ref('')
const generationError = ref('')
const generatingDrafts = ref(false)
const projects = ref([])
const campaigns = ref([])
const items = ref([])
const generatedDrafts = ref([])

const searchTerm = ref('')
const selectedStatus = ref('ALL')
const selectedContentType = ref('ALL')
const selectedCampaignId = ref('ALL')
const selectedProjectId = ref('ALL')

const showItemModal = ref(false)
const showCampaignModal = ref(false)
const itemModalLoading = ref(false)
const campaignModalLoading = ref(false)
const itemModalError = ref('')
const campaignModalError = ref('')
const editingItem = ref(null)
const editingCampaign = ref(null)

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

function defaultItemForm() {
  return {
    title: '',
    description: '',
    content: '',
    status: DEFAULT_ITEM_STATUS,
    contentType: DEFAULT_ITEM_TYPE,
    marketingDate: todayString(),
    campaignId: '',
    projectId: '',
    resourceLink: '',
    originType: 'MANUAL',
  }
}

function defaultCampaignForm() {
  return {
    name: '',
    description: '',
    objective: '',
    channel: '',
    status: DEFAULT_CAMPAIGN_STATUS,
    projectId: '',
    startDate: '',
    endDate: '',
  }
}

function defaultGeneratorForm() {
  return {
    objective: '',
    audience: '',
    tone: '',
    channel: '',
    callToAction: '',
    productName: '',
    contentType: DEFAULT_ITEM_TYPE,
    quantity: 3,
    campaignId: '',
    projectId: '',
  }
}

const itemForm = ref(defaultItemForm())
const campaignForm = ref(defaultCampaignForm())
const generatorForm = ref(defaultGeneratorForm())

const canManageMarketing = computed(() => authStore.canManageMarketing)
const canDeleteMarketing = computed(() => {
  const companyRole = authStore.accessContext?.empresa?.rol_empresa
  return companyRole === 'owner' || companyRole === 'admin'
})
const hasProjects = computed(() => projects.value.length > 0)

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
  actionError.value = ''
  actionMessage.value = ''
}

function parseSelectId(value) {
  if (value === '' || value === 'ALL' || value == null) return null
  return Number(value)
}

function formatDate(value) {
  if (!value) return 'No date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No date'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(value) {
  if (!value) return 'Unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function previewText(value, limit = 220) {
  if (!value) return ''
  if (value.length <= limit) return value
  return `${value.slice(0, limit)}...`
}

function statusLabel(status) {
  return ITEM_STATUS_OPTIONS.find((option) => option.value === status)?.label || status
}

function contentTypeLabel(contentType) {
  return CONTENT_TYPE_OPTIONS.find((option) => option.value === contentType)?.label || contentType
}

function campaignStatusLabel(status) {
  return CAMPAIGN_STATUS_OPTIONS.find((option) => option.value === status)?.label || status
}

function statusTone(status) {
  return {
    DRAFT: 'neutral',
    IN_REVIEW: 'warm',
    READY: 'info',
    SCHEDULED: 'brand',
    PUBLISHED: 'success',
    ARCHIVED: 'muted',
  }[status] || 'neutral'
}

function campaignTone(status) {
  return {
    DRAFT: 'neutral',
    ACTIVE: 'success',
    PAUSED: 'warm',
    COMPLETED: 'muted',
  }[status] || 'neutral'
}

function syncProjectFromCampaign(formRef) {
  const campaignId = parseSelectId(formRef.value.campaignId)
  if (!campaignId) return
  const campaign = campaigns.value.find((entry) => entry.id === campaignId)
  if (campaign?.projectId && !formRef.value.projectId) {
    formRef.value.projectId = String(campaign.projectId)
  }
}

async function loadProjects() {
  const response = await apiFetch('/api/projects?limit=100')
  projects.value = response.data || []
}

async function loadCampaigns() {
  const response = await apiFetch('/api/marketing/campaigns')
  campaigns.value = response.data || []
}

function buildItemsQuery() {
  const params = new URLSearchParams()
  if (selectedStatus.value !== 'ALL') params.set('status', selectedStatus.value)
  if (selectedContentType.value !== 'ALL') params.set('contentType', selectedContentType.value)
  if (selectedCampaignId.value !== 'ALL') params.set('campaignId', selectedCampaignId.value)
  if (selectedProjectId.value !== 'ALL') params.set('projectId', selectedProjectId.value)
  if (searchTerm.value.trim()) params.set('search', searchTerm.value.trim())
  params.set('limit', '150')
  return params.toString()
}

async function loadItems() {
  const query = buildItemsQuery()
  const response = await apiFetch(`/api/marketing/items${query ? `?${query}` : ''}`)
  items.value = response.data || []
}

async function refreshData() {
  if (!authStore.token) return

  if (!authStore.empresas.length) {
    await authStore.loadEmpresas()
  }

  if (!authStore.idEmpresaActual) return

  loading.value = true
  listError.value = ''

  try {
    await Promise.all([loadProjects(), loadCampaigns(), loadItems()])
  } catch (error) {
    listError.value = error.message
  } finally {
    loading.value = false
  }
}

const stats = computed(() => ({
  total: items.value.length,
  drafts: items.value.filter((item) => item.status === 'DRAFT').length,
  scheduled: items.value.filter((item) => item.status === 'SCHEDULED').length,
  published: items.value.filter((item) => item.status === 'PUBLISHED').length,
}))

const selectedCampaignName = computed(() => {
  if (selectedCampaignId.value === 'ALL') return 'All campaigns'
  return campaigns.value.find((campaign) => String(campaign.id) === String(selectedCampaignId.value))?.name || 'Campaign'
})

function openNewItem() {
  editingItem.value = null
  itemForm.value = defaultItemForm()
  itemModalError.value = ''
  showItemModal.value = true
}

function openEditItem(item) {
  editingItem.value = item
  itemForm.value = {
    title: item.title,
    description: item.description || '',
    content: item.content,
    status: item.status,
    contentType: item.contentType,
    marketingDate: item.marketingDate || todayString(),
    campaignId: item.campaignId ? String(item.campaignId) : '',
    projectId: item.projectId ? String(item.projectId) : '',
    resourceLink: item.resourceLink || '',
    originType: item.originType || 'MANUAL',
  }
  itemModalError.value = ''
  showItemModal.value = true
}

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
    startDate: campaign.startDate || '',
    endDate: campaign.endDate || '',
  }
  campaignModalError.value = ''
  showCampaignModal.value = true
}

function itemPayloadFromForm() {
  return {
    title: itemForm.value.title,
    description: itemForm.value.description || null,
    content: itemForm.value.content,
    status: itemForm.value.status,
    contentType: itemForm.value.contentType,
    marketingDate: itemForm.value.marketingDate || null,
    campaignId: parseSelectId(itemForm.value.campaignId),
    projectId: parseSelectId(itemForm.value.projectId),
    resourceLink: itemForm.value.resourceLink || null,
    originType: itemForm.value.originType || 'MANUAL',
  }
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

async function submitItem() {
  itemModalLoading.value = true
  itemModalError.value = ''

  try {
    const path = editingItem.value
      ? `/api/marketing/items/${editingItem.value.id}`
      : '/api/marketing/items'

    await apiFetch(path, {
      method: editingItem.value ? 'PUT' : 'POST',
      body: JSON.stringify(itemPayloadFromForm()),
    })

    actionMessage.value = editingItem.value
      ? 'Marketing item updated.'
      : 'Marketing item created.'

    showItemModal.value = false
    await Promise.all([loadItems(), loadCampaigns()])
  } catch (error) {
    itemModalError.value = error.message
  } finally {
    itemModalLoading.value = false
  }
}

async function submitCampaign() {
  campaignModalLoading.value = true
  campaignModalError.value = ''

  try {
    const path = editingCampaign.value
      ? `/api/marketing/campaigns/${editingCampaign.value.id}`
      : '/api/marketing/campaigns'

    await apiFetch(path, {
      method: editingCampaign.value ? 'PUT' : 'POST',
      body: JSON.stringify(campaignPayloadFromForm()),
    })

    actionMessage.value = editingCampaign.value
      ? 'Campaign updated.'
      : 'Campaign created.'

    showCampaignModal.value = false
    await Promise.all([loadCampaigns(), loadItems()])
  } catch (error) {
    campaignModalError.value = error.message
  } finally {
    campaignModalLoading.value = false
  }
}

async function deleteItem(item) {
  if (!window.confirm(`Delete "${item.title}"?`)) return

  resetFeedback()

  try {
    await apiFetch(`/api/marketing/items/${item.id}`, { method: 'DELETE' })
    actionMessage.value = 'Marketing item deleted.'
    await Promise.all([loadItems(), loadCampaigns()])
  } catch (error) {
    actionError.value = error.message
  }
}

async function deleteCampaign(campaign) {
  if (!window.confirm(`Delete campaign "${campaign.name}"? Linked items will stay but lose the campaign link.`)) return

  resetFeedback()

  try {
    await apiFetch(`/api/marketing/campaigns/${campaign.id}`, { method: 'DELETE' })
    if (String(selectedCampaignId.value) === String(campaign.id)) {
      selectedCampaignId.value = 'ALL'
    }
    actionMessage.value = 'Campaign deleted.'
    await Promise.all([loadCampaigns(), loadItems()])
  } catch (error) {
    actionError.value = error.message
  }
}

async function generateDrafts() {
  generatingDrafts.value = true
  generationError.value = ''
  generatedDrafts.value = []

  try {
    const response = await apiFetch('/api/marketing/generate', {
      method: 'POST',
      body: JSON.stringify({
        objective: generatorForm.value.objective,
        audience: generatorForm.value.audience || null,
        tone: generatorForm.value.tone || null,
        channel: generatorForm.value.channel || null,
        callToAction: generatorForm.value.callToAction || null,
        productName: generatorForm.value.productName || null,
        contentType: generatorForm.value.contentType,
        quantity: Number(generatorForm.value.quantity || 3),
        campaignId: parseSelectId(generatorForm.value.campaignId),
        projectId: parseSelectId(generatorForm.value.projectId),
      }),
    })

    generatedDrafts.value = response.data || []
  } catch (error) {
    generationError.value = error.message
  } finally {
    generatingDrafts.value = false
  }
}

function useDraft(draft) {
  editingItem.value = null
  itemForm.value = {
    title: draft.title,
    description: draft.description || '',
    content: draft.content,
    status: draft.status || DEFAULT_ITEM_STATUS,
    contentType: draft.contentType || DEFAULT_ITEM_TYPE,
    marketingDate: draft.marketingDate || todayString(),
    campaignId: draft.campaignId ? String(draft.campaignId) : '',
    projectId: draft.projectId ? String(draft.projectId) : '',
    resourceLink: '',
    originType: draft.originType || 'RULE_BASED',
  }
  itemModalError.value = ''
  showItemModal.value = true
}

async function saveDraft(draft) {
  resetFeedback()

  try {
    await apiFetch('/api/marketing/items', {
      method: 'POST',
      body: JSON.stringify({
        title: draft.title,
        description: draft.description || null,
        content: draft.content,
        status: draft.status || DEFAULT_ITEM_STATUS,
        contentType: draft.contentType || DEFAULT_ITEM_TYPE,
        marketingDate: draft.marketingDate || todayString(),
        campaignId: draft.campaignId ?? null,
        projectId: draft.projectId ?? null,
        originType: draft.originType || 'RULE_BASED',
      }),
    })

    actionMessage.value = 'Generated draft saved.'
    await Promise.all([loadItems(), loadCampaigns()])
  } catch (error) {
    actionError.value = error.message
  }
}

async function clearFilters() {
  searchTerm.value = ''
  selectedStatus.value = 'ALL'
  selectedContentType.value = 'ALL'
  selectedCampaignId.value = 'ALL'
  selectedProjectId.value = 'ALL'
  await loadItems()
}

onMounted(refreshData)

watch(() => authStore.idEmpresaActual, refreshData)
watch([selectedStatus, selectedContentType, selectedCampaignId, selectedProjectId], loadItems)
</script>

<template>
  <div class="marketing-root">
    <AppNavbar />

    <BaseModal v-model="showItemModal" :title="editingItem ? 'Edit marketing item' : 'New marketing item'" max-width="760px">
      <form class="modal-form" @submit.prevent="submitItem">
        <div class="form-row">
          <div class="form-field">
            <label>Title</label>
            <input v-model="itemForm.title" type="text" required placeholder="Spring retention push" />
          </div>
          <div class="form-field">
            <label>Date</label>
            <input v-model="itemForm.marketingDate" type="date" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>Content type</label>
            <select v-model="itemForm.contentType">
              <option v-for="option in CONTENT_TYPE_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>
          <div class="form-field">
            <label>Status</label>
            <select v-model="itemForm.status">
              <option v-for="option in ITEM_STATUS_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>Campaign</label>
            <select v-model="itemForm.campaignId" @change="syncProjectFromCampaign(itemForm)">
              <option value="">No campaign</option>
              <option v-for="campaign in campaigns" :key="campaign.id" :value="String(campaign.id)">
                {{ campaign.name }}
              </option>
            </select>
          </div>
          <div class="form-field">
            <label>Project</label>
            <select v-model="itemForm.projectId" :disabled="!hasProjects">
              <option value="">No project</option>
              <option v-for="project in projects" :key="project.id_proyecto" :value="String(project.id_proyecto)">
                {{ project.nombre }}
              </option>
            </select>
          </div>
        </div>

        <div class="form-field">
          <label>Description</label>
          <textarea v-model="itemForm.description" rows="2" placeholder="Short summary for the team" />
        </div>

        <div class="form-field">
          <label>Content</label>
          <textarea v-model="itemForm.content" rows="8" required placeholder="Draft copy, concept, resource notes, or proposal body" />
        </div>

        <div class="form-field">
          <label>Resource link</label>
          <input v-model="itemForm.resourceLink" type="text" placeholder="Optional asset or external reference URL" />
        </div>

        <p v-if="itemModalError" class="modal-error">{{ itemModalError }}</p>

        <div class="modal-actions">
          <Button label="Cancel" type="button" backColor="transparent" hoverBack="rgba(255,255,255,0.08)" @click="showItemModal = false" />
          <Button :label="itemModalLoading ? 'Saving...' : (editingItem ? 'Save changes' : 'Create item')" type="submit" :disabled="itemModalLoading" />
        </div>
      </form>
    </BaseModal>

    <BaseModal v-model="showCampaignModal" :title="editingCampaign ? 'Edit campaign' : 'New campaign'" max-width="680px">
      <form class="modal-form" @submit.prevent="submitCampaign">
        <div class="form-row">
          <div class="form-field">
            <label>Name</label>
            <input v-model="campaignForm.name" type="text" required placeholder="Q3 lead generation" />
          </div>
          <div class="form-field">
            <label>Status</label>
            <select v-model="campaignForm.status">
              <option v-for="option in CAMPAIGN_STATUS_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>Channel</label>
            <input v-model="campaignForm.channel" type="text" placeholder="Email, LinkedIn, paid social" />
          </div>
          <div class="form-field">
            <label>Linked project</label>
            <select v-model="campaignForm.projectId" :disabled="!hasProjects">
              <option value="">No project</option>
              <option v-for="project in projects" :key="project.id_proyecto" :value="String(project.id_proyecto)">
                {{ project.nombre }}
              </option>
            </select>
          </div>
        </div>

        <div class="form-field">
          <label>Objective</label>
          <input v-model="campaignForm.objective" type="text" placeholder="Drive demos, launch a new offer, increase retention" />
        </div>

        <div class="form-field">
          <label>Description</label>
          <textarea v-model="campaignForm.description" rows="4" placeholder="Brief for collaborators, context, and constraints" />
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

    <div class="marketing-page">
      <section class="hero-card">
        <div>
          <p class="eyebrow">Marketing Center</p>
          <h1>Plan, draft, and organize campaign content in one place.</h1>
          <p class="hero-copy">
            Store ideas, posts, assets, and proposals by workspace, campaign, or project. Draft generation is ready now and the data model is prepared for future AI or external publishing integrations.
          </p>
        </div>

        <div class="hero-actions">
          <button v-if="canManageMarketing" class="primary-action" @click="openNewItem">New item</button>
          <button v-if="canManageMarketing" class="ghost-action" @click="openNewCampaign">New campaign</button>
          <span v-else class="read-only-pill">Read-only access</span>
        </div>
      </section>

      <section class="stats-grid">
        <article class="stat-card">
          <span class="stat-label">Items</span>
          <strong class="stat-value">{{ stats.total }}</strong>
          <p class="stat-meta">All marketing records in this workspace</p>
        </article>
        <article class="stat-card">
          <span class="stat-label">Draft queue</span>
          <strong class="stat-value">{{ stats.drafts }}</strong>
          <p class="stat-meta">Concepts and pieces waiting for review</p>
        </article>
        <article class="stat-card">
          <span class="stat-label">Scheduled</span>
          <strong class="stat-value">{{ stats.scheduled }}</strong>
          <p class="stat-meta">Content with a planned publication date</p>
        </article>
        <article class="stat-card">
          <span class="stat-label">Published</span>
          <strong class="stat-value">{{ stats.published }}</strong>
          <p class="stat-meta">Live pieces already recorded in Kontrol</p>
        </article>
      </section>

      <div v-if="actionMessage || actionError" class="feedback-strip" :class="{ error: actionError }">
        <span>{{ actionError || actionMessage }}</span>
        <button class="mini-action" @click="resetFeedback">Dismiss</button>
      </div>

      <div class="marketing-grid">
        <aside class="sidebar">
          <section class="panel">
            <div class="panel-head">
              <div>
                <p class="panel-kicker">Campaigns</p>
                <h2>{{ selectedCampaignName }}</h2>
              </div>
              <button v-if="canManageMarketing" class="mini-action" @click="openNewCampaign">Add</button>
            </div>

            <div class="campaign-list">
              <button class="campaign-pill" :class="{ active: selectedCampaignId === 'ALL' }" @click="selectedCampaignId = 'ALL'">
                <span>All campaigns</span>
                <strong>{{ campaigns.length }}</strong>
              </button>

              <button
                v-for="campaign in campaigns"
                :key="campaign.id"
                class="campaign-pill"
                :class="{ active: String(selectedCampaignId) === String(campaign.id) }"
                @click="selectedCampaignId = String(campaign.id)"
              >
                <span>{{ campaign.name }}</span>
                <strong>{{ campaign.itemsCount }}</strong>
              </button>
            </div>

            <div v-if="campaigns.length === 0" class="subtle-empty">
              <p>No campaigns yet.</p>
              <p>Create one to group ideas and content under a shared objective.</p>
            </div>
          </section>

          <section v-if="canManageMarketing" class="panel generator-panel">
            <div class="panel-head">
              <div>
                <p class="panel-kicker">Starter Generator</p>
                <h2>Generate draft ideas</h2>
              </div>
            </div>

            <form class="generator-form" @submit.prevent="generateDrafts">
              <div class="form-field">
                <label>Objective</label>
                <input v-model="generatorForm.objective" type="text" required placeholder="Increase qualified demos for the month" />
              </div>

              <div class="form-field">
                <label>Audience</label>
                <input v-model="generatorForm.audience" type="text" placeholder="Operations leads at growing companies" />
              </div>

              <div class="form-field">
                <label>Tone</label>
                <input v-model="generatorForm.tone" type="text" placeholder="Direct, confident, practical" />
              </div>

              <div class="form-row">
                <div class="form-field">
                  <label>Channel</label>
                  <input v-model="generatorForm.channel" type="text" placeholder="LinkedIn" />
                </div>
                <div class="form-field">
                  <label>Type</label>
                  <select v-model="generatorForm.contentType">
                    <option v-for="option in CONTENT_TYPE_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-field">
                  <label>Campaign</label>
                  <select v-model="generatorForm.campaignId" @change="syncProjectFromCampaign(generatorForm)">
                    <option value="">No campaign</option>
                    <option v-for="campaign in campaigns" :key="campaign.id" :value="String(campaign.id)">
                      {{ campaign.name }}
                    </option>
                  </select>
                </div>
                <div class="form-field">
                  <label>Project</label>
                  <select v-model="generatorForm.projectId" :disabled="!hasProjects">
                    <option value="">No project</option>
                    <option v-for="project in projects" :key="project.id_proyecto" :value="String(project.id_proyecto)">
                      {{ project.nombre }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="form-field">
                <label>CTA</label>
                <input v-model="generatorForm.callToAction" type="text" placeholder="Book a call" />
              </div>

              <div class="form-row">
                <div class="form-field">
                  <label>Product or offer</label>
                  <input v-model="generatorForm.productName" type="text" placeholder="Kontrol Marketing Center" />
                </div>
                <div class="form-field">
                  <label>Variations</label>
                  <input v-model.number="generatorForm.quantity" type="number" min="1" max="5" />
                </div>
              </div>

              <p v-if="generationError" class="modal-error">{{ generationError }}</p>

              <Button :label="generatingDrafts ? 'Generating...' : 'Generate drafts'" type="submit" :disabled="generatingDrafts" />
            </form>
          </section>

          <section class="panel info-panel">
            <p class="panel-kicker">Future-ready</p>
            <h2>Prepared for AI and external channels</h2>
            <ul class="info-list">
              <li>Each record stores origin, campaign linkage, project linkage, and optional resource references.</li>
              <li>Rule-based generation is live now and can be replaced by AI providers later without reshaping the UI.</li>
              <li>Integration fields are already present for external publication or sync flows in future iterations.</li>
            </ul>
          </section>
        </aside>

        <main class="content-panel">
          <section class="toolbar panel">
            <div class="toolbar-row">
              <div class="search-wrap">
                <input v-model="searchTerm" type="text" placeholder="Search title, content, project, or campaign" @keyup.enter="loadItems" />
                <button class="mini-action" @click="loadItems">Search</button>
              </div>
              <button class="ghost-action compact" @click="refreshData">Refresh</button>
            </div>

            <div class="filter-grid">
              <select v-model="selectedStatus">
                <option value="ALL">All statuses</option>
                <option v-for="option in ITEM_STATUS_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>

              <select v-model="selectedContentType">
                <option value="ALL">All types</option>
                <option v-for="option in CONTENT_TYPE_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>

              <select v-model="selectedProjectId">
                <option value="ALL">All projects</option>
                <option v-for="project in projects" :key="project.id_proyecto" :value="String(project.id_proyecto)">
                  {{ project.nombre }}
                </option>
              </select>

              <button class="mini-action align-left" @click="clearFilters">Clear filters</button>
            </div>
          </section>

          <section v-if="generatedDrafts.length" class="panel generated-panel">
            <div class="panel-head">
              <div>
                <p class="panel-kicker">Generated output</p>
                <h2>{{ generatedDrafts.length }} draft starters ready</h2>
              </div>
            </div>

            <div class="generated-grid">
              <article v-for="draft in generatedDrafts" :key="draft.title + draft.content" class="generated-card">
                <div class="generated-topline">
                  <span class="type-chip">{{ contentTypeLabel(draft.contentType) }}</span>
                  <span class="status-chip brand">{{ statusLabel(draft.status) }}</span>
                </div>
                <h3>{{ draft.title }}</h3>
                <p>{{ draft.description }}</p>
                <pre>{{ draft.content }}</pre>
                <div class="generated-actions">
                  <button class="mini-action" @click="useDraft(draft)">Use in editor</button>
                  <button class="mini-action solid" @click="saveDraft(draft)">Save draft</button>
                </div>
              </article>
            </div>
          </section>

          <section class="items-section">
            <div v-if="loading" class="state-card">
              <p>Loading marketing records...</p>
            </div>

            <div v-else-if="listError" class="state-card error-state">
              <p>{{ listError }}</p>
              <button class="mini-action solid" @click="refreshData">Retry</button>
            </div>

            <div v-else-if="items.length === 0" class="state-card">
              <p>No marketing items match the current filters.</p>
              <button v-if="canManageMarketing" class="mini-action solid" @click="openNewItem">Create the first item</button>
            </div>

            <div v-else class="items-grid">
              <article v-for="item in items" :key="item.id" class="item-card">
                <div class="item-card-top">
                  <div class="item-meta">
                    <span class="type-chip">{{ contentTypeLabel(item.contentType) }}</span>
                    <span class="status-chip" :class="statusTone(item.status)">{{ statusLabel(item.status) }}</span>
                  </div>
                  <span class="item-date">{{ formatDate(item.marketingDate) }}</span>
                </div>

                <h3>{{ item.title }}</h3>
                <p class="item-description">{{ item.description || 'No description provided.' }}</p>
                <pre class="item-content">{{ previewText(item.content) }}</pre>

                <div class="association-row">
                  <span v-if="item.campaignName" class="association-badge">Campaign: {{ item.campaignName }}</span>
                  <span v-if="item.projectName" class="association-badge">Project: {{ item.projectName }}</span>
                  <span class="association-badge">Origin: {{ item.originType }}</span>
                </div>

                <div v-if="item.resourceLink" class="resource-row">
                  <a :href="item.resourceLink" target="_blank" rel="noreferrer">Open resource</a>
                </div>

                <div class="item-footer">
                  <div class="item-audit">
                    <span>Updated by {{ item.updatedByName }}</span>
                    <span>{{ formatDateTime(item.updatedAt) }}</span>
                  </div>

                  <div v-if="canManageMarketing" class="item-actions">
                    <button class="mini-action" @click="openEditItem(item)">Edit</button>
                    <button v-if="canDeleteMarketing" class="mini-action danger" @click="deleteItem(item)">Delete</button>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section v-if="campaigns.length" class="panel campaign-management">
            <div class="panel-head">
              <div>
                <p class="panel-kicker">Campaign directory</p>
                <h2>{{ campaigns.length }} campaigns in this workspace</h2>
              </div>
            </div>

            <div class="campaign-table">
              <article v-for="campaign in campaigns" :key="campaign.id" class="campaign-row">
                <div>
                  <h3>{{ campaign.name }}</h3>
                  <p>{{ campaign.description || campaign.objective || 'No extra brief added yet.' }}</p>
                  <div class="association-row">
                    <span v-if="campaign.projectName" class="association-badge">Project: {{ campaign.projectName }}</span>
                    <span class="association-badge">Items: {{ campaign.itemsCount }}</span>
                    <span class="status-chip" :class="campaignTone(campaign.status)">{{ campaignStatusLabel(campaign.status) }}</span>
                  </div>
                </div>

                <div v-if="canManageMarketing" class="item-actions">
                  <button class="mini-action" @click="openEditCampaign(campaign)">Edit</button>
                  <button v-if="canDeleteMarketing" class="mini-action danger" @click="deleteCampaign(campaign)">Delete</button>
                </div>
              </article>
            </div>
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
  max-width: 1400px;
  margin: 0 auto;
  padding: 96px 24px 40px;
}

.hero-card,
.panel,
.stat-card,
.item-card,
.state-card {
  background: linear-gradient(180deg, rgba(13, 13, 13, 0.96), rgba(9, 9, 9, 0.94));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.24);
}

.hero-card {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(240px, 0.8fr);
  gap: 24px;
  padding: 28px 30px;
  align-items: center;
}

.eyebrow,
.panel-kicker,
.stat-label {
  margin: 0 0 8px;
  color: #c9a962;
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.hero-card h1,
.panel h2,
.campaign-row h3,
.item-card h3,
.generated-card h3 {
  margin: 0;
  color: #faf8f5;
  font-family: 'Playfair Display', serif;
}

.hero-card h1 {
  font-size: clamp(2.2rem, 4vw, 3.2rem);
  line-height: 1.05;
}

.hero-copy,
.panel p,
.item-description,
.item-audit,
.campaign-row p,
.stat-meta,
.subtle-empty p {
  color: #beb8af;
}

.hero-copy {
  margin: 16px 0 0;
  max-width: 820px;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.primary-action,
.ghost-action,
.mini-action,
.campaign-pill,
.search-wrap input,
.filter-grid select,
.form-field input,
.form-field textarea,
.form-field select {
  font: inherit;
}

.primary-action,
.ghost-action,
.mini-action,
.campaign-pill {
  border: 1px solid transparent;
  cursor: pointer;
  transition: 0.2s ease;
}

.primary-action {
  background: #c9a962;
  color: #0a0a0a;
  padding: 12px 18px;
  font-weight: 700;
}

.ghost-action {
  background: transparent;
  color: #faf8f5;
  border-color: rgba(255, 255, 255, 0.14);
  padding: 12px 18px;
}

.ghost-action.compact {
  padding: 10px 14px;
}

.read-only-pill {
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #beb8af;
  padding: 10px 14px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin: 20px 0;
}

.stat-card {
  padding: 18px 20px;
}

.stat-value {
  display: block;
  color: #faf8f5;
  font-size: 2rem;
  margin-bottom: 8px;
}

.stat-meta {
  margin: 0;
  line-height: 1.5;
}

.feedback-strip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  margin-bottom: 18px;
  background: rgba(31, 98, 67, 0.16);
  border: 1px solid rgba(52, 211, 153, 0.3);
  color: #d8fff0;
}

.feedback-strip.error {
  background: rgba(113, 29, 41, 0.2);
  border-color: rgba(251, 113, 133, 0.35);
  color: #ffe4e8;
}

.marketing-grid {
  display: grid;
  grid-template-columns: minmax(290px, 350px) minmax(0, 1fr);
  gap: 18px;
}

.sidebar,
.content-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.panel {
  padding: 22px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.campaign-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.campaign-pill {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.06);
  color: #faf8f5;
  text-align: left;
}

.campaign-pill.active,
.campaign-pill:hover,
.primary-action:hover,
.mini-action.solid,
.ghost-action:hover {
  border-color: rgba(201, 169, 98, 0.46);
}

.campaign-pill.active {
  background: rgba(201, 169, 98, 0.14);
}

.subtle-empty {
  margin-top: 14px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
}

.subtle-empty p {
  margin: 0 0 6px;
}

.generator-form,
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
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
.form-field select,
.filter-grid select,
.search-wrap input {
  width: 100%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.09);
  color: #faf8f5;
  padding: 12px 14px;
  resize: vertical;
}

.info-list {
  margin: 0;
  padding-left: 18px;
  color: #beb8af;
  display: grid;
  gap: 10px;
  line-height: 1.5;
}

.toolbar-row {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.search-wrap {
  display: flex;
  gap: 10px;
  width: 100%;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.align-left {
  justify-self: start;
}

.state-card {
  padding: 28px;
  text-align: center;
}

.error-state {
  color: #ffe4e8;
}

.generated-grid,
.items-grid {
  display: grid;
  gap: 16px;
}

.generated-grid {
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}

.items-grid {
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}

.generated-card,
.campaign-row {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  padding: 18px;
}

.generated-topline,
.item-card-top,
.association-row,
.item-footer,
.generated-actions,
.item-actions,
.resource-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.item-card {
  padding: 18px;
}

.item-card-top,
.item-footer {
  justify-content: space-between;
  align-items: center;
}

.item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.type-chip,
.status-chip,
.association-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.type-chip {
  background: rgba(255, 255, 255, 0.06);
  color: #e8dfcf;
}

.association-badge {
  background: rgba(255, 255, 255, 0.04);
  color: #cfc5b8;
}

.status-chip {
  color: #faf8f5;
}

.status-chip.neutral {
  background: rgba(255, 255, 255, 0.08);
}

.status-chip.warm {
  background: rgba(251, 191, 36, 0.16);
  color: #f5d27d;
}

.status-chip.info {
  background: rgba(96, 165, 250, 0.14);
  color: #9fc6ff;
}

.status-chip.brand {
  background: rgba(201, 169, 98, 0.18);
  color: #e6c87f;
}

.status-chip.success {
  background: rgba(52, 211, 153, 0.15);
  color: #8bf1c7;
}

.status-chip.muted {
  background: rgba(113, 113, 122, 0.2);
  color: #d3d6de;
}

.item-date {
  color: #c9c1b6;
  font-size: 13px;
}

.item-description {
  margin: 12px 0 14px;
  line-height: 1.5;
}

.item-content,
.generated-card pre {
  margin: 0;
  white-space: pre-wrap;
  color: #f0ebe4;
  line-height: 1.55;
  font-family: 'Manrope', sans-serif;
}

.resource-row a {
  color: #e6c87f;
}

.item-audit {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}

.item-actions {
  justify-content: flex-end;
}

.mini-action {
  background: transparent;
  color: #faf8f5;
  border-color: rgba(255, 255, 255, 0.16);
  padding: 10px 12px;
}

.mini-action.solid {
  background: rgba(201, 169, 98, 0.18);
  color: #f5e3ae;
}

.mini-action.danger {
  border-color: rgba(251, 113, 133, 0.3);
  color: #ffb8c4;
}

.campaign-table {
  display: grid;
  gap: 12px;
}

.campaign-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.campaign-row p {
  margin: 8px 0 12px;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 0 24px 24px;
}

.modal-form {
  padding: 24px;
}

.modal-error {
  margin: 0;
  color: #ffb8c4;
}

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .marketing-grid,
  .hero-card {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .marketing-page {
    padding: 84px 14px 30px;
  }

  .stats-grid,
  .filter-grid,
  .form-row,
  .generated-grid,
  .items-grid {
    grid-template-columns: 1fr;
  }

  .toolbar-row,
  .search-wrap,
  .campaign-row,
  .item-card-top,
  .item-footer,
  .hero-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .item-actions {
    justify-content: flex-start;
  }
}
</style>
