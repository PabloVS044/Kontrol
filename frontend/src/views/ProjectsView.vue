<template>
  <main class="main-panel">
    <header class="header">
      <div class="header-left">
        <h1 class="page-title">My Projects</h1>
        <p class="page-subtitle">Ana's Library Management</p>
      </div>
      <div class="header-actions">
        <button class="btn-primary">
          <span>New project</span>
        </button>
      </div>
    </header>

    <section class="project-grid">
      <!-- Tarjeta de ejemplo -->
      <div class="project-card">
        <div class="card-header">
          <span class="card-name">Restock Math 2026</span>
          <span class="role-badge role-admin">Admin</span>
        </div>
        <div class="card-body">
          <p class="card-desc">Annual textbook purchase for the season.</p>
          <div class="progress-row">
            <div class="progress-bg"><div class="progress-fill" style="width:62%"></div></div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import AppNavbar from '../components/AppNavbar.vue'
import Anchor from '../components/UI/Button/Anchor.vue'
</script>

<template>
  <div class="projects-layout">
    <AppNavbar />

    <main class="content">
      <header class="header">
        <div>
          <h1 class="title">My Projects</h1>
          <p>Librería Ana González</p>
        </div>
        
        <Anchor href="#" class="new-project-btn">
          + NEW PROJECT
        </Anchor>
      </header>

      <section class="grid">
        <div class="project-card">
          <div class="card-accent"></div>
          <div class="card-info">
             <h3>Restock Mathematics</h3>
             <span class="status-active">On Track</span>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.projects-layout {
  display: flex;
  background-color: var(--Background);
  min-height: 100vh;
}

.content {
  flex: 1;
  padding: 40px;
}

.title {
  font-family: "Alfa Slab One";
  color: var(--Primary);
  font-size: 2.5em;
}

.project-card {
  background-color: var(--Background2); 
  border: 1px solid var(--Border);
  border-radius: 8px;
  overflow: hidden;
}

.card-accent {
  height: 4px;
  background-color: var(--Primary);
}

.status-active {
  color: var(--Success);
  font-weight: bold;
}
</style>