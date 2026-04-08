<script setup>
import AppNavbar from '../components/AppNavbar.vue'

// Datos simulados para las gráficas y KPIs
const stats = [
  { label: 'TOTAL SPENT', value: '$12,450.00', trend: '+2.5%', color: 'var(--Primary)' },
  { label: 'ACTIVE PROJECTS', value: '24', trend: '+3 new', color: 'var(--Primary)' },
  { label: 'OVERRUN ALERTS', value: '2', trend: 'Critical', color: 'var(--Error)' }
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

      <!-- KPIs Section with data -->
      <section class="kpi-grid">
      <div v-for="stat in stats" :key="stat.label" class="kpi-card">
        <span class="stat-label">{{ stat.label }}</span>
          <h2 class="stat-value" :style="{ color: stat.color }">{{ stat.value }}</h2>
          <span class="stat-trend">{{ stat.trend }}</span>
      </div>
      </section>

      <!-- IA ASSISTANT SECTION (Luxury Box) -->
      <section class="ai-box">
        <div class="ai-content">
            <h3 class="ai-title">KONTROL AI ANALYSIS</h3>
            <p class="ai-message">"Ana, the 'Math Series 2026' stock is critical. I recommend restocking 40 units based on next week's projections."</p>
        </div>
        <button class="ai-btn">GENERATE ORDER</button>
      </section>

      <!-- CHARTS SECTION -->
      <div class="charts-container">
        <!-- Chart 1: Financial Trend -->
        <div class="chart-card main-chart">
          <h3>Financial Performance Trend</h3>
          <div class="chart-placeholder">
            <!-- Simulación de gráfica de líneas con SVG -->
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

        <!-- Chart 2: Categories -->
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

.dashboard-layout { display: flex; background: var(--Background); min-height: 100vh; }
.content { flex: 1; padding: 80px 100px; color: var(--Text); }
.title { font-family: 'Playfair Display', serif; letter-spacing: -0.02em; font-size: 3rem; color: var(--Text); margin-bottom: 10px; }
.subtitle, p, span, label { font-family: 'DM Sans', sans-serif; }
.subtitle { color: #666; margin-bottom: 40px; }

/* KPIs */
.kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
.kpi-card { background: var(--Background2); border: 1px solid var(--Border); box-shadow: 0 10px 30px rgba(0,0,0,0.5); transition: transform 0.3s ease; padding: 24px; border-radius: 4px; }

/* AI BOX */
.ai-box { display: flex; justify-content: space-between; align-items: center; background: linear-gradiente(90deg, var(--Background) 0%, #12120e 100%); border: 1px dashed var(--Primary); padding: 40px; margin-bottom: 40px; position: relative; }
.ai-title { color: var(--Primary); font-size: 12px; margin-bottom: 15px; }
.ai-message { font-style: italic; font-size: 1.1rem; margin-bottom: 20px; max-width: 800px; }
.ai-btn { background: var(--Primary); color: black; border: none; padding: 10px 20px; font-weight: bold; cursor: pointer; }

/* CHARTS */
.charts-container { display: flex; gap: 20px; }
.chart-card { background: var(--Background2); border: 1px solid var(--Border); padding: 30px; flex: 1; }
.chart-placeholder { margin-top: 20px; }
.line-chart { width: 100%; height: 150px; }
.chart-labels { display: flex; justify-content: space-between; margin-top: 10px; color: #444; font-size: 10px; }

.bar-group { margin-bottom: 20px; }
.bar-group label { font-size: 12px; display: block; margin-bottom: 5px; }
.bar-bg { background: #111; height: 8px; border-radius: 4px; }
.bar-fill { background: var(--Primary); height: 100%; border-radius: 4px; }
</style>