<template>
  <section class="chart-card trend-card">
    <div class="trend-head">
      <div>
        <h3>Financial Performance Trend</h3>
        <p class="timeline-hint">Planned budget (gold dashed) reaches the project total by the end date. Actual line is cumulative spend based on inventory movements.</p>
      </div>
      <select
        v-if="projects.length"
        :value="modelValue"
        class="trend-select"
        @change="$emit('update:modelValue', Number($event.target.value))"
      >
        <option v-for="project in projects" :key="project.id_proyecto" :value="project.id_proyecto">
          {{ project.nombre }}
        </option>
      </select>
    </div>

    <div v-if="loading" class="chart-state">Loading trend...</div>
    <div v-else-if="error" class="chart-state chart-state--error">{{ error }}</div>
    <div v-else-if="!projects.length" class="chart-state">
      No projects with start date, end date and budget set yet.
    </div>
    <div v-else-if="!chartData" class="chart-state">
      This project needs fecha_inicio, fecha_fin_planificada and presupuesto_total.
    </div>
    <svg v-else class="trend-svg" :viewBox="`0 0 ${chart.w} ${chart.h}`" preserveAspectRatio="xMidYMid meet">
      <g>
        <line
          v-for="tick in chartData.yTicks"
          :key="`yg-${tick.label}`"
          :x1="chartArea.x"
          :x2="chartArea.x + chartArea.w"
          :y1="tick.y"
          :y2="tick.y"
          stroke="#1f1f1f"
          stroke-width="1"
        />
        <text
          v-for="tick in chartData.yTicks"
          :key="`yt-${tick.label}`"
          :x="chartArea.x - 8"
          :y="tick.y + 4"
          fill="#666"
          font-size="10"
          text-anchor="end"
          font-family="Manrope, sans-serif"
        >{{ tick.label }}</text>
      </g>

      <line
        :x1="chartArea.x"
        :x2="chartArea.x + chartArea.w"
        :y1="chartArea.y + chartArea.h"
        :y2="chartArea.y + chartArea.h"
        stroke="#2a2a2a"
        stroke-width="1"
      />
      <text
        v-for="(tick, index) in chartData.xTicks"
        :key="`xt-${index}`"
        :x="tick.x"
        :y="chartArea.y + chartArea.h + 18"
        fill="#888"
        font-size="10"
        :text-anchor="index === 0 ? 'start' : index === chartData.xTicks.length - 1 ? 'end' : 'middle'"
        font-family="Manrope, sans-serif"
      >{{ tick.label }}</text>

      <path :d="chartData.plannedPath" fill="none" stroke="#c9a962" stroke-width="1.5" stroke-dasharray="6,5" opacity="0.75" />
      <path :d="chartData.actualPath" fill="none" stroke="#34d399" stroke-width="2" />

      <template v-if="chartData.todayLine">
        <line
          :x1="chartData.todayLine.x"
          :x2="chartData.todayLine.x"
          :y1="chartArea.y"
          :y2="chartArea.y + chartArea.h"
          stroke="#faf8f5"
          stroke-width="1"
          stroke-dasharray="3,3"
          opacity="0.5"
        />
        <text
          :x="chartData.todayLine.x"
          :y="chartArea.y - 6"
          fill="#faf8f5"
          font-size="10"
          text-anchor="middle"
          opacity="0.8"
          font-family="Manrope, sans-serif"
        >Today</text>
      </template>

      <g :transform="`translate(${chartArea.x + chartArea.w - 210}, ${chartArea.y + 8})`">
        <rect x="0" y="0" width="210" height="40" fill="rgba(15,15,15,0.85)" stroke="#1f1f1f" />
        <line x1="10" y1="14" x2="32" y2="14" stroke="#c9a962" stroke-width="1.5" stroke-dasharray="6,5" />
        <text x="40" y="17" fill="#8f8f8f" font-size="10" font-family="Manrope, sans-serif">Planned budget</text>
        <line x1="10" y1="30" x2="32" y2="30" stroke="#34d399" stroke-width="2" />
        <text x="40" y="33" fill="#8f8f8f" font-size="10" font-family="Manrope, sans-serif">Actual spend (movements)</text>
      </g>
    </svg>
  </section>
</template>

<script setup>
defineProps({
  modelValue: { type: [Number, String, null], default: null },
  projects: { type: Array, default: () => [] },
  loading: Boolean,
  error: String,
  chartData: { type: Object, default: null },
  chart: { type: Object, required: true },
  chartArea: { type: Object, required: true },
})

defineEmits(['update:modelValue'])
</script>

<style scoped>
.chart-card {
  background: #0c0c0c;
  border: 1px solid var(--Border);
  padding: 30px;
  flex: 1;
}

.chart-card h3 {
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 4px;
}

.trend-card { margin-bottom: 20px; }
.trend-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.timeline-hint {
  color: #8f8f8f;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  line-height: 1.6;
  margin: 4px 0 12px;
  max-width: 520px;
}
.trend-select {
  background: #0a0a0a;
  border: 1px solid #1f1f1f;
  color: #faf8f5;
  padding: 10px 12px;
  font-size: 13px;
  font-family: 'Manrope', sans-serif;
  min-width: 220px;
}
.trend-svg {
  width: 100%;
  height: auto;
  display: block;
  margin-top: 8px;
}
.chart-state {
  padding: 24px 0;
  color: #8f8f8f;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
}
.chart-state--error { color: #fecdd3; }
</style>
