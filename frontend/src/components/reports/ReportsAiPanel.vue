<template>
  <aside class="ctx-panel">
    <div class="ctx-top">
      <span class="ctx-badge">{{ $t('reports.ai.badge') }}</span>
      <label class="toggle">
        <input type="checkbox" v-model="aiEnabled" />
        <span class="toggle-track"><span class="toggle-thumb"></span></span>
      </label>
    </div>

    <div class="ctx-section">
      <p class="ctx-label">{{ $t('reports.ai.insights') }}</p>
      <p class="ctx-insight">{{ $t('reports.ai.insightText') }}</p>
    </div>

    <div class="ctx-divider"></div>

    <div class="ctx-section">
      <p class="ctx-label">{{ $t('reports.ai.askLabel') }}</p>
      <div class="ctx-input-wrap">
        <input class="ctx-input" :placeholder="$t('reports.ai.askPlaceholder')" disabled />
      </div>
    </div>

    <div class="ctx-section">
      <p class="ctx-label">{{ $t('reports.ai.actionsLabel') }}</p>
      <div class="ctx-actions">
        <Button :label="$t('reports.ai.action1')" />
        <Button :label="$t('reports.ai.action2')" />
        <Button :label="$t('reports.ai.action3')" />
      </div>
    </div>

    <div class="ctx-divider"></div>

    <!-- Budget Donut -->
    <div class="ctx-section">
      <p class="ctx-label">{{ $t('reports.ai.budgetUsageLabel') }}</p>
      <div class="donut-wrap">
        <DonutChart
          :pct="budgetPct"
          color="#c9a962"
          :size="80" :radius="30" :stroke-width="10"
          :label="budgetPct + '%'" label-color="#fff" :label-font-size="13" :label-offset-y="4"
          display-width="90px"
        />
      </div>
      <div class="donut-legend">
        <span class="dl-item"><span class="dl-dot gold"></span>{{ $t('reports.ai.used', { pct: budgetPct }) }}</span>
        <span class="dl-item"><span class="dl-dot dim"></span>{{ $t('reports.ai.remaining', { pct: 100 - budgetPct }) }}</span>
      </div>
    </div>

    <div class="ctx-divider"></div>

    <!-- Task Completion -->
    <div class="ctx-section">
      <p class="ctx-label">{{ $t('reports.ai.taskCompletionLabel') }}</p>
      <div class="bar-list">
        <div class="bar-item">
          <div class="bar-track"><div class="bar-fill gold" :style="{ width: barPct(taskStats.completadas) }"></div></div>
          <span class="bar-val">{{ taskStats.completadas }}</span>
        </div>
        <div class="bar-item">
          <div class="bar-track"><div class="bar-fill blue" :style="{ width: barPct(taskStats.enProgreso) }"></div></div>
          <span class="bar-val">{{ taskStats.enProgreso }}</span>
        </div>
        <div class="bar-item">
          <div class="bar-track"><div class="bar-fill dim" :style="{ width: barPct(taskStats.pendientes) }"></div></div>
          <span class="bar-val">{{ taskStats.pendientes }}</span>
        </div>
      </div>
      <div class="bar-labels">
        <span>{{ $t('reports.ai.completed') }}</span>
        <span>{{ $t('reports.ai.inProgress') }}</span>
        <span>{{ $t('reports.ai.pending') }}</span>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref } from 'vue'
import Button from '../UI/Button/Button.vue'
import DonutChart from '../UI/DonutChart/DonutChart.vue'

const props = defineProps({
  budgetPct: { type: Number, default: 0 },
  taskStats: { type: Object, default: () => ({ total: 0, completadas: 0, enProgreso: 0, pendientes: 0 }) },
})

const aiEnabled = ref(true)

function barPct(n) {
  return props.taskStats.total ? Math.round((n / props.taskStats.total) * 100) + '%' : '0%'
}
</script>

<style scoped>
.ctx-panel { padding: 24px 20px; border-left: 1px solid #1e1e1e; background: rgba(10, 10, 10, 0.92); overflow-y: auto; }
.ctx-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.ctx-badge { font-family: 'Manrope', sans-serif; font-size: 11px; font-weight: 700; color: #c9a962; letter-spacing: 0.04em; }

.toggle { display: flex; align-items: center; cursor: pointer; }
.toggle input { display: none; }
.toggle-track { width: 30px; height: 16px; background: #1e1e1e; border-radius: 8px; position: relative; transition: background .2s; }
.toggle input:checked + .toggle-track { background: #c9a962; }
.toggle-thumb { position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; border-radius: 50%; background: #444; transition: transform .2s, background .2s; }
.toggle input:checked + .toggle-track .toggle-thumb { transform: translateX(14px); background: #c9a962; }

.ctx-section { margin-bottom: 16px; }
.ctx-label { font-family: 'Manrope', sans-serif; font-size: 9px; font-weight: 700; color: #444; letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 8px; }
.ctx-insight { font-family: 'Manrope', sans-serif; font-size: 11px; color: #666; line-height: 1.7; margin: 0; }
.ctx-divider { height: 1px; background: #141414; margin: 16px 0; }
.ctx-input-wrap { margin-top: 4px; }
.ctx-input {
  width: 100%; padding: 8px 10px; background: #111111; border: 1px solid #1e1e1e; color: #555;
  font-family: 'Manrope', sans-serif; font-size: 11px; outline: none; cursor: not-allowed; box-sizing: border-box;
}
.ctx-actions :deep(.btn) {
  display: block; width: 100%; text-align: left; padding: 8px 10px; background: #111111;
  border: 1px solid #1a1a1a; color: #555; font-family: 'Manrope', sans-serif; font-size: 11px;
  border-radius: 0; margin-bottom: 6px; transition: border-color .2s, color .2s;
}
.ctx-actions :deep(.btn:hover) { border-color: rgba(201,169,98,0.3); color: #c9a962; }

.donut-wrap { display: flex; justify-content: center; margin: 8px 0; }
.donut-legend { display: flex; gap: 12px; justify-content: center; }
.dl-item { display: flex; align-items: center; gap: 5px; font-family: 'Manrope', sans-serif; font-size: 10px; color: #555; }
.dl-dot { width: 6px; height: 6px; border-radius: 50%; }
.dl-dot.gold { background: #c9a962; }
.dl-dot.dim { background: #333; }

.bar-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 6px; }
.bar-item { display: flex; align-items: center; gap: 8px; }
.bar-track { flex: 1; height: 6px; background: #1a1a1a; border-radius: 3px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 3px; }
.bar-fill.gold { background: #c9a962; }
.bar-fill.blue { background: #60a5fa; }
.bar-fill.dim { background: #444; }
.bar-val { font-family: 'Manrope', sans-serif; font-size: 10px; color: #555; min-width: 24px; text-align: right; }
.bar-labels { display: flex; flex-direction: column; gap: 8px; }
.bar-labels span { font-family: 'Manrope', sans-serif; font-size: 10px; color: #444; padding-top: 2px; }

@media (max-width: 1100px) {
  .ctx-panel { border-left: none; border-top: 1px solid #181818; }
}
</style>
