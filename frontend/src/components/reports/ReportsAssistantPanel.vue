<template>
  <aside class="ctx-panel">
    <div class="ctx-top">
      <span class="ctx-badge">Reports AI</span>
      <label class="toggle">
        <input :checked="modelValue" type="checkbox" @change="$emit('update:modelValue', $event.target.checked)" />
        <span class="toggle-track"><span class="toggle-thumb"></span></span>
      </label>
    </div>

    <div class="ctx-section">
      <p class="ctx-label">AI Insights</p>
      <p class="ctx-insight">
        Based on recent data, your top-performing project is consuming
        72% of the budget with an estimated 12.5% ROI. Consider
        reallocating budget to high-performing projects.
      </p>
    </div>

    <div class="ctx-divider"></div>

    <div class="ctx-section">
      <p class="ctx-label">Ask something, performance, ideas...</p>
      <div class="ctx-input-wrap">
        <input class="ctx-input" placeholder="Type your question..." disabled />
      </div>
    </div>

    <div class="ctx-section">
      <p class="ctx-label">Actions</p>
      <div class="ctx-actions">
        <Button label="Quick Summary of Q1 Project Launch" />
        <Button label="Analyze Budget Deviation" />
        <Button label="Compare to Last Year" />
      </div>
    </div>

    <div class="ctx-divider"></div>

    <div class="ctx-section">
      <p class="ctx-label">Budget Usage</p>
      <div class="donut-wrap">
        <DonutChart
          :pct="72"
          color="#c9a962"
          :size="80"
          :radius="30"
          :stroke-width="10"
          label="72%"
          label-color="#fff"
          :label-font-size="13"
          :label-offset-y="4"
          display-width="90px"
        />
      </div>
      <div class="donut-legend">
        <span class="dl-item"><span class="dl-dot gold"></span>Used (72%)</span>
        <span class="dl-item"><span class="dl-dot dim"></span>Remaining (28%)</span>
      </div>
    </div>

    <div class="ctx-divider"></div>

    <div class="ctx-section">
      <p class="ctx-label">Task Completion</p>
      <div class="bar-list">
        <div v-for="item in completionItems" :key="item.label" class="bar-item">
          <div class="bar-track"><div class="bar-fill" :class="item.color" :style="{ width: item.width }"></div></div>
          <span class="bar-val">{{ item.value }}</span>
        </div>
      </div>
      <div class="bar-labels">
        <span v-for="item in completionItems" :key="item.label">{{ item.label }}</span>
      </div>
    </div>
  </aside>
</template>

<script setup>
import Button from '../UI/Button/Button.vue'
import DonutChart from '../UI/DonutChart/DonutChart.vue'

defineProps({
  modelValue: Boolean,
})

defineEmits(['update:modelValue'])

const completionItems = [
  { label: 'Completed', value: 245, width: '75%', color: 'gold' },
  { label: 'In Progress', value: 42, width: '30%', color: 'blue' },
  { label: 'Pending', value: 18, width: '18%', color: 'dim' },
]
</script>

<style scoped>
.ctx-panel {
  padding: 24px 20px;
  border-left: 1px solid #1e1e1e;
  background: rgba(10,10,10,0.9);
  overflow-y: auto;
}

.ctx-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.ctx-badge {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  font-weight: 700;
  color: #c9a962;
  letter-spacing: 0.04em;
}

.toggle { display: flex; align-items: center; cursor: pointer; }
.toggle input { display: none; }
.toggle-track {
  width: 30px;
  height: 16px;
  background: #1e1e1e;
  border-radius: 8px;
  position: relative;
  transition: background .2s;
}
.toggle input:checked + .toggle-track { background: rgba(201,169,98,0.3); }
.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #444;
  transition: transform .2s, background .2s;
}
.toggle input:checked + .toggle-track .toggle-thumb {
  transform: translateX(14px);
  background: #c9a962;
}

.ctx-section { margin-bottom: 16px; }

.ctx-label {
  font-family: 'Manrope', sans-serif;
  font-size: 9px;
  font-weight: 700;
  color: #444;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin: 0 0 8px;
}

.ctx-insight {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  color: #666;
  line-height: 1.7;
  margin: 0;
}

.ctx-divider {
  height: 1px;
  background: #141414;
  margin: 16px 0;
}

.ctx-input {
  width: 100%;
  padding: 8px 10px;
  background: rgba(255,255,255,0.03);
  border: 1px solid #1e1e1e;
  color: #555;
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  outline: none;
  cursor: not-allowed;
  box-sizing: border-box;
}

.ctx-actions :deep(.btn) {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  background: rgba(255,255,255,0.02);
  border: 1px solid #1a1a1a;
  color: #555;
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  border-radius: 0;
  margin-bottom: 6px;
}

.ctx-actions :deep(.btn:hover) {
  border-color: rgba(201,169,98,0.3);
  color: #c9a962;
}

.donut-wrap {
  display: flex;
  justify-content: center;
  margin: 8px 0;
}

.donut-legend {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.dl-item,
.bar-val,
.bar-labels span {
  font-family: 'Manrope', sans-serif;
  font-size: 10px;
  color: #555;
}

.dl-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.dl-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.dl-dot.gold { background: #c9a962; }
.dl-dot.dim { background: #333; }

.bar-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 6px;
}

.bar-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bar-track {
  flex: 1;
  height: 6px;
  background: #1a1a1a;
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill { height: 100%; border-radius: 3px; }
.bar-fill.gold { background: #c9a962; }
.bar-fill.blue { background: #60a5fa; }
.bar-fill.dim { background: #444; }

.bar-val {
  min-width: 24px;
  text-align: right;
}

.bar-labels {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

@media (max-width: 1100px) {
  .ctx-panel {
    border-left: none;
    border-top: 1px solid #181818;
  }
}
</style>
