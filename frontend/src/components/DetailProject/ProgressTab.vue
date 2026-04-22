<template>
  <section class="progress-tab">
    <div class="pt-header">
      <div>
        <p class="pt-eyebrow">Project Progress</p>
        <h2 class="pt-title">{{ projectTitle }}</h2>
        <p class="pt-copy">
          Keep a running timeline of milestones, blockers, and percentage updates so the team can track how the project is moving.
        </p>
      </div>

      <div class="pt-header-actions">
        <span class="pt-chip">{{ entries.length }} updates</span>
        <span class="pt-chip">{{ taskCompletionPercentage }}% task completion</span>
        <button
          v-if="canManageProgress"
          class="pt-btn pt-btn--primary"
          @click="openCreateModal"
        >
          New update
        </button>
      </div>
    </div>

    <div v-if="loading" class="pt-state">Loading project timeline...</div>
    <div v-else-if="errorMessage" class="pt-state pt-state--error">{{ errorMessage }}</div>

    <template v-else>
      <div class="pt-summary-grid">
        <article class="pt-card">
          <p class="pt-card-kicker">Current Progress</p>
          <div class="pt-progress-head">
            <div>
              <div class="pt-progress-value">{{ currentProgressPercentage }}%</div>
              <p class="pt-progress-sub">{{ progressSourceLabel }}</p>
            </div>
            <span
              class="pt-type-badge"
              :style="{
                color: progressTone,
                borderColor: `${progressTone}44`,
                background: `${progressTone}14`,
              }"
            >
              {{ summary.entriesCount ? 'Timeline tracked' : 'Task-derived' }}
            </span>
          </div>
          <ProgressBar :pct="currentProgressPercentage" :color="progressTone" />
          <p class="pt-card-copy">{{ latestUpdateLabel }}</p>
        </article>

        <article class="pt-card">
          <p class="pt-card-kicker">Task Delivery</p>
          <div class="pt-stat-row">
            <strong>{{ summary.taskCompletion.completed }}</strong>
            <span>completed</span>
          </div>
          <div class="pt-stat-row">
            <strong>{{ summary.taskCompletion.total }}</strong>
            <span>total tasks</span>
          </div>
          <p class="pt-card-copy">
            {{ taskCompletionPercentage }}% of project tasks are already marked as done.
          </p>
        </article>

        <article class="pt-card">
          <p class="pt-card-kicker">Signals</p>
          <div class="pt-signal-grid">
            <div class="pt-signal">
              <strong>{{ summary.milestonesCount }}</strong>
              <span>milestones</span>
            </div>
            <div class="pt-signal">
              <strong>{{ summary.blockersCount }}</strong>
              <span>blockers</span>
            </div>
          </div>
          <p class="pt-card-copy">
            Use milestones for major achievements and blockers when progress is at risk.
          </p>
        </article>

        <article class="pt-card">
          <p class="pt-card-kicker">Activity</p>
          <div class="pt-stat-row">
            <strong>{{ summary.entriesCount }}</strong>
            <span>timeline entries</span>
          </div>
          <div class="pt-stat-row">
            <strong>{{ filteredEntries.length }}</strong>
            <span>shown with current filter</span>
          </div>
          <p class="pt-card-copy">
            {{ canManageProgress ? 'You can add, edit, and delete updates from this panel.' : 'This project is read-only for progress updates in your current access level.' }}
          </p>
        </article>
      </div>

      <div v-if="!canManageProgress" class="pt-readonly">
        You can review the project timeline, but you do not have permission to register progress updates.
      </div>

      <div class="pt-toolbar">
        <div class="pt-filter-group">
          <button
            v-for="filter in filters"
            :key="filter.value"
            class="pt-filter"
            :class="{ active: filterType === filter.value }"
            @click="filterType = filter.value"
          >
            {{ filter.label }}
            <span>{{ filterCount(filter.value) }}</span>
          </button>
        </div>

        <p class="pt-toolbar-copy">{{ latestUpdateLabel }}</p>
      </div>

      <div v-if="actionMessage" class="pt-feedback pt-feedback--ok">{{ actionMessage }}</div>
      <div v-if="actionError" class="pt-feedback pt-feedback--error">{{ actionError }}</div>

      <div v-if="filteredEntries.length" class="pt-timeline">
        <article
          v-for="entry in filteredEntries"
          :key="entry.id"
          class="pt-entry"
        >
          <div class="pt-entry-rail">
            <span
              class="pt-entry-dot"
              :style="{ background: typeMeta(entry.updateType).color }"
            ></span>
          </div>

          <div class="pt-entry-body">
            <div class="pt-entry-head">
              <div class="pt-entry-main">
                <div class="pt-entry-topline">
                  <span
                    class="pt-type-badge"
                    :style="{
                      color: typeMeta(entry.updateType).color,
                      borderColor: `${typeMeta(entry.updateType).color}44`,
                      background: `${typeMeta(entry.updateType).color}14`,
                    }"
                  >
                    {{ typeMeta(entry.updateType).label }}
                  </span>
                  <span class="pt-entry-date">{{ formatDateTime(entry.happenedAt) }}</span>
                </div>

                <h3 class="pt-entry-title">{{ entry.title }}</h3>
              </div>

              <div class="pt-entry-progress">
                <strong>{{ roundPercentage(entry.progressPercentage) }}%</strong>
                <span>completion</span>
              </div>
            </div>

            <p v-if="entry.details" class="pt-entry-details">{{ entry.details }}</p>

            <ProgressBar
              :pct="roundPercentage(entry.progressPercentage)"
              :color="typeMeta(entry.updateType).color"
            />

            <div class="pt-entry-footer">
              <span>By {{ authorName(entry.author) }}</span>
              <span v-if="wasEdited(entry)">Edited {{ formatDateTime(entry.updatedAt) }}</span>
            </div>

            <div v-if="canManageProgress" class="pt-entry-actions">
              <button class="pt-btn pt-btn--ghost" @click="openEditModal(entry)">Edit</button>
              <button
                class="pt-btn pt-btn--danger"
                :disabled="deletingEntryId === entry.id"
                @click="deleteEntry(entry)"
              >
                {{ deletingEntryId === entry.id ? 'Deleting...' : 'Delete' }}
              </button>
            </div>
          </div>
        </article>
      </div>

      <div v-else class="pt-empty">
        <p class="pt-empty-title">No progress entries match this view.</p>
        <p class="pt-empty-copy">
          {{ entries.length ? 'Try another filter to inspect the rest of the timeline.' : 'Start logging milestones and blockers to build a reliable project history.' }}
        </p>
        <button
          v-if="canManageProgress && entries.length === 0"
          class="pt-btn pt-btn--primary"
          @click="openCreateModal"
        >
          Add the first update
        </button>
      </div>
    </template>

    <BaseModal
      v-model="showModal"
      :title="editingEntryId ? 'Edit progress update' : 'New progress update'"
      max-width="640px"
    >
      <form class="pt-modal-form" @submit.prevent="submitForm">
        <div class="pt-form-field">
          <label>Title <span class="pt-required">*</span></label>
          <input
            v-model="form.title"
            type="text"
            maxlength="200"
            placeholder="Describe the update"
            required
          />
        </div>

        <div class="pt-form-field">
          <label>Details</label>
          <textarea
            v-model="form.details"
            rows="4"
            maxlength="5000"
            placeholder="Add extra context for the team"
          ></textarea>
        </div>

        <div class="pt-form-row">
          <div class="pt-form-field">
            <label>Update type</label>
            <select v-model="form.updateType">
              <option v-for="option in updateTypes" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <div class="pt-form-field">
            <label>Progress percentage <span class="pt-required">*</span></label>
            <input
              v-model.number="form.progressPercentage"
              type="number"
              min="0"
              max="100"
              step="1"
              required
            />
          </div>
        </div>

        <div class="pt-form-field">
          <label>Update date</label>
          <input v-model="form.happenedAt" type="datetime-local" />
        </div>

        <p v-if="modalError" class="pt-modal-error">{{ modalError }}</p>

        <div class="pt-modal-actions">
          <button type="button" class="pt-btn pt-btn--ghost" @click="showModal = false">Cancel</button>
          <button type="submit" class="pt-btn pt-btn--primary" :disabled="submitting">
            {{ submitting ? 'Saving...' : editingEntryId ? 'Save changes' : 'Create update' }}
          </button>
        </div>
      </form>
    </BaseModal>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import BaseModal from '@/components/UI/Modal/BaseModal.vue'
import ProgressBar from '@/components/UI/ProgressBar/ProgressBar.vue'
import { useAuthStore } from '@/stores/auth'

const UPDATE_TYPE_META = {
  UPDATE: { label: 'Update', color: '#60a5fa' },
  MILESTONE: { label: 'Milestone', color: '#c9a962' },
  BLOCKER: { label: 'Blocker', color: '#fb7185' },
}

const DEFAULT_SUMMARY = {
  currentProgressPercentage: 0,
  derivedFrom: 'tasks',
  entriesCount: 0,
  milestonesCount: 0,
  blockersCount: 0,
  lastUpdateAt: null,
  taskCompletion: {
    total: 0,
    completed: 0,
    percentage: 0,
  },
}

const filters = [
  { value: 'ALL', label: 'All' },
  { value: 'UPDATE', label: 'Updates' },
  { value: 'MILESTONE', label: 'Milestones' },
  { value: 'BLOCKER', label: 'Blockers' },
]

const updateTypes = Object.entries(UPDATE_TYPE_META).map(([value, meta]) => ({
  value,
  label: meta.label,
}))

const props = defineProps({
  projectId: {
    type: [Number, String],
    required: true,
  },
})

const emit = defineEmits(['updated'])

const authStore = useAuthStore()

const loading = ref(true)
const errorMessage = ref('')
const actionMessage = ref('')
const actionError = ref('')
const submitting = ref(false)
const deletingEntryId = ref(null)
const showModal = ref(false)
const modalError = ref('')
const editingEntryId = ref(null)
const filterType = ref('ALL')
const progressData = ref(null)
const form = ref({
  title: '',
  details: '',
  updateType: 'UPDATE',
  progressPercentage: 0,
  happenedAt: '',
})

const project = computed(() => progressData.value?.project ?? null)
const summary = computed(() => ({
  ...DEFAULT_SUMMARY,
  ...(progressData.value?.summary ?? {}),
  taskCompletion: {
    ...DEFAULT_SUMMARY.taskCompletion,
    ...(progressData.value?.summary?.taskCompletion ?? {}),
  },
}))
const entries = computed(() => progressData.value?.entries ?? [])
const canManageProgress = computed(() => progressData.value?.canManageProgress === true)
const projectTitle = computed(() => project.value?.name || 'Progress Timeline')
const currentProgressPercentage = computed(() =>
  roundPercentage(summary.value.currentProgressPercentage)
)
const taskCompletionPercentage = computed(() =>
  roundPercentage(summary.value.taskCompletion.percentage)
)
const progressTone = computed(() => {
  if (summary.value.blockersCount > 0) return '#fb7185'
  if (currentProgressPercentage.value >= 100) return '#c9a962'
  if (currentProgressPercentage.value >= 60) return '#34d399'
  if (currentProgressPercentage.value > 0) return '#60a5fa'
  return '#666'
})
const progressSourceLabel = computed(() =>
  summary.value.derivedFrom === 'progress_entry'
    ? 'Based on the latest timeline update'
    : 'Derived from completed tasks'
)
const latestUpdateLabel = computed(() =>
  summary.value.lastUpdateAt
    ? `Latest update ${formatDateTime(summary.value.lastUpdateAt)}`
    : 'No progress updates recorded yet.'
)
const filteredEntries = computed(() =>
  filterType.value === 'ALL'
    ? entries.value
    : entries.value.filter((entry) => entry.updateType === filterType.value)
)

function buildEmptyForm(progressPercentage = currentProgressPercentage.value) {
  return {
    title: '',
    details: '',
    updateType: 'UPDATE',
    progressPercentage,
    happenedAt: toDateTimeLocal(new Date()),
  }
}

function authHeaders(extraHeaders = {}) {
  return {
    Authorization: `Bearer ${authStore.token}`,
    'X-Company-ID': authStore.idEmpresaActual,
    ...extraHeaders,
  }
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function toDateTimeLocal(value) {
  if (!value) return ''

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatDateTime(value) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function roundPercentage(value) {
  return Math.round(Number(value || 0))
}

function typeMeta(type) {
  return UPDATE_TYPE_META[type] ?? UPDATE_TYPE_META.UPDATE
}

function authorName(author) {
  return [author?.firstName, author?.lastName].filter(Boolean).join(' ') || author?.email || 'Unknown user'
}

function filterCount(type) {
  if (type === 'ALL') return entries.value.length
  return entries.value.filter((entry) => entry.updateType === type).length
}

function wasEdited(entry) {
  if (!entry?.updatedAt || !entry?.createdAt) return false
  return String(entry.updatedAt) !== String(entry.createdAt)
}

async function loadProgress() {
  if (!props.projectId || !authStore.token || !authStore.idEmpresaActual) {
    loading.value = false
    progressData.value = null
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const res = await fetch(`/api/projects/${props.projectId}/progress`, {
      headers: authHeaders(),
    })
    const payload = await res.json()

    if (!res.ok) {
      progressData.value = null
      errorMessage.value = payload.message || 'Could not load the project progress timeline.'
      return
    }

    progressData.value = payload.data
  } catch {
    progressData.value = null
    errorMessage.value = 'Could not load the project progress timeline.'
  } finally {
    loading.value = false
  }
}

function resetFeedback() {
  actionMessage.value = ''
  actionError.value = ''
  modalError.value = ''
}

function openCreateModal() {
  resetFeedback()
  editingEntryId.value = null
  form.value = buildEmptyForm(currentProgressPercentage.value)
  showModal.value = true
}

function openEditModal(entry) {
  resetFeedback()
  editingEntryId.value = entry.id
  form.value = {
    title: entry.title,
    details: entry.details ?? '',
    updateType: entry.updateType,
    progressPercentage: roundPercentage(entry.progressPercentage),
    happenedAt: toDateTimeLocal(entry.happenedAt),
  }
  showModal.value = true
}

async function submitForm() {
  resetFeedback()
  submitting.value = true

  const payload = {
    title: form.value.title.trim(),
    details: form.value.details.trim() || (editingEntryId.value ? null : undefined),
    updateType: form.value.updateType,
    progressPercentage: roundPercentage(form.value.progressPercentage),
    happenedAt: form.value.happenedAt || undefined,
  }

  try {
    const res = await fetch(
      editingEntryId.value
        ? `/api/projects/${props.projectId}/progress/${editingEntryId.value}`
        : `/api/projects/${props.projectId}/progress`,
      {
        method: editingEntryId.value ? 'PUT' : 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      }
    )
    const body = await res.json()

    if (!res.ok) {
      modalError.value = body.message || 'Could not save the progress update.'
      return
    }

    actionMessage.value = body.message || 'Project progress updated.'
    showModal.value = false
    await loadProgress()
    emit('updated')
  } catch {
    modalError.value = 'Could not save the progress update.'
  } finally {
    submitting.value = false
  }
}

async function deleteEntry(entry) {
  resetFeedback()

  if (!window.confirm(`Delete the update "${entry.title}"?`)) {
    return
  }

  deletingEntryId.value = entry.id

  try {
    const res = await fetch(`/api/projects/${props.projectId}/progress/${entry.id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    const body = await res.json()

    if (!res.ok) {
      actionError.value = body.message || 'Could not delete the progress update.'
      return
    }

    actionMessage.value = body.message || 'Progress update deleted.'
    await loadProgress()
    emit('updated')
  } catch {
    actionError.value = 'Could not delete the progress update.'
  } finally {
    deletingEntryId.value = null
  }
}

watch(
  () => [props.projectId, authStore.token, authStore.idEmpresaActual],
  () => {
    resetFeedback()
    loadProgress()
  },
  { immediate: true }
)
</script>

<style scoped>
.progress-tab {
  display: flex;
  flex-direction: column;
  gap: 24px;
  font-family: 'Manrope', sans-serif;
}

.pt-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.pt-eyebrow {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #c9a962;
}

.pt-title {
  font-family: 'Playfair Display', serif;
  font-size: 32px;
  line-height: 1.1;
  color: #faf8f5;
  margin-top: 6px;
}

.pt-copy {
  max-width: 680px;
  color: #888;
  font-size: 14px;
  line-height: 1.6;
  margin-top: 10px;
}

.pt-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.pt-chip {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid #1f1f1f;
  background: rgba(15, 15, 15, 0.75);
  color: #888;
  font-size: 12px;
}

.pt-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.pt-card {
  background: rgba(15, 15, 15, 0.72);
  border: 1px solid #1f1f1f;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pt-card-kicker {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #c9a962;
}

.pt-card-copy {
  color: #666;
  font-size: 13px;
  line-height: 1.55;
}

.pt-progress-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.pt-progress-value {
  font-size: 34px;
  line-height: 1;
  color: #faf8f5;
  font-weight: 700;
}

.pt-progress-sub {
  font-size: 12px;
  color: #888;
  margin-top: 6px;
}

.pt-type-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border: 1px solid;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}

.pt-stat-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.pt-stat-row strong {
  font-size: 28px;
  line-height: 1;
  color: #faf8f5;
}

.pt-stat-row span {
  font-size: 12px;
  color: #666;
}

.pt-signal-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.pt-signal {
  border: 1px solid #1a1a1a;
  background: #101010;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pt-signal strong {
  font-size: 22px;
  color: #faf8f5;
}

.pt-signal span {
  font-size: 12px;
  color: #666;
}

.pt-readonly,
.pt-state,
.pt-empty,
.pt-feedback {
  border: 1px solid #1f1f1f;
  background: rgba(15, 15, 15, 0.72);
  padding: 18px 20px;
  font-size: 14px;
}

.pt-readonly,
.pt-state,
.pt-empty {
  color: #888;
}

.pt-state--error,
.pt-feedback--error {
  border-color: rgba(251, 113, 133, 0.25);
  color: #fda4af;
}

.pt-feedback--ok {
  border-color: rgba(52, 211, 153, 0.24);
  color: #6ee7b7;
}

.pt-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.pt-filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.pt-filter {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #1f1f1f;
  background: transparent;
  color: #888;
  padding: 9px 12px;
  font-size: 12px;
  font-family: 'Manrope', sans-serif;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.pt-filter span {
  color: #555;
}

.pt-filter.active {
  color: #faf8f5;
  border-color: rgba(201, 169, 98, 0.38);
  background: rgba(201, 169, 98, 0.08);
}

.pt-toolbar-copy {
  font-size: 12px;
  color: #666;
}

.pt-timeline {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pt-entry {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 14px;
}

.pt-entry-rail {
  position: relative;
  display: flex;
  justify-content: center;
}

.pt-entry-rail::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: -14px;
  width: 1px;
  background: #1f1f1f;
}

.pt-entry:last-child .pt-entry-rail::before {
  bottom: 0;
}

.pt-entry-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 26px;
  position: relative;
  z-index: 1;
  box-shadow: 0 0 0 6px rgba(10, 10, 10, 1);
}

.pt-entry-body {
  background: rgba(15, 15, 15, 0.72);
  border: 1px solid #1f1f1f;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pt-entry-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.pt-entry-main {
  min-width: 0;
}

.pt-entry-topline {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.pt-entry-date {
  color: #666;
  font-size: 12px;
}

.pt-entry-title {
  font-size: 22px;
  line-height: 1.2;
  color: #faf8f5;
  margin-top: 10px;
}

.pt-entry-progress {
  min-width: 100px;
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pt-entry-progress strong {
  font-size: 28px;
  line-height: 1;
  color: #faf8f5;
}

.pt-entry-progress span {
  color: #666;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.pt-entry-details {
  color: #c6c1b7;
  font-size: 14px;
  line-height: 1.65;
  white-space: pre-wrap;
}

.pt-entry-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  color: #666;
  font-size: 12px;
}

.pt-entry-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.pt-empty {
  text-align: center;
}

.pt-empty-title {
  color: #faf8f5;
  font-size: 18px;
}

.pt-empty-copy {
  color: #666;
  font-size: 13px;
  line-height: 1.6;
  margin: 8px 0 18px;
}

.pt-modal-form {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pt-form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pt-form-field label {
  font-size: 11px;
  color: #888;
  letter-spacing: 0.05em;
}

.pt-form-field input,
.pt-form-field textarea,
.pt-form-field select {
  background: #0a0a0a;
  border: 1px solid #1f1f1f;
  color: #faf8f5;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  padding: 10px 12px;
  outline: none;
  resize: none;
  transition: border-color 0.15s;
}

.pt-form-field input:focus,
.pt-form-field textarea:focus,
.pt-form-field select:focus {
  border-color: #c9a962;
}

.pt-form-field select option {
  background: #0f0f0f;
}

.pt-form-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.pt-required {
  color: #c9a962;
}

.pt-modal-error {
  font-size: 12px;
  color: #fb7185;
}

.pt-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.pt-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  padding: 10px 16px;
  border: 1px solid #1f1f1f;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, filter 0.15s;
}

.pt-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.pt-btn--primary {
  background: #c9a962;
  border-color: #c9a962;
  color: #0a0a0a;
}

.pt-btn--primary:hover:not(:disabled) {
  filter: brightness(1.08);
}

.pt-btn--ghost {
  background: transparent;
  color: #faf8f5;
}

.pt-btn--ghost:hover:not(:disabled) {
  border-color: #333;
}

.pt-btn--danger {
  background: transparent;
  color: #fb7185;
  border-color: rgba(251, 113, 133, 0.25);
}

.pt-btn--danger:hover:not(:disabled) {
  border-color: rgba(251, 113, 133, 0.45);
}

@media (max-width: 960px) {
  .pt-header,
  .pt-entry-head {
    flex-direction: column;
  }

  .pt-header-actions {
    justify-content: flex-start;
  }

  .pt-summary-grid {
    grid-template-columns: 1fr;
  }

  .pt-entry-progress {
    text-align: left;
  }
}

@media (max-width: 640px) {
  .pt-title {
    font-size: 26px;
  }

  .pt-form-row {
    grid-template-columns: 1fr;
  }

  .pt-entry {
    grid-template-columns: 18px minmax(0, 1fr);
    gap: 10px;
  }

  .pt-entry-body,
  .pt-card,
  .pt-state,
  .pt-empty,
  .pt-readonly,
  .pt-feedback {
    padding: 16px;
  }
}
</style>
