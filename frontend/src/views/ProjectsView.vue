<script setup>
import AppNavbar from '../components/AppNavbar.vue'
import Anchor from '../components/UI/Button/Anchor.vue'

// Función para el botón
const handleNewProject = () => {
  window.alert('Funcionalidad de creación en desarrollo para el Sprint 2');
};

const handleExport = () => {
  window.alert('Feature: "Export Summary" (PDF/CSV) will be available in Sprint 2');
};

const handleOpenProject = (projectName) => {
  window.alert(`Redirecting to details of: ${projectName}... (Coming soon)`);
};

// Simulación de datos de proyectos
const projects = [
  { id: 1, name: 'Restock Math 2026', desc: 'Annual textbook purchase for the season.', progress: 62, status: 'On Track', role: 'ADMIN', color: 'var(--Primary)' },
  { id: 2, name: 'Website Redesign', desc: 'Full corporate site overhaul and speed optimization.', progress: 40, status: 'At Risk', role: 'ADMIN', color: 'var(--Error)' },
  { id: 3, name: 'Mobile App Launch', desc: 'iOS/Android release QA and Store submission.', progress: 81, status: 'Critical', role: 'MEMBER', color: '#60a5fa' }
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
          <span class="tab">At Member (7)</span>
        </div>

        <section class="project-grid">
          <div v-for="project in projects" :key="project.id" class="project-card">
            <div class="card-accent" :style="{ backgroundColor: project.color }"></div>
            
            <div class="card-main-body">
              <div class="card-header">
                <span class="card-name">{{ project.name }}</span>
                <span :class="['role-badge', project.role.toLowerCase()]">{{ project.role }}</span>
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
                <!-- Status Chip Estilo Figma -->
                <div class="status-chip" :style="{ borderColor: project.color + '44', backgroundColor: project.color + '11' }">
                    <span class="status-dot" :style="{ backgroundColor: project.color }"></span>
                    <span :style="{ color: project.color }" class="status-text">{{ project.status }}</span>
                </div>
                <span class="due-date">Due <strong>Jan 28</strong></span>
              </div>
            </div>

            <!-- FOOTER DE LA TARJETA -->
            <div class="card-footer">
              <button class="open-btn" @click="handleOpenProject(project.name)">
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
        <p class="ctx-label">AT A GLANCE</p>

        <div class="summary-grid">
          <div class="summary-card">
            <span class="s-value">11</span>
            <span class="s-label">Total projects</span>
            <span class="s-sub" style="color: var(--Success)">4 as admin</span>
          </div>
          <div class="summary-card">
            <span class="s-value" style="color: var(--Error)">2</span>
            <span class="s-label">At risk</span>
            <span class="s-sub" style="color: var(--Error)">Needs attention</span>
          </div>
          <div class="summary-card">
              <span class="s-value">3</span>
              <span class="s-label">Completed</span>
              <span class="s-sub">This quarter</span>
            </div>
            <div class="summary-card">
              <span class="s-value">1</span>
              <span class="s-label">Paused</span>
              <span class="s-sub" style="color: var(--Primary)">Awaiting budget</span>
            </div>
          </div>

          <div class="activity-section">
            <p class="ctx-label">RECENT ACTIVITY</p>
            <div class="activity-item">
              <div class="avatar">MW</div>
              <div class="act-text">
                  <p><strong>Marcus Wade</strong> opened 3 issues</p>
                  <span class="act-time">1 hour ago</span>
              </div>
            </div>
          </div>

          <div class="quick-actions">
              <p class="ctx-label">QUICK ACTIONS</p>
              <button class="action-btn-gold" @click="handleNewProject">+ Create new project</button>
              <button class="action-btn-outline" @click="handleExport">↓ Export summary</button>
          </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;700&display=swap');

/* --- Estilos Globales y Tipografía ---*/
.title { font-family: 'Playfair Display', serif; letter-spacing: -0.02em; font-size: 3.5rem; color: var(--Text); margin-bottom: 5px; }
.subtitle, p, span, label, button, strong { font-family: 'DM Sans', sans-serif; }

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
  max-width: 1920px;
  margin: 0 auto;
  align-items: stretch;
}

.content {
  flex: 1;
  padding: 60px 80px;
}

/* Panel Derecho */
.context-panel {
  width: 420px;
  flex: none;
  background-color: var(--Background2);
  border-left: 1px solid var(--Border);
  padding: 80px 32px;
  min-width: 380px;
  max-width: 380px;
  position: sticky;
  top: 0;
}
.ctx-title {
  font-family: 'Playfair Display', serif;
  font-size: 2.2rem;
  color: #fff;
  margin-bottom: 5px;
}
.ctx-subtitle {
  color: #666;
  font-size: 0.85rem;
  margin-bottom: 40px;
  font-family: 'DM Sans', sans-serif;
}
.ctx-label { color: var(--Primary); font-size: 11px; letter-spacing: 2px; margin-bottom: 20px; margin-top: 40px; }

/* Grid 2x2 */
.summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.summary-card { background:var(--Background); border: 1px solid #1a1a1a; padding: 20px; border-radius: 4px; }
.s-value { font-size: 2rem; font-weight: bold; color: #fff; font-family: 'Playfair Display', serif; }
.s-label { font-size: 10px; color: #666; text-transform: uppercase; display: block; margin: 5px 0; }
.s-sub { font-size: 10px; font-weight: 700; }

/* Estilos de Tarjetas */
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 30px;
  margin-top: 40px;
}

.project-card {
  background-color: var(--Background);
  border: 1px solid var(--Border);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
}

.project-card:hover {
  transform: translateY(-8px);
  border-color: var(--Primary);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6), 0 0 15px rgba(202, 168, 96, 0.1);
}

.card-accent { height: 3px; }
.card-main-body { padding: 30px; flex: 1; }
.card-header { padding: 15px; display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;}
.card-name { font-family: 'Playfair Display', serif; font-size: 1.5rem; line-height: 1.6; color: #fff; }
.card-body { padding: 0 15px 15px; }
.card-desc { font-size: 0.9rem; color: #888; margin-bottom: 25px; line-height: 1.6; margin: 20px 0; }
.card-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 15px; } 

/* ROLES */
.role-badge { font-size: 10px; font-weight: 700; padding: 4px 10px; letter-spacing: 1px; border-radius: 2px; border: 1px solid #333; color: #888; }
.role-badge.admin { color: var(--Primary); background: rgba(202, 168, 96, 0.1); border: 1px solid rgba(202, 168, 96, 0.2); }
.role-badge.member { color: #60a5fa; background: rgba(96, 165, 250, 0.1); border: 1px solid rgba(96, 165, 250, 0.2); }

/* STATUS CHIP */
.status-chip { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border: 1px solid; border-radius: 2px; }
.status-dot { width: 6px; height: 6px; border-radius: 50%; }
.status-text { font-size: 12px; font-weight: 700; text-transform: uppercase; font-weight: bold; }

/* Tabs */
.tabs { display: flex; gap: 30px; border-bottom: 1px solid var(--Border); margin-bottom: 50px; padding-bottom: 10px; }
.tab { padding-bottom: 10px; cursor: pointer; color: #666; font-size: 0.9rem; transition: color 0.3s; }
.tab.active { color: var(--Primary); border-bottom: 2px solid var(--Primary); }
.tab:hover { color: var(--Primary); }

/* Progress bar shine effect */
.progress-section { margin-bottom: 20px; }
.progress-value { font-size: 11px; color: #555; margin-top: 8px; display: block; }
.progress-bg { background: #1a1a1a; height: 4px; width: 100%; position: relative; overflow: hidden; border-radius: 2px; }

.progress-fill {
  position: relative;
  overflow: hidden;
  height: 100%;
  border-radius: 2px;
}

.progress-fill::after {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  animation: shine 2s infinite;
}

@keyframes shine {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* Footer y botones */
.due-date { color: #666; font-size: 11px; }
.due-date strong { color: #fff; }
.card-footer { border-top: 1px solid var(--Border); padding: 15px; display: flex; justify-content: center; background: var(--Background); }
.open-btn { background: transparent; color: var(--Primary); border: none; font-size: 11px; font-weight: bold; cursor: pointer; letter-spacing: 1.5px; text-transform: uppercase; transition: all 0.3s ease; }
.open-btn:hover { letter-spacing: 2.5px; filter: brightness(1.3); }

.action-btn-gold { background: var(--Primary); color: #000; width: 100%; padding: 12px; font-weight: bold; border: none; margin-bottom: 10px; cursor: pointer; }
.action-btn-outline { background: transparent; color: #fff; width: 100%; padding: 12px; border: 1px solid #1a1a1a; cursor: pointer; }

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

/* Activity */
.activity-item { display: flex; gap: 15px; margin-bottom: 20px; align-items: center; }
.avatar { width: 32px; height: 32px; background: #1a1a1a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; color: var(--Primary); font-weight: bold; }
.act-text p { font-size: 12px; color: #888; margin: 0; }
.act-text strong { color: #fff; }
.act-time { font-size: 10px; color: #444; }
</style>