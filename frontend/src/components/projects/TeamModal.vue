<template>
  <BaseModal v-model="show" :title="editingTeam ? 'Edit team' : 'New team'" max-width="480px">
    <form class="modal-form" @submit.prevent="handleSubmit">
      <div class="form-field">
        <label>Name <span class="req">*</span></label>
        <input v-model="form.nombre" type="text" placeholder="Team name" required />
      </div>
      <div class="form-field">
        <label>Area <span class="req">*</span></label>
        <select v-model="form.area">
          <option value="">— Select area —</option>
          <option v-for="area in MOCK_AREAS" :key="area" :value="area">{{ area }}</option>
        </select>
      </div>
      <div class="form-field">
        <label>Members</label>
        <div class="members-checklist">
          <label
            v-for="m in members"
            :key="m.id_usuario"
            class="member-check"
          >
            <input type="checkbox" :value="m.id_usuario" v-model="form.miembros" />
            {{ m.nombre }} {{ m.apellido }}
          </label>
          <span v-if="members.length === 0" class="no-members">No members in project.</span>
        </div>
      </div>

      <p v-if="error" class="modal-error">{{ error }}</p>

      <div class="modal-actions">
        <button type="button" class="btn-secondary" @click="show = false">Cancel</button>
        <button type="submit" class="btn-primary" :disabled="submitting">
          {{ editingTeam ? 'Save' : 'Create' }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import BaseModal from '@/components/UI/Modal/BaseModal.vue'

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
.form-field select:focus { border-color: #c9a962; }
.form-field select option { background: #0f0f0f; }
.req { color: #c9a962; }
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
.member-check input { accent-color: #c9a962; }
.no-members { font-size: 13px; color: #555; font-family: 'Manrope', sans-serif; }

.btn-primary {
  background: #c9a962; border: none; padding: 10px 18px; cursor: pointer;
  font-family: 'Manrope', sans-serif; font-size: 12px; font-weight: 600;
  color: #0a0a0a; transition: filter 0.15s;
}
.btn-primary:hover { filter: brightness(1.1); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary {
  background: transparent; border: 1px solid #1f1f1f; color: #faf8f5;
  font-family: 'Manrope', sans-serif; font-size: 12px; padding: 10px 18px;
  cursor: pointer; transition: border-color 0.15s;
}
.btn-secondary:hover { border-color: #333; }
</style>
