<script setup>
import AppNavbar from '../components/AppNavbar.vue'
import Anchor from '../components/UI/Button/Anchor.vue'

// Función para el botón
const handleNewProject = () => {
  window.alert('Funcionalidad de creación en desarrollo para el Sprint 2');
};

// Simulación de datos de proyectos
const projects = [
  { id: 1, name: 'Restock Math 2026', desc: 'Annual textbook purchase.', progress: 62, status: 'On Track', color: 'var(--Primary)' },
  { id: 2, name: 'Website Redesign', desc: 'Full corporate site overhaul.', progress: 40, status: 'At Risk', color: 'var(--Error)' },
  { id: 3, name: 'Mobile App Launch', desc: 'iOS/Android release QA.', progress: 81, status: 'Critical', color: 'var(--Error)' }
]
</script>

<template>
  <div class="projects-layout">
    <AppNavbar />

    <div class="main-container">
      <!-- PANEL IZQUIERDO: PROYECTOS -->
      <main class="content">
        <header class="header">
          <div class="header-left">
            <h1 class="title">My Projects</h1>
            <p class="subtitle">Projects you are enrolled in as admin or member</p>
          </div>
          <div class="header-actions">
            <div @click.capture="handleNewProject" style="cursor: pointer;">
                <Anchor href="#" class="btn-gold" label="+ New Project">
                + New project
                </Anchor>
            </div>
          </div>
        </header>

        <!-- TABS DE FILTRO -->
        <div class="tabs">
          <span class="tab active">All (11)</span>
          <span class="tab">As Admin (4)</span>
          <span class="tab">At Risk (2)</span>
        </div>

        <section class="project-grid">
          <div v-for="project in projects" :key="project.id" class="project-card">
            <div class="card-accent" :style="{ backgroundColor: project.color }"></div>
            <div class="card-header">
              <span class="card-name">{{ project.name }}</span>
              <span class="role-badge">Admin</span>
            </div>
            <div class="card-body">
              <p class="card-desc">{{ project.desc }}</p>
              <div class="progress-container">
                <div class="progress-bg">
                  <div class="progress-fill" :style="{ width: project.progress + '%', backgroundColor: project.color }"></div>
                </div>
                <span class="progress-value">{{ project.progress }}%</span>
              </div>
              <div class="card-bottom">
                <span :style="{ color: project.color }" class="status-text">● {{ project.status }}</span>
                <span class="due-date">Due Jan 28</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <!-- PANEL DERECHO: OVERVIEW -->
      <aside class="context-panel">
        <h2 class="ctx-title">Overview</h2>
        <p class="ctx-subtitle">Your project summary</p>

        <div class="summary-grid">
          <div class="summary-card">
            <span class="s-value">11</span>
            <span class="s-label">Total projects</span>
          </div>
          <div class="summary-card">
            <span class="s-value" style="color: var(--Error)">2</span>
            <span class="s-label">At risk</span>
          </div>
        </div>

        <div class="activity-section">
          <h3 class="ctx-label">RECENT ACTIVITY</h3>
          <div class="activity-item">
            <p><strong>Marcus Wade</strong> opened 3 issues</p>
            <span>1 hour ago</span>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 60px;
}

.projects-layout {
  display: flex;
  flex-direction: column;
  background-color: var(--Background);
  min-height: 100vh;
  color: var(--Text);
}

.main-container {
  display: flex;
  width: 100%;
  max-width: 1800px;
  margin: 0 auto;
  align-items: stretch;
}

.content {
  flex: 1;
  padding: 80px 60px;
}

.context-panel {
  width: 380px;
  flex: none;
  background-color: var(--Background2);
  border-left: 1px solid var(--Border);
  padding: 80px 32px;
  min-width: 380px;
  max-width: 380px;
  position: sticky;
  top: 0;
}

/* Estilos de Tarjetas */
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 30px;
  margin-top: 40px;
}

.project-card {
  background-color: var(--Background3);
  border: 1px solid var(--Border);
  border-radius: 4px;
}

.card-accent { height: 3px; }

.card-header { padding: 15px; display: flex; justify-content: space-between; align-items: center; }

.card-name { font-family: 'Playfair Display', serif; font-size: 1.2rem; }

.card-body { padding: 0 15px 15px; }

.card-desc { font-size: 0.8rem; color: #888; margin-bottom: 15px; }

.card-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 15px; }

/* Tabs */
.tabs { display: flex; gap: 30px; border-bottom: 1px solid var(--Border); margin-bottom: 50px; padding-bottom: 10px; }
.tab { padding-bottom: 10px; cursor: pointer; color: #666; font-size: 0.9rem; }
.tab.active { color: var(--Primary); border-bottom: 2px solid var(--Primary); }

/* Botón Dorado */
.btn-gold {
  background-color: var(--Primary);
  color: black;
  padding: 10px 20px;
  border-radius: 4px;
  font-weight: bold;
  text-decoration: none;
  display: inline-block;
}

/* Stats */
.summary-card {
  background: #111;
  padding: 15px;
  border: 1px solid var(--Border);
  margin-bottom: 10px;
}
.s-value { font-size: 1.5rem; font-weight: bold; display: block; }
.s-label { font-size: 0.7rem; color: #666; }

.ctx-title {
  font-family: 'Playfair Display', serif;
  font-size: 2rem;
  margin-bottom: 40px;
}
</style>