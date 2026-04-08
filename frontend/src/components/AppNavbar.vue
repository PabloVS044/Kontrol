<template>
  <header class="appnav">
    <div class="appnav-inner">

      <RouterLink class="appnav-brand" to="/">
        <img :src="logo" alt="Kontrol" />
        <span>Kontrol</span>
      </RouterLink>

      <nav class="appnav-links">
        <RouterLink class="appnav-link" to="/dashboard">Dashboard</RouterLink>
        <RouterLink class="appnav-link" to="/inventory">Inventory</RouterLink>
        <RouterLink class="appnav-link" to="/projects">Projects</RouterLink>
        <RouterLink class="appnav-link" to="/finance">Finance</RouterLink>
      </nav>

      <div class="appnav-end">
        <div class="appnav-avatar">U</div>
      </div>

    </div>
  </header>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import logo from '../assets/img/kontrol.png'
</script>

<style scoped>
.appnav {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 56px;
  background: #0a0a0a;
  border-bottom: 1px solid #1f1f1f;
  z-index: 100;
  display: flex;
  align-items: center;
}

.appnav-inner {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 0 32px;
  gap: 40px;
}

.appnav-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  flex-shrink: 0;
}

.appnav-brand img {
  width: 28px;
  height: 28px;
}

.appnav-brand span {
  font-family: 'Bungee', 'Manrope', sans-serif;
  font-size: 14px;
  letter-spacing: 1px;
  color: #faf8f5;
}

.appnav-links {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.appnav-link {
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: #666;
  text-decoration: none;
  padding: 6px 12px;
  border: 1px solid transparent;
  transition: color .15s, border-color .15s;
}

.appnav-link:hover { color: #faf8f5; }

.appnav-link.router-link-active {
  color: #c9a962;
  border-color: #1f1f1f;
}

.appnav-end {
  margin-left: auto;
  flex-shrink: 0;
}

.appnav-avatar {
  width: 32px;
  height: 32px;
  background: #1f1f1f;
  border: 1px solid #2e2e2e;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #c9a962;
  cursor: pointer;
}

/* responsive: ocultar links en mobile */
@media (max-width: 640px) {
  .appnav-links { display: none; }
  .appnav-inner { padding: 0 16px; gap: 0; }
}
</style>
