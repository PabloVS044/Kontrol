<template>
  <div class="kpi-grid">
    <Card
      v-for="metric in metrics"
      :key="metric.subtitle"
      :title="metric.title"
      :subtitle="metric.subtitle"
      back="rgba(255,255,255,0.03)"
      titleColor="#faf8f5"
      borderColor="#1e1e1e"
      shadowColor="rgba(0,0,0,0.25)"
    >
      <Pill
        :label="metric.pill"
        :btnColor="metric.pillBg"
        :circleColor="metric.pillColor"
        :textColor="metric.pillColor"
      />
    </Card>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from '../UI/Card/Card.vue'
import Pill from '../UI/Pill/Pill.vue'
import { formatBudget } from '../../utils/statusHelpers.js'

const { t } = useI18n()

const props = defineProps({
  loading: Boolean,
  projectCount: { type: Number, default: 0 },
  completedCount: { type: Number, default: 0 },
  totalBudget: { type: Number, default: 0 },
})

const metrics = computed(() => [
  {
    title: '32.5%',
    subtitle: t('reports.kpi.roiGrowth'),
    pill: '+12.3%',
    pillBg: 'rgba(74,222,128,0.1)',
    pillColor: '#4ade80',
  },
  {
    title: props.loading ? '-' : String(props.projectCount),
    subtitle: t('reports.kpi.activeProjects'),
    pill: '+8.2%',
    pillBg: 'rgba(74,222,128,0.1)',
    pillColor: '#4ade80',
  },
  {
    title: props.loading ? '-' : String(props.completedCount),
    subtitle: t('reports.kpi.completed'),
    pill: '+15',
    pillBg: 'rgba(167,139,250,0.1)',
    pillColor: '#a78bfa',
  },
  {
    title: props.loading ? '-' : formatBudget(props.totalBudget),
    subtitle: t('reports.kpi.budgetTotal'),
    pill: '-2.1%',
    pillBg: 'rgba(251,113,133,0.1)',
    pillColor: '#fb7185',
  },
])
</script>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.kpi-grid :deep(.card) {
  min-height: 94px;
  padding: 16px;
}

.kpi-grid :deep(.card-title) {
  font-size: 28px;
}

.kpi-grid :deep(.card-subtitle) {
  color: #555;
}

@media (max-width: 1100px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .kpi-grid { gap: 8px; }
}
</style>
