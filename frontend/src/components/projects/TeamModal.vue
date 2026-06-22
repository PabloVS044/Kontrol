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
.form-field label { font-size: 11px; color: #888; letter-spacing: 0.05em; font-family: 'Manrope', sans-serif; }
.form-field input,
.form-field select {
  background: #0a0a0a; border: 1px solid #1f1f1f;
  color: #faf8f5; font-family: 'Manrope', sans-serif; font-size: 13px;
  padding: 10px 12px; outline: none;
  transition: border-color 0.15s;
}
.form-field input:focus,
.form-field select:focus { border-color: #caa860; }
.form-field select option { background: #0f0f0f; }
.req { color: #caa860; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
.modal-error   { font-size: 12px; color: #fb7185; font-family: 'Manrope', sans-serif; }

.members-checklist {
  display: flex; flex-direction: column; gap: 6px;
  max-height: 180px; overflow-y: auto;
}
.member-check {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: #faf8f5; cursor: pointer;
  font-family: 'Manrope', sans-serif;
}
.member-check input { accent-color: #caa860; }
.no-members { font-size: 13px; color: #555; font-family: 'Manrope', sans-serif; }

.btn-primary {
  background: #caa860; border: none; padding: 10px 18px; cursor: pointer;
  font-family: 'Manrope', sans-serif; font-size: 12px; font-weight: 600;
  color: #0a0a0a; transition: filter 0.15s;
}
.btn-primary:hover { filter: brightness(1.1); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary {
  background: #111111; border: 1px solid #1f1f1f; color: #faf8f5;
  font-family: 'Manrope', sans-serif; font-size: 12px; padding: 10px 18px;
  cursor: pointer; transition: border-color 0.15s;
}
.btn-secondary:hover { border-color: #333; }
</style>
