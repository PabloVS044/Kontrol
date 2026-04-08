<template>
  <div class="dashboard-layout">
    <AppNavbar />
    <main class="content">
      <h1 class="title">Executive Overview</h1>
      <p class="subtitle">Welcome back, Ana González</p>

      <!-- Sección de KPIs con datos -->
      <section class="kpi-grid">
      <div v-for="stat in stats" :key="stat.label" class="kpi-card">
        <span class="stat-label">{{ stat.label }}</span>
          <h2 class="stat-value" :style="{ color: stat.color }">{{ stat.value }}</h2>
          <span class="stat-trend">{{ stat.trend }}</span>
      </div>
      </section>

      <!-- Sección de IA -->
      <section class="ai-box">
        <h3>AI Assistant Analysis</h3>
        <p>"Based on current sales, Libreria Ana should restock 20 units of 'Advanced Math' before March 20th."</p>
        <button class="ai-btn">OPTIMIZE NOW</button>
      </section>
    </main>
  </div>
</template>

<style scoped>
.dashboard-layout { display: flex; background: var(--Background); min-height: 100vh; }
.content { flex: 1; padding: 60px; color: var(--Text); }
.kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
.kpi-card { background: var(--Background2); border: 1px solid var(--Border); padding: 24px; }
.ai-box { border: 1px dashed var(--Primary); padding: 30px; background: var(--Background); }
.ai-btn { background: var(--Primary); color: black; font-weight: bold; padding: 10px 20px; border: none; margin-top: 15px; }
</style>