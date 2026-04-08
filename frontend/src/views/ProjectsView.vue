<script setup>
import AppNavbar from '../components/AppNavbar.vue'
import Anchor from '../components/UI/Button/Anchor.vue'
</script>

<template>
  <div class="projects-layout">
    <AppNavbar />

    <main class="content">
      <header class="header">
        <div class="header-left">
          <h1 class="title">My Projects</h1>
          <p class="subtitle">Ana's Library Management</p>
        </div>
        <div class="header-actions">
          <Anchor href="#" class="btn-primary">
            <span>+ NEW PROJECT</span>
          </Anchor>
        </div>
      </header>

      <section class="project-grid">
        <!-- Tarjeta de Ejemplo: Restock Matemáticas -->
        <div class="project-card">
          <div class="card-accent"></div>
          <div class="card-header">
            <span class="card-name">Restock Math 2026</span>
            <span class="role-badge role-admin">Admin</span>
          </div>
          <div class="card-body">
            <p class="card-desc">Annual textbook purchase for the season.</p>
            <div class="progress-row">
              <div class="progress-bg">
                <div class="progress-fill" style="width: 62%"></div>
              </div>
              <span class="progress-value">62%</span>
            </div>
            <div class="card-bottom">
              <span class="status-active">● On Track</span>
              <span class="due-date">Due Jan 28</span>
            </div>
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
  width: 100%;
}

.content {
  flex: 1;
  padding: 48px 56px;
}

.title {
  font-family: 'Playfair Display', serif;
  font-size: 48px;
  color: var(--Text);
}

.subtitle {
  color: #888;
  font-size: 14px;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
  margin-top: 32px;
}

.project-card {
  background-color: var(--Background2);
  border: 1px solid var(--Border);
  display: flex;
  flex-direction: column;
}

.card-accent {
  height: 3px;
  background-color: var(--Primary);
}

.card-header {
  padding: 20px;
  display: flex;
  justify-content: space-between;
}

.card-name {
  font-size: 18px;
  font-weight: bold;
}

.role-badge {
  font-size: 10px;
  background: rgba(202, 168, 96, 0.1);
  color: var(--Primary);
  padding: 4px 8px;
  border: 1px solid rgba(202, 168, 96, 0.2);
}

.card-body {
  padding: 0 20px 20px;
}

.progress-bg {
  background: #1f1f1f;
  height: 4px;
  width: 100%;
  margin: 10px 0;
}

.progress-fill {
  background-color: var(--Primary);
  height: 100%;
}

.status-active {
  color: var(--Success);
  font-size: 12px;
  font-weight: bold;
}
</style>