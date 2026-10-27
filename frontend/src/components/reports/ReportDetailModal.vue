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
  position: fixed; inset: 0; background: var(--k-overlay-backdrop);
  display: flex; align-items: center; justify-content: center; z-index: var(--k-z-modal-overlay);
}
.modal-box { background: var(--k-shade-3); border: 1px solid var(--k-shade-7); width: 100%; max-width: 440px; padding: 24px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.modal-title { font-family: 'Manrope', sans-serif; font-size: 0.8125rem; font-weight: 700; color: var(--k-color-text); letter-spacing: 0.04em; }
.modal-close { background: none; border: none; color: var(--k-text-faint); font-size: 0.875rem; cursor: pointer; line-height: 1; transition: color .2s; }
.modal-close:hover { color: var(--k-text-soft); }
.rdetail-body { display: flex; flex-direction: column; gap: 0; margin-bottom: 20px; }
.rdetail-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--k-shade-4); }
.rdetail-label { font-family: 'Manrope', sans-serif; font-size: 0.6875rem; font-weight: 700; color: var(--k-text-faint); letter-spacing: 0.06em; text-transform: uppercase; }
.rdetail-val { font-family: 'Manrope', sans-serif; font-size: 0.75rem; color: var(--k-text-soft); }
.rdetail-val.dim { color: var(--k-text-faint); }
.rdetail-link { font-family: 'Manrope', sans-serif; font-size: 0.75rem; color: var(--k-color-primary); text-decoration: none; transition: opacity .2s; }
.rdetail-link:hover { opacity: 0.7; }
.type-tag {
  font-family: 'Manrope', sans-serif; font-size: 0.6875rem; font-weight: 700; color: var(--k-hue-violet);
  background: rgba(var(--k-hue-violet-rgb), 0.08); padding: 2px 7px; letter-spacing: 0.04em;
}
.modal-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
.btn-outline {
  display: flex; align-items: center; gap: 6px; padding: 7px 14px; background: var(--k-shade-3);
  border: 1px solid var(--k-shade-7); color: var(--k-text-muted); font-family: 'Manrope', sans-serif; font-size: 0.75rem;
  font-weight: 500; cursor: pointer; transition: border-color .2s, color .2s;
}
.btn-outline:hover { border-color: var(--k-color-primary); color: var(--k-color-primary); }
</style>
