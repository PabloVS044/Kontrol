<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-box">
      <div class="modal-header">
        <span class="modal-title">{{ $t('reports.createModal.title') }}</span>
        <button class="modal-close" @click="$emit('close')">✕</button>
      </div>
      <form class="modal-form" @submit.prevent="submit">
        <div class="form-group">
          <label class="form-label">{{ $t('reports.createModal.labelTitle') }}</label>
          <input v-model="form.titulo" class="form-input" :placeholder="$t('reports.createModal.titlePlaceholder')" required maxlength="200" />
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('reports.createModal.labelType') }}</label>
          <select v-model="form.tipo" class="form-input" required>
            <option value="">{{ $t('reports.createModal.selectType') }}</option>
            <option value="AVANCE">{{ $t('reports.createModal.typeProgress') }}</option>
            <option value="PRESUPUESTO">{{ $t('reports.createModal.typeBudget') }}</option>
            <option value="INCIDENTE">{{ $t('reports.createModal.typeIncident') }}</option>
            <option value="CONSOLIDADO">{{ $t('reports.createModal.typeConsolidated') }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('reports.createModal.labelProject') }}</label>
          <select v-model="form.id_proyecto" class="form-input" required>
            <option value="">{{ $t('reports.createModal.selectProject') }}</option>
            <option v-for="p in projects" :key="p.id_proyecto" :value="p.id_proyecto">{{ p.nombre }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">{{ $t('reports.createModal.labelUrl') }} <span class="form-optional">{{ $t('reports.createModal.optional') }}</span></label>
          <input v-model="form.contenido_url" class="form-input" :placeholder="$t('reports.createModal.urlPlaceholder')" type="url" />
        </div>
        <p v-if="error" class="form-error">{{ error }}</p>
        <div class="modal-footer">
          <button type="button" class="btn-outline" @click="$emit('close')">{{ $t('reports.createModal.cancel') }}</button>
          <button type="submit" class="btn-primary" :disabled="creating">
            {{ creating ? $t('reports.createModal.creating') : $t('reports.createModal.create') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  show:     { type: Boolean, default: false },
  projects: { type: Array, default: () => [] },
  creating: { type: Boolean, default: false },
  error:    { type: String, default: null },
})

const emit = defineEmits(['close', 'submit'])

const form = ref({ titulo: '', tipo: '', id_proyecto: '', contenido_url: '' })

watch(() => props.show, (open) => {
  if (open) form.value = { titulo: '', tipo: '', id_proyecto: '', contenido_url: '' }
})

function submit() {
  const payload = {
    titulo: form.value.titulo,
    tipo: form.value.tipo,
    id_proyecto: Number(form.value.id_proyecto),
  }
  if (form.value.contenido_url) payload.contenido_url = form.value.contenido_url
  emit('submit', payload)
}
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; background: #000;
  display: flex; align-items: center; justify-content: center; z-index: 999;
}
.modal-box { background: #111; border: 1px solid #2a2a2a; width: 100%; max-width: 440px; padding: 24px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.modal-title { font-family: 'Manrope', sans-serif; font-size: 13px; font-weight: 700; color: #e8e4de; letter-spacing: 0.04em; }
.modal-close { background: none; border: none; color: #555; font-size: 14px; cursor: pointer; line-height: 1; transition: color .2s; }
.modal-close:hover { color: #ccc; }
.modal-form { display: flex; flex-direction: column; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-label { font-family: 'Manrope', sans-serif; font-size: 11px; font-weight: 700; color: #555; letter-spacing: 0.08em; text-transform: uppercase; }
.form-optional { font-weight: 400; color: #444; text-transform: none; letter-spacing: 0; }
.form-input {
  padding: 8px 10px; background: #111111; border: 1px solid #2a2a2a; color: #ccc;
  font-family: 'Manrope', sans-serif; font-size: 12px; outline: none; width: 100%;
  box-sizing: border-box; transition: border-color .2s;
}
.form-input:focus { border-color: rgba(202,168,96,0.4); }
.form-input option { background: #111; }
.form-error { font-family: 'Manrope', sans-serif; font-size: 11px; color: #fb7185; margin: 0; }
.modal-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
.btn-outline {
  display: flex; align-items: center; gap: 6px; padding: 7px 14px; background: #111111;
  border: 1px solid #2a2a2a; color: #888; font-family: 'Manrope', sans-serif; font-size: 12px;
  font-weight: 500; cursor: pointer; transition: border-color .2s, color .2s;
}
.btn-outline:hover { border-color: #caa860; color: #caa860; }
.btn-primary {
  display: flex; align-items: center; padding: 8px 16px; background: rgba(202,168,96,0.12);
  border: 1px solid rgba(202,168,96,0.3); color: #caa860; font-family: 'Manrope', sans-serif;
  font-size: 12px; font-weight: 600; cursor: pointer; transition: background .2s;
}
.btn-primary:hover:not(:disabled) { background: rgba(202,168,96,0.22); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
