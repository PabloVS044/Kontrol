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
            
            <div class="card-main-body">
              <div class="card-header">
                <span class="card-name">{{ project.name }}</span>
                <span class="role-badge">ADMIN</span>
              </div>
              
              <p class="card-desc">{{ project.desc }}</p>
              
              <div class="progress-section">
                <div class="progress-container">
                  <div class="progress-bg">
                    <div class="progress-fill" :style="{ width: project.progress + '%', backgroundColor: project.color }"></div>
                  </div>
                </div>
                <span class="progress-value">{{ project.progress }}%</span>
              </div>

              <div class="card-bottom">
                <span :style="{ color: project.color }" class="status-text">● {{ project.status }}</span>
                <span class="due-date">Due Jan 28</span>
              </div>
            </div>

            <!-- FOOTER DE LA TARJETA (Lo nuevo para el Commit 4) -->
            <div class="card-footer">
              <button class="open-btn" @click="() => alert('Project details coming soon')">
                Open project <span class="arrow">→</span>
              </button>
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
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;700&display=swap');

/* --- Estilos Globales y Tipografía ---*/
.title { font-family: 'Playfair Display', serif; letter-spacing: -0.02em; font-size: 3rem; color: var(--Text); }
.subtitle, p, span, label { font-family: 'DM Sans', sans-serif; }

/* --- Header --- */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 60px;
}

/* --- Layout --- */
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
  padding: 80px 100px;
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
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 30px;
  margin-top: 40px;
}

.project-card {
  background-color: var(--Background3);
  border: 1px solid var(--Border);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
}

.card-accent { height: 3px; }

.card-main-body { padding: 25px; flex: 1; }

.card-header { padding: 15px; display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;}
.card-name { font-family: 'Playfair Display', serif; font-size: 1.3rem; line-height: 1.2; }

.card-body { padding: 0 15px 15px; }

.role-badge { font-size: 9px; border: 1px solid #333; padding: 2px 8px; color: #888; letter-spacing: 1px; }

.card-desc { font-size: 0.85rem; color: #777; margin-bottom: 25px; line-height: 1.5; }

.progress-section { margin-bottom: 20px; }
.progress-bg { background: #1a1a1a; height: 4px; width: 100%; border-radius: 2px; }
.progress-fill { height: 100%; border-radius: 2px; }
.progress-value { font-size: 11px; color: #555; margin-top: 8px; display: block; }

.card-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 15px; }
.status-text { font-size: 12px; font-weight: bold; }
.due-date { font-size: 11px; color: #444; }

.card-footer { border-top: 1px solid var(--Border); padding: 15px; display: flex; justify-content: center; background: var(--Background); }

.open-btn { background: transparent; color: var(--Primary); border: none; font-size: 11px; font-weight: bold; cursor: pointer; letter-spacing: 1.5px; text-transform: uppercase; }

/* Tabs */
.tabs { display: flex; gap: 30px; border-bottom: 1px solid var(--Border); margin-bottom: 50px; padding-bottom: 10px; }
.tab { padding-bottom: 10px; cursor: pointer; color: #666; font-size: 0.9rem; transition: color 0.3s; }
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
  transition: filter 0.3s;
}

.btn-gold:hover { filter: brightness(1.2); }

/* Stats */
.summary-card {
  background: var(--Background);
  padding: 20px;
  border: 1px solid var(--Border);
  margin-bottom: 15px;
}
.s-value { font-size: 1.8rem; font-weight: bold; display: block; font-family: 'Playfair Display', serif; }
.s-label { font-size: 0.7rem; color: #555; text-transform: uppercase; letter-spacing: 1px; }

.ctx-title {
  font-family: 'Playfair Display', serif;
  font-size: 2.2rem;
  margin-bottom: 40px;
}
.ctx-label { color: var(--Primary); font-size: 11px; letter-spacing: 2px; margin-bottom: 20px; margin-top: 40px; }
.activity-item p { font-size: 0.9rem; color: #999; margin-bottom: 5px; }
.act-time { font-size: 11px; color: #444; }
</style>