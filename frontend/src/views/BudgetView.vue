<script setup>
import AppNavbar from '../components/AppNavbar.vue'

const activities = [
  { name: 'Marketing', percentage: 51 },
  { name: 'Development', percentage: 16 },
  { name: 'Design', percentage: 5 }
]
</script>

<template>
  <div class="budget-layout">
    <AppNavbar />
    <main class="content">
      <header class="header">
        <h1 class="title">Budget Management</h1>
        <nav class="breadcrumbs">
          <span class="gold">Dashboard</span> • <span class="gray">Project plans</span>
        </nav>
      </header>

      <div class="main-grid">
        <!-- COLUMNA IZQUIERDA -->
        <div class="left-panel">
          <section class="summary-card">
            <div class="summary-info">
              <h2 class="card-title">Budget Summary</h2>
              <div class="amount-group">
                <span class="label">Total Allocated</span>
                <h3 class="total-value">$8,293.00</h3>
              </div>
              <div class="amount-group">
                <span class="label gold">Remaining</span>
                <h3 class="remaining-value gold">$2,322.00</h3>
              </div>
            </div>
          </section>

          <section class="distribution-section">
            <h2 class="section-subtitle">BUDGET DISTRIBUTION BY ACTIVITY</h2>
            <div v-for="act in activities" :key="act.name" class="bar-item">
              <div class="bar-header">
                <span>{{ act.name }}</span>
                <span class="gold">{{ act.percentage }}%</span>
              </div>
              <div class="bar-container">
                <div class="bar-fill" :style="{ width: act.percentage + '%' }"></div>
              </div>
            </div>
          </section>
        </div>

        <!-- COLUMNA DERECHA -->
        <div class="right-panel">
          <!-- AI Insights -->
          <div class="ai-insight-box">
            <h4 class="gold">AI Insights</h4>
            <p>Based on recent data, the 'Brand Awareness' project is consuming 72% of the budget with a 12.3% ROI. Consider reallocating budget to high performing projects.</p>
          </div>

          <!-- Overrun Monitoring -->
          <section class="monitoring-section">
            <h2 class="section-subtitle">Overrun Monitoring</h2>
            
            <!-- Caja Roja de Alerta -->
            <div class="alert-box">
              <div class="alert-content">
                <div class="alert-header">
                  <span class="icon">⚠</span>
                  <strong>Alert</strong>
                </div>
                <p>Potential overspeeding in development Budget</p>
                <a href="#" @click.prevent="() => alert('Redirecting to report...')">Learn More</a>
              </div>
            </div>

            <!-- Gráfica de Tendencia (SVG) -->
            <div class="trend-chart">
               <p class="chart-label">Development Expected vs. Actual Spending</p>
               <svg viewBox="0 0 400 150" class="line-svg">
                  <path d="M0,140 L100,120 L200,110 L300,90 L400,70" stroke="#333" fill="none" stroke-dasharray="4"/>
                  <path d="M0,140 L80,130 L180,100 L280,60 L400,30" stroke="var(--Primary)" fill="none" stroke-width="3"/>
               </svg>
            </div>
          </section>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* ESTILOS BASE */
.budget-layout { background-color: var(--Background); min-height: 100vh; color: #fff; }
.content { padding: 60px 80px; }
.title { font-family: 'Playfair Display', serif; font-size: 3rem; margin-bottom: 10px; }
.breadcrumbs { font-size: 0.9rem; margin-bottom: 40px; }
.gold { color: var(--Primary); }
.gray { color: #666; }
.main-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 40px; }

/* COLUMNA IZQUIERDA */
.summary-card { background: var(--Background2); border: 1px solid var(--Border); padding: 40px; margin-bottom: 40px; }
.card-title { font-family: 'Playfair Display', serif; font-size: 1.8rem; margin-bottom: 30px; }
.amount-group { margin-bottom: 20px; }
.label { font-size: 0.8rem; text-transform: uppercase; color: #666; display: block; }
.total-value { font-size: 2.5rem; font-weight: bold; }
.remaining-value { font-size: 2rem; font-weight: bold; }
.section-subtitle { letter-spacing: 2px; font-size: 0.8rem; color: #fff; margin-bottom: 30px; font-weight: bold; text-transform: uppercase; }
.bar-item { margin-bottom: 30px; }
.bar-header { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 0.9rem; }
.bar-container { background: #1a1a1a; height: 40px; border-radius: 20px; overflow: hidden; }
.bar-fill { background: linear-gradient(90deg, var(--Primary2), var(--Primary)); height: 100%; border-radius: 20px; }

/* COLUMNA DERECHA */
.ai-insight-box { border: 1px dashed var(--Border); padding: 25px; background: #080808; margin-bottom: 40px; }
.ai-insight-box p { font-size: 0.9rem; color: #888; line-height: 1.6; margin-top: 10px; }

.alert-box { background: var(--Error); padding: 20px; border-radius: 4px; display: flex; justify-content: space-between; margin-bottom: 30px; }
.alert-header { display: flex; gap: 10px; margin-bottom: 5px; align-items: center; }
.alert-box p { font-size: 0.9rem; font-weight: bold; margin-bottom: 10px; }
.alert-box a { font-size: 0.8rem; text-decoration: underline; color: #fff; font-weight: bold; }

.trend-chart { background: #080808; border: 1px solid var(--Border); padding: 20px; }
.chart-label { font-size: 0.7rem; color: #666; margin-bottom: 15px; }
.line-svg { width: 100%; height: auto; }
</style>