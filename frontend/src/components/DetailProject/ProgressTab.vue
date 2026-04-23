<template>
  <div class="progress-tab-container">
    <div class="title-container">
      <div class="logo-indicator">
        <Clock />
      </div>
      <h3>Bitácora de avances</h3>
      <p>{{ entries.length }} entradas registradas</p>
      <div class="btn-add">
        <Button
          v-if="canManageProgress"
          label="Agregar"
          type="button"
          @click="openModal"
        />
      </div>
    </div>

    <div v-if="loading" class="pt-state">Cargando bitácora...</div>
    <div v-else-if="errorMessage" class="pt-state pt-state--error">{{ errorMessage }}</div>

    <template v-else>
      <div v-if="entries.length === 0" class="pt-empty">
        No hay entradas registradas aún.
      </div>
      <div v-else class="progress-items">
        <ProgressCard
          v-for="entry in entries"
          :key="entry.id"
          :entry="entry"
        />
      </div>
    </template>
  </div>

  <ProgressModal
    v-model="showModal"
    :submitting="submitting"
    :error="modalError"
    @submit="handleSubmit"
  />
</template>

<script setup>
import { ref, watch } from 'vue'
import { Clock } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import ProgressCard from './ProgressCard.vue'
import ProgressModal from './ProgressModal.vue'
import Button from '../UI/Button/Button.vue'
import './ProgressTab.css'

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
const entries = ref([])
const canManageProgress = ref(false)
const showModal = ref(false)
const submitting = ref(false)
const modalError = ref('')

function authHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${authStore.token}`,
    'X-Company-ID': authStore.idEmpresaActual,
    ...extra,
  }
}

async function loadProgress() {
  if (!props.projectId || !authStore.token || !authStore.idEmpresaActual) {
    loading.value = false
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
      errorMessage.value = payload.message || 'No se pudo cargar la bitácora.'
      return
    }

    entries.value = payload.data?.entries ?? []
    canManageProgress.value = payload.data?.canManageProgress === true
  } catch {
    errorMessage.value = 'No se pudo cargar la bitácora.'
  } finally {
    loading.value = false
  }
}

function openModal() {
  modalError.value = ''
  showModal.value = true
}

async function handleSubmit(formData) {
  modalError.value = ''
  submitting.value = true

  try {
    const res = await fetch(`/api/projects/${props.projectId}/progress`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        title: formData.title,
        details: formData.details || undefined,
        updateType: formData.updateType,
        progressPercentage: formData.progressPercentage,
        happenedAt: formData.happenedAt || undefined,
      }),
    })

    const body = await res.json()

    if (!res.ok) {
      modalError.value = body.message || 'No se pudo guardar la entrada.'
      return
    }

    showModal.value = false
    await loadProgress()
    emit('updated')
  } catch {
    modalError.value = 'Error de red, inténtalo de nuevo.'
  } finally {
    submitting.value = false
  }
}

watch(
  () => [props.projectId, authStore.token, authStore.idEmpresaActual],
  () => loadProgress(),
  { immediate: true },
)
</script>
