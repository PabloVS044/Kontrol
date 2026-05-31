<template>
  <div class="section-block">
    <div class="section-header">
      <span class="section-title">{{ $t('reports.chart.title') }}</span>
      <div class="chart-legend">
        <span class="legend-item"><span class="leg-dot gold"></span> {{ $t('reports.chart.legendBudget') }}</span>
        <span class="legend-item"><span class="leg-dot blue"></span> {{ $t('reports.chart.legendProgress') }}</span>
      </div>
    </div>

    <div class="chart-wrap">
      <div class="y-axis">
        <span>100</span><span>75</span><span>50</span><span>25</span><span>0</span>
      </div>
      <div class="chart-area">
        <svg viewBox="0 0 600 160" preserveAspectRatio="none" class="perf-svg">
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#c9a962" stop-opacity="0.3" />
              <stop offset="100%" stop-color="#c9a962" stop-opacity="0" />
            </linearGradient>
            <linearGradient id="lineGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.2" />
              <stop offset="100%" stop-color="#60a5fa" stop-opacity="0" />
            </linearGradient>
          </defs>
          <line v-for="y in [0,40,80,120,160]" :key="y" x1="0" :y1="y" x2="600" :y2="y" stroke="#1f1f1f" stroke-width="1" />
          <path d="M0,140 C60,120 120,100 180,80 C240,60 300,50 360,40 C420,30 480,20 600,15 L600,160 L0,160 Z" fill="url(#lineGrad)" />
          <path d="M0,140 C60,120 120,100 180,80 C240,60 300,50 360,40 C420,30 480,20 600,15" fill="none" stroke="#c9a962" stroke-width="2" />
          <path d="M0,155 C60,150 120,140 180,130 C240,120 300,105 360,90 C420,75 480,60 600,45 L600,160 L0,160 Z" fill="url(#lineGrad2)" />
          <path d="M0,155 C60,150 120,140 180,130 C240,120 300,105 360,90 C420,75 480,60 600,45" fill="none" stroke="#60a5fa" stroke-width="1.5" stroke-dasharray="4 3" />
          <circle v-for="dot in dots" :key="dot.x" :cx="dot.x" :cy="dot.y" r="3" fill="#c9a962" />
        </svg>
        <div class="x-axis">
          <span v-for="month in months" :key="month">{{ month }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const months = computed(() =>
  ['jan', 'feb', 'mar', 'apr', 'may', 'jun'].map(k => t(`reports.chart.months.${k}`))
)
const dots = [
  { x: 0, y: 140 },
  { x: 120, y: 100 },
  { x: 240, y: 60 },
  { x: 360, y: 40 },
  { x: 480, y: 20 },
  { x: 600, y: 15 },
]
</script>

<style scoped>
.section-block {
  background: #111111;
  border: 1px solid #1e1e1e;
  padding: 18px;
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.section-title {
  font-family: 'Playfair Display', serif;
  font-size: 20px;
  color: #faf8f5;
}

.chart-legend,
.legend-item,
.chart-wrap {
  display: flex;
}

.chart-legend { gap: 14px; }
.legend-item {
  align-items: center;
  gap: 5px;
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  color: #555;
}

.leg-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.leg-dot.gold { background: #c9a962; }
.leg-dot.blue { background: #60a5fa; }
.chart-wrap { gap: 8px; align-items: stretch; }

.y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-bottom: 20px;
}

.y-axis span,
.x-axis span {
  font-family: 'Manrope', sans-serif;
  font-size: 10px;
  color: #333;
}

.chart-area { flex: 1; }
.perf-svg {
  width: 100%;
  height: 160px;
  display: block;
}

.x-axis {
  display: flex;
  justify-content: space-between;
  padding: 6px 0 0;
}
</style>
