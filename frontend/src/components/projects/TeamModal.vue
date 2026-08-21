<template>
  <BaseModal v-model="show" :title="editingTeam ? $t('projects.team.modal.editTitle') : $t('projects.team.modal.newTitle')" max-width="480px">
    <form class="modal-form" @submit.prevent="handleSubmit">
      <div class="form-field">
        <label>{{ $t('projects.team.modal.name') }} <span class="req">*</span></label>
        <input v-model="form.nombre" type="text" :placeholder="$t('projects.team.modal.namePlaceholder')" required />
      </div>
      <div class="form-field">
        <label>{{ $t('projects.team.modal.area') }} <span class="req">*</span></label>
        <select v-model="form.area">
          <option value="">{{ $t('projects.team.modal.selectArea') }}</option>
          <option v-for="area in MOCK_AREAS" :key="area" :value="area">{{ area }}</option>
        </select>
      </div>
      <div class="form-field">
        <label>{{ $t('projects.team.modal.members') }}</label>
        <div class="members-checklist">
          <label
            v-for="m in members"
            :key="m.id_usuario"
            class="member-check"
          >
            <input type="checkbox" :value="m.id_usuario" v-model="form.miembros" />
            {{ m.nombre }} {{ m.apellido }}
          </label>
          <span v-if="members.length === 0" class="no-members">{{ $t('projects.team.modal.noMembers') }}</span>
        </div>
      </div>

      <p v-if="error" class="modal-error">{{ error }}</p>

      <div class="modal-actions">
        <button type="button" class="btn-secondary" @click="show = false">{{ $t('projects.team.modal.cancel') }}</button>
        <button type="submit" class="btn-primary" :disabled="submitting">
          {{ editingTeam ? $t('projects.team.modal.save') : $t('projects.team.modal.create') }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseModal from '@/components/UI/Modal/BaseModal.vue'

const { t } = useI18n()

const AREA_LABELS = {
  Desarrollo: 'Engineering',
  Diseño: 'Design',
  Calidad: 'Quality',
  Infraestructura: 'Infrastructure',
  Gestión: 'Management',
}

const MOCK_AREAS = Object.values(AREA_LABELS)

const props = defineProps({
  modelValue:  { type: Boolean, required: true },
  editingTeam: { type: Object, default: null },
  members:     { type: Array, default: () => [] },
  submitting:  { type: Boolean, default: false },
  error:       { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'submit'])

const show = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const form = ref({ nombre: '', area: '', miembros: [] })

watch(() => props.modelValue, (open) => {
  if (!open) return
  if (props.editingTeam) {
    form.value = {
      nombre:   props.editingTeam.nombre,
      area:     AREA_LABELS[props.editingTeam.area] || props.editingTeam.area,
      miembros: props.editingTeam.miembros.map(m => m.id_usuario),
    }
  } else {
    form.value = { nombre: '', area: '', miembros: [] }
  }
})

function handleSubmit() {
  emit('submit', { ...form.value })
}
</script>

<style scoped>
.modal-form  { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.form-field  { display: flex; flex-direction: column; gap: 6px; }
.form-field label { font-size: var(--k-font-size-caption); color: var(--k-gray-5); letter-spacing: 0.05em; font-family: var(--k-font-sans); }
.form-field input,
.form-field select {
  background: var(--k-shade-1); border: 1px solid var(--k-shade-6);
  color: var(--k-color-text); font-family: var(--k-font-sans); font-size: var(--k-font-size-body-small);
  padding: 10px 12px; outline: none;
  transition: border-color 0.15s;
}
.form-field input:focus,
.form-field select:focus { border-color: var(--k-color-primary); }
.form-field select option { background: var(--k-shade-2); }
.req { color: var(--k-color-primary); }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
.modal-error   { font-size: var(--k-font-size-caption-lg); color: var(--k-state-error-text); font-family: var(--k-font-sans); }

.members-checklist {
  display: flex; flex-direction: column; gap: 6px;
  max-height: 180px; overflow-y: auto;
}
.member-check {
  display: flex; align-items: center; gap: 8px;
  font-size: var(--k-font-size-body-small); color: var(--k-color-text); cursor: pointer;
  font-family: var(--k-font-sans);
}
.member-check input { accent-color: var(--k-color-primary); }
.no-members { font-size: var(--k-font-size-body-small); color: var(--k-gray-3); font-family: var(--k-font-sans); }

.btn-primary {
  background: var(--k-color-primary); border: none; padding: 10px 18px; cursor: pointer;
  font-family: var(--k-font-sans); font-size: var(--k-font-size-caption-lg); font-weight: 600;
  color: var(--k-shade-1); transition: filter 0.15s;
}
.btn-primary:hover { filter: brightness(1.1); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary {
  background: var(--k-shade-3); border: 1px solid var(--k-shade-6); color: var(--k-color-text);
  font-family: var(--k-font-sans); font-size: var(--k-font-size-caption-lg); padding: 10px 18px;
  cursor: pointer; transition: border-color 0.15s;
}
.btn-secondary:hover { border-color: var(--k-gray-1); }
</style>
