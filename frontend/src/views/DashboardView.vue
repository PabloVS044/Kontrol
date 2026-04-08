<script setup>
import AppNavbar from '../components/AppNavbar.vue'
import Card from '../components/UI/Card/Card.vue'
import Button from '../components/UI/Button/Button.vue'
import Pill from '../components/UI/Pill/Pill.vue'

const stats = [
  { label: 'Total Spent',      value: '$12,450.00', trend: '+2.5%',  trendColor: '#34d399', back: 'rgba(15,15,15,0.85)' },
  { label: 'Active Projects',  value: '24',         trend: '+3 new', trendColor: '#c9a962', back: 'rgba(15,15,15,0.85)' },
  { label: 'Overrun Alerts',   value: '2',          trend: 'Critical', trendColor: '#fb7185', back: 'rgba(25,10,10,0.85)' },
]
</script>

<template>
  <div class="dashboard-layout">
    <AppNavbar />

    <main class="content">
      <header class="header">
        <h1 class="title">Executive Overview</h1>
        <p class="subtitle">Welcome back, Ana González</p>
      </header>

      <!-- KPIs using Card component -->
      <section class="kpi-grid">
        <Card
          v-for="stat in stats"
          :key="stat.label"
          :title="stat.value"
          :subtitle="stat.label"
          :back="stat.back"
          titleColor="#faf8f5"
          borderColor="#1f1f1f"
          shadowColor="rgba(0,0,0,0.5)"
        >
          <Pill
            :label="stat.trend"
            :btnColor="stat.trendColor + '18'"
            :circleColor="stat.trendColor"
            :textColor="stat.trendColor"
          />
        </Card>
      </section>

      <!-- AI ASSISTANT SECTION -->
      <section class="ai-box">
        <div class="ai-content">
          <h3 class="ai-title">KONTROL AI ANALYSIS</h3>
          <p class="ai-message">"Ana, the 'Math Series 2026' stock is critical. I recommend restocking 40 units based on next week's projections."</p>
        </div>
        <Button label="GENERATE ORDER" @click="() => {}" />
      </section>

      <!-- CHARTS SECTION -->
      <div class="charts-container">
        <div class="chart-card main-chart">
          <h3>Financial Performance Trend</h3>
          <div class="chart-placeholder">
            <svg viewBox="0 0 500 150" class="line-chart">
              <path d="M0,130 L100,110 L200,120 L300,80 L400,60 L500,40"
                    fill="none" stroke="var(--Primary)" stroke-width="3" />
              <path d="M0,130 L100,110 L200,120 L300,80 L400,60 L500,40 V150 H0 Z"
                    fill="url(#grad)" opacity="0.2" />
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style="stop-color:var(--Primary);stop-opacity:1" />
                  <stop offset="100%" style="stop-color:var(--Primary);stop-opacity:0" />
                </linearGradient>
              </defs>
            </svg>
            <div class="chart-labels">
              <span>Week 1</span><span>Week 2</span><span>Week 3</span><span>Week 4</span>
            </div>
          </div>
        </div>

        <div class="chart-card mini-chart">
          <h3>Budget by Category</h3>
          <div class="bar-group">
            <label>Books</label>
            <div class="bar-bg"><div class="bar-fill" style="width: 85%"></div></div>
          </div>
          <div class="bar-group">
            <label>Logistics</label>
            <div class="bar-bg"><div class="bar-fill" style="width: 40%"></div></div>
          </div>
        </div>
      </div>

    </main>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;700&display=swap');

.dashboard-layout { display: flex; flex-direction: column; background: transparent; min-height: 100vh; }
.content { flex: 1; padding: 80px 100px; color: var(--Text); background: rgba(10,10,10,0.82); margin-top: 56px; }
.title { font-family: 'Playfair Display', serif; letter-spacing: -0.02em; font-size: 3rem; color: var(--Text); margin-bottom: 10px; }
.subtitle { font-family: 'DM Sans', sans-serif; color: #666; margin-bottom: 40px; }

/* KPI grid — override Card defaults to fit the grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 40px;
}

.kpi-grid :deep(.card) {
  max-width: none;
  width: 100%;
  margin: 0;
  border-radius: 4px;
  padding: 24px;
  gap: 12px;
}

.kpi-grid :deep(.card-title) {
  font-size: 2rem;
  font-family: 'Playfair Display', serif;
}

.kpi-grid :deep(.card-subtitle) {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #666;
}

/* AI BOX */
.ai-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(12,10,5,0.9);
  border: 1px dashed var(--Primary);
  padding: 40px;
  margin-bottom: 40px;
  gap: 32px;
}
.ai-title { color: var(--Primary); font-size: 12px; letter-spacing: 0.1em; margin-bottom: 12px; font-family: 'DM Sans', sans-serif; }
.ai-message { font-style: italic; font-size: 1.05rem; max-width: 800px; line-height: 1.6; font-family: 'DM Sans', sans-serif; }

/* Override Button to match gold style */
.ai-box :deep(.btn) {
  background: var(--Primary);
  color: #0a0a0a;
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  border-radius: 0;
  padding: 12px 24px;
  white-space: nowrap;
  flex-shrink: 0;
}

.ai-box :deep(.btn:hover) { filter: brightness(1.15); }

/* CHARTS */
.charts-container { display: flex; gap: 20px; }
.chart-card { background: rgba(12,12,12,0.85); border: 1px solid var(--Border); padding: 30px; flex: 1; }
.chart-card h3 { font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
.chart-placeholder { margin-top: 20px; }
.line-chart { width: 100%; height: 150px; }
.chart-labels { display: flex; justify-content: space-between; margin-top: 10px; color: #444; font-size: 10px; font-family: 'DM Sans', sans-serif; }

.bar-group { margin-bottom: 20px; }
.bar-group label { font-size: 12px; display: block; margin-bottom: 8px; color: #888; font-family: 'DM Sans', sans-serif; }
.bar-bg { background: #111; height: 6px; border-radius: 3px; }
.bar-fill { background: var(--Primary); height: 100%; border-radius: 3px; }
</style>
