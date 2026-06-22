<template>
  <div v-if="report" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-box">
      <div class="modal-header">
        <span class="modal-title">{{ report.titulo }}</span>
        <button class="modal-close" @click="$emit('close')">✕</button>
      </div>
      <div class="rdetail-body">
        <div class="rdetail-row">
          <span class="rdetail-label">{{ $t('reports.reportModal.labelType') }}</span>
          <span class="type-tag">{{ report.tipo }}</span>
        </div>
        <div class="rdetail-row">
          <span class="rdetail-label">{{ $t('reports.reportModal.labelProject') }}</span>
          <span class="rdetail-val">{{ projectName }}</span>
        </div>
        <div class="rdetail-row">
          <span class="rdetail-label">{{ $t('reports.reportModal.labelDate') }}</span>
          <span class="rdetail-val">{{ formatDate(report.fecha_generacion) }}</span>
        </div>
        <div v-if="report.contenido_url" class="rdetail-row">
          <span class="rdetail-label">{{ $t('reports.reportModal.labelContentUrl') }}</span>
          <a :href="report.contenido_url" target="_blank" rel="noopener" class="rdetail-link">
            {{ $t('reports.reportModal.openDocument') }}
          </a>
        </div>
        <div v-else class="rdetail-row">
          <span class="rdetail-label">{{ $t('reports.reportModal.labelContentUrl') }}</span>
          <span class="rdetail-val dim">{{ $t('reports.reportModal.notProvided') }}</span>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-outline" @click="$emit('close')">{{ $t('reports.reportModal.close') }}</button>
        <button class="btn-outline" @click="$emit('view-metrics', report.id_proyecto)">
          {{ $t('reports.reportModal.viewMetrics') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatDate } from '../../utils/statusHelpers.js'

const props = defineProps({
  report:   { type: Object, default: null },
  projects: { type: Array, default: () => [] },
})

defineEmits(['close', 'view-metrics'])

const projectName = computed(() =>
  props.projects.find((p) => p.id_proyecto === props.report?.id_proyecto)?.nombre ?? '—'
)
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
.rdetail-body { display: flex; flex-direction: column; gap: 0; margin-bottom: 20px; }
.rdetail-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #1a1a1a; }
.rdetail-label { font-family: 'Manrope', sans-serif; font-size: 10px; font-weight: 700; color: #555; letter-spacing: 0.06em; text-transform: uppercase; }
.rdetail-val { font-family: 'Manrope', sans-serif; font-size: 12px; color: #aaa; }
.rdetail-val.dim { color: #444; }
.rdetail-link { font-family: 'Manrope', sans-serif; font-size: 12px; color: #c9a962; text-decoration: none; transition: opacity .2s; }
.rdetail-link:hover { opacity: 0.7; }
.type-tag {
  font-family: 'Manrope', sans-serif; font-size: 10px; font-weight: 700; color: #a78bfa;
  background: rgba(167,139,250,0.08); padding: 2px 7px; letter-spacing: 0.04em;
}
.modal-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
.btn-outline {
  display: flex; align-items: center; gap: 6px; padding: 7px 14px; background: #111111;
  border: 1px solid #2a2a2a; color: #888; font-family: 'Manrope', sans-serif; font-size: 12px;
  font-weight: 500; cursor: pointer; transition: border-color .2s, color .2s;
}
.btn-outline:hover { border-color: #c9a962; color: #c9a962; }
</style>
