<template>
  <div class="charts-container">
    <div class="chart-card main-chart">
      <h3>Budget Usage by Project</h3>

      <div v-if="loading" class="chart-state">Loading budgets...</div>
      <div v-else-if="error" class="chart-state chart-state--error">{{ error }}</div>
      <div v-else-if="!projects.length" class="chart-state">
        No projects with budget data yet.
      </div>
      <div v-else class="project-bars">
        <div v-for="row in projects" :key="row.id_proyecto" class="project-bar-row">
          <div class="project-bar-head">
            <span class="project-bar-name">{{ row.nombre }}</span>
            <span class="project-bar-meta">
              <span>{{ money(row.spent) }} / {{ money(row.planned) }}</span>
              <span class="project-bar-pct" :class="row.level?.toLowerCase()">{{ row.pct }}%</span>
            </span>
          </div>
          <div class="bar-bg">
            <div class="bar-fill" :class="row.level?.toLowerCase()" :style="{ width: row.pct + '%' }"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="chart-card mini-chart">
      <h3>Portfolio Snapshot</h3>
      <div class="snapshot-row">
        <span class="snapshot-label">Allocated</span>
        <span class="snapshot-value">{{ money(totalAllocated) }}</span>
      </div>
      <div class="snapshot-row">
        <span class="snapshot-label">Spent</span>
        <span class="snapshot-value">{{ money(totalSpent) }}</span>
      </div>
      <div class="snapshot-row">
        <span class="snapshot-label">Remaining</span>
        <span class="snapshot-value gold">{{ money(totalAllocated - totalSpent) }}</span>
      </div>
      <div class="snapshot-bar bar-bg">
        <div class="bar-fill" :style="{ width: spentPct + '%' }"></div>
      </div>
      <p class="snapshot-foot">{{ spentPct }}% of total budget used across {{ projectCount }} project{{ projectCount === 1 ? '' : 's' }}.</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  projects: { type: Array, default: () => [] },
  loading: Boolean,
  error: String,
  totalAllocated: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  spentPct: { type: Number, default: 0 },
  projectCount: { type: Number, default: 0 },
  money: { type: Function, required: true },
})
</script>

<style scoped>
.charts-container {
  display: flex;
  gap: 20px;
  margin-bottom: 48px;
}

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

.chart-state {
  padding: 24px 0;
  color: #8f8f8f;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
}
.chart-state--error { color: #fecdd3; }

.project-bars {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-top: 12px;
}
.project-bar-row { display: flex; flex-direction: column; gap: 6px; }
.project-bar-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  color: #faf8f5;
}
.project-bar-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 60%;
}
.project-bar-meta {
  display: flex;
  gap: 10px;
  color: #8f8f8f;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.project-bar-pct { color: #c9a962; font-weight: 600; }
.project-bar-pct.advertencia { color: #f59e0b; }
.project-bar-pct.critico { color: #fb7185; }

.bar-bg {
  background: #111;
  height: 6px;
  border-radius: 3px;
}

.bar-fill {
  background: var(--Primary);
  height: 100%;
  border-radius: 3px;
  transition: width .4s ease;
}
.bar-fill.advertencia { background: #f59e0b; }
.bar-fill.critico { background: #fb7185; }

.snapshot-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  font-family: 'Manrope', sans-serif;
}
.snapshot-label { color: #8f8f8f; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; }
.snapshot-value { color: #faf8f5; font-size: 15px; font-variant-numeric: tabular-nums; }
.snapshot-value.gold { color: var(--Primary); }
.snapshot-bar { margin: 14px 0 10px; height: 6px; border-radius: 3px; }
.snapshot-foot { color: #8f8f8f; font-family: 'Manrope', sans-serif; font-size: 12px; line-height: 1.5; }

@media (max-width: 900px) {
  .charts-container { flex-direction: column; }
}
</style>
