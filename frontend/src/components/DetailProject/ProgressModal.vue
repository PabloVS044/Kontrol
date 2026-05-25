<template>
  <BaseModal v-model="show" :title="$t('projects.progress.modal.title')" maxWidth="500px">
    <form class="modal-form" @submit.prevent="handleSubmit">

      <div class="form-field">
        <label>{{ $t('projects.progress.modal.descriptionLabel') }} <span class="req">*</span></label>
        <textarea v-model="form.title" :placeholder="$t('projects.progress.modal.descriptionPlaceholder')" rows="3" required></textarea>
      </div>

      <div class="form-field">
        <label>{{ $t('projects.progress.modal.detailsLabel') }}</label>
        <textarea v-model="form.details" :placeholder="$t('projects.progress.modal.detailsPlaceholder')" rows="2"></textarea>
      </div>

      <div class="form-row">
        <div class="form-field">
          <label>{{ $t('projects.progress.modal.updateTypeLabel') }}</label>
          <select v-model="form.updateType">
            <option value="UPDATE">{{ $t('projects.progress.modal.typeUpdate') }}</option>
            <option value="MILESTONE">{{ $t('projects.progress.modal.typeMilestone') }}</option>
            <option value="BLOCKER">{{ $t('projects.progress.modal.typeBlocker') }}</option>
          </select>
        </div>

        <div class="form-field">
          <label>{{ $t('projects.progress.modal.progressLabel') }} <span class="req">*</span></label>
          <input v-model.number="form.progressPercentage" type="number" min="0" max="100" step="1" required />
        </div>
      </div>

      <div class="form-field">
        <label>{{ $t('projects.progress.modal.dateLabel') }}</label>
        <input v-model="form.happenedAt" type="datetime-local" />
      </div>

      <p v-if="error" class="modal-error">{{ error }}</p>

      <div class="modal-actions">
        <button type="button" class="btn-secondary" @click="show = false">{{ $t('projects.progress.modal.cancel') }}</button>
        <button type="submit" class="btn-primary" :disabled="submitting">
          {{ submitting ? $t('projects.progress.modal.saving') : $t('projects.progress.modal.submit') }}
        </button>
      </div>

    </form>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseModal from '@/components/UI/Modal/BaseModal.vue'
import './ProgressModal.css'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  submitting:  { type: Boolean, default: false },
  error:       { type: String, default: '' },
})

const { t } = useI18n()

const emit = defineEmits(['update:modelValue', 'submit'])

const show = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

function emptyForm() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return {
    title:              '',
    details:            '',
    updateType:         'UPDATE',
    progressPercentage: 0,
    happenedAt:         now.toISOString().substring(0, 16),
  }
}

const form = ref(emptyForm())

watch(() => props.modelValue, (open) => {
  if (open) form.value = emptyForm()
})

function handleSubmit() {
  emit('submit', { ...form.value })
}
</script>
