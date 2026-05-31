<template>
  <div class="detail-header">
    <button class="back-btn" @click="$emit('back')">
      <ChevronLeft :size="14" />
      {{ $t('reports.detail.backBtn') }}
    </button>

    <div v-if="loading" class="header-skeleton">
      <div class="skel-line long"></div>
      <div class="skel-line short"></div>
      <div class="skel-line mid"></div>
    </div>

    <div v-else-if="project" class="header-content">
      <div class="header-top">
        <div>
          <h1 class="proj-name">{{ project.nombre }}</h1>
          <p class="proj-desc">{{ project.descripcion || $t('reports.detail.noDescription') }}</p>
        </div>
        <div class="header-actions">
          <Pill
            :label="statusPill(project.estado).label"
            :btnColor="statusPill(project.estado).bg"
            :circleColor="statusPill(project.estado).color"
            :textColor="statusPill(project.estado).color"
          />
          <button class="btn-outline">
            <Download :size="12" />
            {{ $t('reports.detail.export') }}
          </button>
        </div>
      </div>

      <div class="meta-row">
        <div class="meta-item">
          <span class="meta-label">{{ $t('reports.detail.metaStartDate') }}</span>
          <span class="meta-value">{{ formatDate(project.fecha_inicio) }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">{{ $t('reports.detail.metaDueDate') }}</span>
          <span class="meta-value">{{ formatDate(project.fecha_fin_planificada) ?? $t('reports.detail.notSet') }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">{{ $t('reports.detail.metaBudget') }}</span>
          <span class="meta-value gold">{{ formatBudget(project.presupuesto_total) }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">{{ $t('reports.detail.metaProgress') }}</span>
          <span class="meta-value">{{ progress }}%</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">{{ $t('reports.detail.metaProjectId') }}</span>
          <span class="meta-value dim">#{{ project.id_proyecto }}</span>
        </div>
      </div>

      <div class="overall-progress">
        <div class="op-track">
          <div class="op-fill" :style="{ width: progress + '%' }"></div>
        </div>
        <span class="op-label">{{ $t('reports.detail.complete', { pct: progress }) }}</span>
      </div>
    </div>

    <div v-else class="error-state">
      <p>{{ $t('reports.detail.notFound') }}</p>
      <button class="btn-outline" @click="$emit('back')">{{ $t('reports.detail.goBack') }}</button>
    </div>
  </div>
</template>

<script setup>
import { ChevronLeft, Download } from 'lucide-vue-next'
import Pill from '../UI/Pill/Pill.vue'
import { formatBudget, formatDate, statusPill } from '../../utils/statusHelpers.js'

defineProps({
  project: { type: Object, default: null },
  loading: Boolean,
  progress: { type: Number, default: 0 },
})

defineEmits(['back'])
</script>

<style scoped>
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: #555;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  cursor: pointer;
  margin-bottom: 20px;
  padding: 0;
  transition: color .2s;
}
.back-btn:hover { color: #c9a962; }

.detail-header {
  margin-bottom: 28px;
  padding-bottom: 24px;
  border-bottom: 1px solid #1e1e1e;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.proj-name {
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.4rem, 3vw, 2rem);
  font-weight: 700;
  color: #faf8f5;
  margin: 0 0 6px;
}

.proj-desc {
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  color: var(--TextMuted);
  margin: 0;
  max-width: 560px;
}

.header-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: #111111;
  border: 1px solid #2a2a2a;
  color: #888;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  cursor: pointer;
  transition: border-color .2s, color .2s;
}
.btn-outline:hover { border-color: #c9a962; color: #c9a962; }

.meta-row {
  display: flex;
  gap: 28px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.meta-item { display: flex; flex-direction: column; gap: 3px; }
.meta-label {
  font-family: 'Manrope', sans-serif;
  font-size: 9px;
  font-weight: 700;
  color: #444;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.meta-value {
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #ccc;
}
.meta-value.gold { color: #c9a962; }
.meta-value.dim { color: #555; }

.overall-progress { display: flex; align-items: center; gap: 12px; }
.op-track {
  flex: 1;
  height: 4px;
  background: #1a1a1a;
  border-radius: 2px;
  overflow: hidden;
  max-width: 400px;
}
.op-fill {
  height: 100%;
  background: linear-gradient(90deg, #b27f2a, #c9a962);
  border-radius: 2px;
  transition: width .6s ease;
}
.op-label {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  color: #555;
  white-space: nowrap;
}

.header-actions :deep(.pill) {
  padding: 4px 10px;
  font-size: 11px;
}

.header-skeleton { display: flex; flex-direction: column; gap: 10px; }
.skel-line {
  height: 14px;
  background: #1a1a1a;
  border-radius: 2px;
  animation: pulse 1.5s ease-in-out infinite;
}
.skel-line.long { width: 40%; }
.skel-line.mid { width: 60%; }
.skel-line.short { width: 25%; }
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.error-state {
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: #fb7185;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
}
</style>
