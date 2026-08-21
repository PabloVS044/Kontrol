<template>
  <div class="mkt-root">
    <AppNavbar />

    <div class="mkt-layout">
      <div class="mkt-header">
        <div>
          <h1 class="mkt-title">{{ t('marketing.title') }}</h1>
          <p class="mkt-subtitle">{{ t('marketing.subtitle') }}</p>
        </div>
        <Button
          v-if="canManage"
          :label="t('marketing.new')"
          backColor="var(--k-color-primary)"
          @click="openCreate"
        />
      </div>

      <!-- Filtros: estado, canal y proyecto -->
      <div class="mkt-filters">
        <select v-model="filters.status" class="mkt-select" :aria-label="t('marketing.filters.byStatus')">
          <option value="">{{ t('marketing.filters.allStatuses') }}</option>
          <option v-for="estado in PUBLICATION_STATUSES" :key="estado" :value="estado">
            {{ t(`marketing.status.${estado}`) }}
          </option>
        </select>

        <select v-model="filters.platform" class="mkt-select" :aria-label="t('marketing.filters.byChannel')">
          <option value="">{{ t('marketing.filters.allChannels') }}</option>
          <option v-for="canal in PUBLICATION_PLATFORMS" :key="canal" :value="canal">
            {{ t(`marketing.platform.${canal}`) }}
          </option>
        </select>

        <select v-model="filters.projectId" class="mkt-select" :aria-label="t('marketing.filters.byProject')">
          <option value="">{{ t('marketing.filters.allProjects') }}</option>
          <option v-for="proyecto in projects" :key="proyecto.id_proyecto" :value="proyecto.id_proyecto">
            {{ proyecto.nombre }}
          </option>
        </select>

        <button v-if="hasActiveFilters" class="mkt-clear" @click="clearFilters">
          {{ t('marketing.filters.clear') }}
        </button>
      </div>

      <p v-if="fetchError" class="mkt-error">{{ fetchError }}</p>

      <p v-else-if="loading" class="mkt-empty">{{ t('marketing.loading') }}</p>

      <p v-else-if="!publications.length" class="mkt-empty">
        {{ hasActiveFilters ? t('marketing.emptyFiltered') : t('marketing.empty') }}
      </p>

      <div v-else class="mkt-grid">
        <article v-for="publication in publications" :key="publication.id" class="mkt-card">
          <div class="mkt-card-top">
            <span
              class="mkt-pill"
              :style="{
                color: publicationStatusColors(publication.status).color,
                background: publicationStatusColors(publication.status).bg,
              }"
            >{{ t(`marketing.status.${publication.status}`) }}</span>
            <span class="mkt-channel">{{ t(`marketing.platform.${publication.platform}`) }}</span>
          </div>

          <img
            v-if="publication.assetUrl"
            :src="publication.assetUrl"
            :alt="t('marketing.card.imageAlt', { title: publication.title })"
            class="mkt-asset"
            @error="onAssetError"
          />

          <h2 class="mkt-card-title">{{ publication.title }}</h2>
          <p v-if="publication.caption" class="mkt-card-caption">{{ publication.caption }}</p>

          <dl class="mkt-meta">
            <div>
              <dt>{{ t('marketing.card.project') }}</dt>
              <dd>{{ publication.projectName || '—' }}</dd>
            </div>
            <div>
              <dt>{{ publication.status === 'PUBLISHED' ? t('marketing.card.publishedAt') : t('marketing.card.scheduledFor') }}</dt>
              <dd>{{ formatDate(publication.status === 'PUBLISHED' ? publication.publishedAt : publication.scheduledFor) }}</dd>
            </div>
          </dl>

          <div v-if="canManage" class="mkt-actions">
            <button
              v-for="transition in availableTransitions(publication.status)"
              :key="transition.status"
              class="mkt-action mkt-action--primary"
              :disabled="busyId === publication.id"
              @click="applyTransition(publication, transition)"
            >{{ t(`marketing.actions.${transition.status}`) }}</button>

            <button class="mkt-action" :disabled="busyId === publication.id" @click="openEdit(publication)">
              {{ t('marketing.actions.edit') }}
            </button>
            <button class="mkt-action mkt-action--danger" :disabled="busyId === publication.id" @click="confirmRemove(publication)">
              {{ t('marketing.actions.delete') }}
            </button>
          </div>

          <p v-if="rowError[publication.id]" class="mkt-row-error">{{ rowError[publication.id] }}</p>
        </article>
      </div>
    </div>

    <BaseModal
      v-model="showModal"
      :title="editing ? t('marketing.form.editTitle') : t('marketing.form.createTitle')"
      maxWidth="560px"
    >
      <form class="mkt-form" @submit.prevent="submitForm">
        <label class="mkt-field">
          <span>{{ t('marketing.form.title') }}</span>
          <input v-model="form.title" type="text" maxlength="180" required />
        </label>

        <label class="mkt-field">
          <span>{{ t('marketing.form.content') }}</span>
          <textarea v-model="form.caption" rows="4" maxlength="12000"></textarea>
        </label>

        <label class="mkt-field">
          <span>{{ t('marketing.form.image') }}</span>
          <input v-model="form.assetUrl" type="url" maxlength="500" placeholder="https://…" />
        </label>

        <div class="mkt-field-row">
          <label class="mkt-field">
            <span>{{ t('marketing.form.channel') }}</span>
            <select v-model="form.platform" required>
              <option v-for="canal in PUBLICATION_PLATFORMS" :key="canal" :value="canal">
                {{ t(`marketing.platform.${canal}`) }}
              </option>
            </select>
          </label>

          <label class="mkt-field">
            <span>{{ t('marketing.form.format') }}</span>
            <select v-model="form.format">
              <option v-for="formato in PUBLICATION_FORMATS" :key="formato" :value="formato">
                {{ t(`marketing.format.${formato}`) }}
              </option>
            </select>
          </label>
        </div>

        <div class="mkt-field-row">
          <label class="mkt-field">
            <span>{{ t('marketing.form.project') }}</span>
            <select v-model="form.projectId" required>
              <option value="" disabled>{{ t('marketing.form.selectProject') }}</option>
              <option v-for="proyecto in projects" :key="proyecto.id_proyecto" :value="proyecto.id_proyecto">
                {{ proyecto.nombre }}
              </option>
            </select>
          </label>

          <label class="mkt-field">
            <span>{{ t('marketing.form.scheduledFor') }}</span>
            <input v-model="form.scheduledFor" type="datetime-local" />
          </label>
        </div>

        <label class="mkt-field">
          <span>{{ t('marketing.form.notes') }}</span>
          <textarea v-model="form.notes" rows="2" maxlength="1200"></textarea>
        </label>

        <p v-if="modalError" class="mkt-error">{{ modalError }}</p>

        <div class="mkt-form-actions">
          <button type="button" class="mkt-action" @click="showModal = false">
            {{ t('marketing.actions.cancel') }}
          </button>
          <Button
            type="submit"
            :label="modalLoading ? t('marketing.actions.saving') : t('marketing.actions.save')"
            :disabled="modalLoading"
            backColor="var(--k-color-primary)"
          />
        </div>
      </form>
    </BaseModal>

    <BaseModal v-model="showScheduleModal" :title="t('marketing.schedule.title')" maxWidth="420px">
      <form class="mkt-form" @submit.prevent="submitSchedule">
        <p class="mkt-hint">{{ t('marketing.schedule.hint') }}</p>

        <label class="mkt-field">
          <span>{{ t('marketing.form.scheduledFor') }}</span>
          <input v-model="scheduleDate" type="datetime-local" required />
        </label>

        <p v-if="modalError" class="mkt-error">{{ modalError }}</p>

        <div class="mkt-form-actions">
          <button type="button" class="mkt-action" @click="showScheduleModal = false">
            {{ t('marketing.actions.cancel') }}
          </button>
          <Button
            type="submit"
            :label="modalLoading ? t('marketing.schedule.submitting') : t('marketing.schedule.submit')"
            :disabled="modalLoading"
            backColor="var(--k-color-primary)"
          />
        </div>
      </form>
    </BaseModal>

    <BaseModal v-model="showDeleteModal" :title="t('marketing.remove.title')" maxWidth="420px">
      <p class="mkt-hint">{{ t('marketing.remove.hint', { title: removing?.title ?? '' }) }}</p>

      <p v-if="modalError" class="mkt-error">{{ modalError }}</p>

      <div class="mkt-form-actions">
        <button type="button" class="mkt-action" @click="showDeleteModal = false">
          {{ t('marketing.actions.cancel') }}
        </button>
        <Button
          :label="modalLoading ? t('marketing.remove.submitting') : t('marketing.remove.submit')"
          :disabled="modalLoading"
          backColor="var(--k-color-error)"
          @click="submitRemove"
        />
      </div>
    </BaseModal>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppNavbar from '../components/AppNavbar.vue'
import BaseModal from '../components/UI/Modal/BaseModal.vue'
import Button from '../components/UI/Button/Button.vue'
import { useAuthStore } from '../stores/auth'
import {
  createPublication,
  deletePublication,
  listProjectsForPublications,
  listPublications,
  updatePublication,
} from '../services/marketing.js'
import {
  PUBLICATION_FORMATS,
  PUBLICATION_PLATFORMS,
  PUBLICATION_STATUSES,
  availableTransitions,
  publicationStatusColors,
} from '../utils/publicationStatus.js'
import './MarketingPublications.css'

const { t, locale } = useI18n()
const authStore = useAuthStore()

const publications = ref([])
const projects = ref([])
const loading = ref(false)
const fetchError = ref('')
const canManage = ref(false)
const busyId = ref(null)
const rowError = reactive({})

const filters = reactive({ status: '', platform: '', projectId: '' })

const showModal = ref(false)
const showScheduleModal = ref(false)
const showDeleteModal = ref(false)
const modalLoading = ref(false)
const modalError = ref('')
const editing = ref(null)
const scheduling = ref(null)
const removing = ref(null)
const scheduleDate = ref('')

const emptyForm = () => ({
  title: '',
  caption: '',
  assetUrl: '',
  platform: 'INSTAGRAM',
  format: 'POST',
  projectId: '',
  scheduledFor: '',
  notes: '',
})

const form = reactive(emptyForm())

const hasActiveFilters = computed(() =>
  Boolean(filters.status || filters.platform || filters.projectId)
)

const credentials = () => [authStore.token, authStore.idEmpresaActual]

function formatDate(value) {
  if (!value) return t('marketing.card.noDate')
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? t('marketing.card.noDate')
    : date.toLocaleString(locale.value === 'es' ? 'es-GT' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
}

// El backend espera 'YYYY-MM-DD HH:mm:ss'; el input datetime-local da 'YYYY-MM-DDTHH:mm'.
function toBackendTimestamp(value) {
  if (!value) return null
  return `${value.replace('T', ' ')}:00`.slice(0, 19)
}

function toInputValue(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function onAssetError(event) {
  // Una imagen rota no debe romper la tarjeta entera.
  event.target.style.display = 'none'
}

async function loadPublications() {
  loading.value = true
  fetchError.value = ''
  try {
    const { data, capabilities } = await listPublications(...credentials(), { ...filters })
    publications.value = data
    canManage.value = capabilities.canManageMarketing
  } catch (error) {
    fetchError.value = error.message || t('marketing.errors.load')
  } finally {
    loading.value = false
  }
}

async function loadProjects() {
  try {
    projects.value = await listProjectsForPublications(...credentials())
  } catch {
    // El listado sigue siendo útil sin el catálogo de proyectos para filtrar.
    projects.value = []
  }
}

function openCreate() {
  editing.value = null
  Object.assign(form, emptyForm())
  modalError.value = ''
  showModal.value = true
}

function openEdit(publication) {
  editing.value = publication
  Object.assign(form, {
    title: publication.title,
    caption: publication.caption ?? '',
    assetUrl: publication.assetUrl ?? '',
    platform: publication.platform,
    format: publication.format,
    projectId: publication.projectId,
    scheduledFor: toInputValue(publication.scheduledFor),
    notes: publication.notes ?? '',
  })
  modalError.value = ''
  showModal.value = true
}

function buildPayload() {
  return {
    title: form.title.trim(),
    caption: form.caption.trim() || null,
    assetUrl: form.assetUrl.trim() || null,
    platform: form.platform,
    format: form.format,
    projectId: Number(form.projectId),
    scheduledFor: toBackendTimestamp(form.scheduledFor),
    notes: form.notes.trim() || null,
  }
}

async function submitForm() {
  modalLoading.value = true
  modalError.value = ''
  try {
    if (editing.value) {
      await updatePublication(...credentials(), editing.value.id, buildPayload())
    } else {
      await createPublication(...credentials(), buildPayload())
    }
    showModal.value = false
    await loadPublications()
  } catch (error) {
    modalError.value = error.message || t('marketing.errors.save')
  } finally {
    modalLoading.value = false
  }
}

async function applyTransition(publication, transition) {
  // Programar exige fecha: si no la tiene, la pedimos antes de llamar al backend.
  if (transition.requiresScheduledDate && !publication.scheduledFor) {
    scheduling.value = publication
    scheduleDate.value = ''
    modalError.value = ''
    showScheduleModal.value = true
    return
  }

  busyId.value = publication.id
  rowError[publication.id] = ''
  try {
    await updatePublication(...credentials(), publication.id, { status: transition.status })
    await loadPublications()
  } catch (error) {
    rowError[publication.id] = error.message || t('marketing.errors.transition')
  } finally {
    busyId.value = null
  }
}

async function submitSchedule() {
  modalLoading.value = true
  modalError.value = ''
  try {
    await updatePublication(...credentials(), scheduling.value.id, {
      status: 'SCHEDULED',
      scheduledFor: toBackendTimestamp(scheduleDate.value),
    })
    showScheduleModal.value = false
    await loadPublications()
  } catch (error) {
    modalError.value = error.message || t('marketing.errors.schedule')
  } finally {
    modalLoading.value = false
  }
}

function confirmRemove(publication) {
  removing.value = publication
  modalError.value = ''
  showDeleteModal.value = true
}

async function submitRemove() {
  modalLoading.value = true
  modalError.value = ''
  try {
    await deletePublication(...credentials(), removing.value.id)
    showDeleteModal.value = false
    await loadPublications()
  } catch (error) {
    modalError.value = error.message || t('marketing.errors.remove')
  } finally {
    modalLoading.value = false
  }
}

function clearFilters() {
  filters.status = ''
  filters.platform = ''
  filters.projectId = ''
}

// El filtrado lo resuelve el backend, que además acota por empresa.
watch(filters, loadPublications)

onMounted(async () => {
  await Promise.all([loadPublications(), loadProjects()])
})
</script>
