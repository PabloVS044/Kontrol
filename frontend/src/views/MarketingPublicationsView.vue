<template>
  <div class="mkt-root">
    <AppNavbar />

    <div class="mkt-layout">
      <div class="mkt-header">
        <div>
          <h1 class="mkt-title">Publicaciones</h1>
          <p class="mkt-subtitle">Planifica, programa y publica el contenido de tus proyectos</p>
        </div>
        <Button
          v-if="canManage"
          label="Nueva publicación"
          backColor="var(--k-color-primary)"
          @click="openCreate"
        />
      </div>

      <!-- Filtros: estado, canal y proyecto -->
      <div class="mkt-filters">
        <select v-model="filters.status" class="mkt-select" aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          <option v-for="estado in PUBLICATION_STATUSES" :key="estado" :value="estado">
            {{ publicationStatusLabel(estado) }}
          </option>
        </select>

        <select v-model="filters.platform" class="mkt-select" aria-label="Filtrar por canal">
          <option value="">Todos los canales</option>
          <option v-for="canal in PUBLICATION_PLATFORMS" :key="canal.value" :value="canal.value">
            {{ canal.label }}
          </option>
        </select>

        <select v-model="filters.projectId" class="mkt-select" aria-label="Filtrar por proyecto">
          <option value="">Todos los proyectos</option>
          <option v-for="proyecto in projects" :key="proyecto.id_proyecto" :value="proyecto.id_proyecto">
            {{ proyecto.nombre }}
          </option>
        </select>

        <button v-if="hasActiveFilters" class="mkt-clear" @click="clearFilters">Limpiar filtros</button>
      </div>

      <p v-if="fetchError" class="mkt-error">{{ fetchError }}</p>

      <p v-else-if="loading" class="mkt-empty">Cargando publicaciones…</p>

      <p v-else-if="!publications.length" class="mkt-empty">
        {{ hasActiveFilters
          ? 'Ninguna publicación coincide con estos filtros.'
          : 'Todavía no hay publicaciones. Crea la primera.' }}
      </p>

      <div v-else class="mkt-grid">
        <article v-for="publication in publications" :key="publication.id" class="mkt-card">
          <div class="mkt-card-top">
            <span
              class="mkt-pill"
              :style="{
                color: publicationStatusPill(publication.status).color,
                background: publicationStatusPill(publication.status).bg,
              }"
            >{{ publicationStatusPill(publication.status).label }}</span>
            <span class="mkt-channel">{{ platformLabel(publication.platform) }}</span>
          </div>

          <img
            v-if="publication.assetUrl"
            :src="publication.assetUrl"
            :alt="`Imagen de ${publication.title}`"
            class="mkt-asset"
            @error="onAssetError"
          />

          <h2 class="mkt-card-title">{{ publication.title }}</h2>
          <p v-if="publication.caption" class="mkt-card-caption">{{ publication.caption }}</p>

          <dl class="mkt-meta">
            <div>
              <dt>Proyecto</dt>
              <dd>{{ publication.projectName || '—' }}</dd>
            </div>
            <div>
              <dt>{{ publication.status === 'PUBLISHED' ? 'Publicada' : 'Programada' }}</dt>
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
            >{{ transition.label }}</button>

            <button class="mkt-action" :disabled="busyId === publication.id" @click="openEdit(publication)">Editar</button>
            <button class="mkt-action mkt-action--danger" :disabled="busyId === publication.id" @click="confirmRemove(publication)">Eliminar</button>
          </div>

          <p v-if="rowError[publication.id]" class="mkt-row-error">{{ rowError[publication.id] }}</p>
        </article>
      </div>
    </div>

    <BaseModal v-model="showModal" :title="editing ? 'Editar publicación' : 'Nueva publicación'" maxWidth="560px">
      <form class="mkt-form" @submit.prevent="submitForm">
        <label class="mkt-field">
          <span>Título</span>
          <input v-model="form.title" type="text" maxlength="180" required />
        </label>

        <label class="mkt-field">
          <span>Contenido</span>
          <textarea v-model="form.caption" rows="4" maxlength="12000"></textarea>
        </label>

        <label class="mkt-field">
          <span>Imagen (URL)</span>
          <input v-model="form.assetUrl" type="url" maxlength="500" placeholder="https://…" />
        </label>

        <div class="mkt-field-row">
          <label class="mkt-field">
            <span>Canal destino</span>
            <select v-model="form.platform" required>
              <option v-for="canal in PUBLICATION_PLATFORMS" :key="canal.value" :value="canal.value">
                {{ canal.label }}
              </option>
            </select>
          </label>

          <label class="mkt-field">
            <span>Formato</span>
            <select v-model="form.format">
              <option v-for="formato in PUBLICATION_FORMATS" :key="formato.value" :value="formato.value">
                {{ formato.label }}
              </option>
            </select>
          </label>
        </div>

        <div class="mkt-field-row">
          <label class="mkt-field">
            <span>Proyecto</span>
            <select v-model="form.projectId" required>
              <option value="" disabled>Selecciona un proyecto</option>
              <option v-for="proyecto in projects" :key="proyecto.id_proyecto" :value="proyecto.id_proyecto">
                {{ proyecto.nombre }}
              </option>
            </select>
          </label>

          <label class="mkt-field">
            <span>Fecha programada</span>
            <input v-model="form.scheduledFor" type="datetime-local" />
          </label>
        </div>

        <label class="mkt-field">
          <span>Notas internas</span>
          <textarea v-model="form.notes" rows="2" maxlength="1200"></textarea>
        </label>

        <p v-if="modalError" class="mkt-error">{{ modalError }}</p>

        <div class="mkt-form-actions">
          <button type="button" class="mkt-action" @click="showModal = false">Cancelar</button>
          <Button
            type="submit"
            :label="modalLoading ? 'Guardando…' : 'Guardar'"
            :disabled="modalLoading"
            backColor="var(--k-color-primary)"
          />
        </div>
      </form>
    </BaseModal>

    <BaseModal v-model="showScheduleModal" title="Programar publicación" maxWidth="420px">
      <form class="mkt-form" @submit.prevent="submitSchedule">
        <p class="mkt-hint">Una publicación programada necesita fecha y hora.</p>

        <label class="mkt-field">
          <span>Fecha programada</span>
          <input v-model="scheduleDate" type="datetime-local" required />
        </label>

        <p v-if="modalError" class="mkt-error">{{ modalError }}</p>

        <div class="mkt-form-actions">
          <button type="button" class="mkt-action" @click="showScheduleModal = false">Cancelar</button>
          <Button
            type="submit"
            :label="modalLoading ? 'Programando…' : 'Programar'"
            :disabled="modalLoading"
            backColor="var(--k-color-primary)"
          />
        </div>
      </form>
    </BaseModal>

    <BaseModal v-model="showDeleteModal" title="Eliminar publicación" maxWidth="420px">
      <p class="mkt-hint">
        Se eliminará «{{ removing?.title }}». Esta acción no se puede deshacer.
      </p>

      <p v-if="modalError" class="mkt-error">{{ modalError }}</p>

      <div class="mkt-form-actions">
        <button type="button" class="mkt-action" @click="showDeleteModal = false">Cancelar</button>
        <Button
          :label="modalLoading ? 'Eliminando…' : 'Eliminar'"
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
  platformLabel,
  publicationStatusLabel,
  publicationStatusPill,
} from '../utils/publicationStatus.js'
import './MarketingPublications.css'

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
  if (!value) return 'Sin fecha'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Sin fecha'
    : date.toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' })
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
    fetchError.value = error.message || 'No se pudieron cargar las publicaciones.'
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
    modalError.value = error.message || 'No se pudo guardar la publicación.'
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
    rowError[publication.id] = error.message || 'No se pudo cambiar el estado.'
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
    modalError.value = error.message || 'No se pudo programar la publicación.'
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
    modalError.value = error.message || 'No se pudo eliminar la publicación.'
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
