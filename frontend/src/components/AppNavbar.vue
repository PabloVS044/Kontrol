<template>
  <header class="appnav">
    <div class="appnav-inner">

      <RouterLink class="appnav-brand" to="/">
        <img :src="logo" alt="Kontrol" />
        <span>Kontrol</span>
      </RouterLink>

      <div class="appnav-links">
        <RouterLink class="appnav-link" to="/dashboard">Dashboard</RouterLink>
        <RouterLink class="appnav-link" to="/inventory">Inventory</RouterLink>
        <RouterLink class="appnav-link" to="/projects">Projects</RouterLink>
        <RouterLink class="appnav-link" to="/finance">Finance</RouterLink>
      </div>

      <div class="appnav-end">
        <div class="appnav-avatar">{{ userInitial }}</div>
      </div>

    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import logo from '../assets/img/kontrol.png'

const authStore = useAuthStore()

const userInitial = computed(() => {
  const name = authStore.user?.nombre || authStore.user?.email || 'U'
  return name.charAt(0).toUpperCase()
})
</script>

<style scoped>
.appnav {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 56px;
  background: rgba(10, 10, 10, 0.95);
  border-bottom: 1px solid #1f1f1f;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 100;
  display: flex;
  align-items: stretch;
}

.appnav-inner {
  width: 100%;
  display: flex;
  align-items: stretch;
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
  align-items: stretch;
  gap: 0;
  flex: 1;
}

.appnav-link {
  position: relative;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: #555;
  text-decoration: none;
  padding: 0 16px;
  display: flex;
  align-items: center;
  transition: color .2s;
  letter-spacing: 0.03em;
}

.appnav-link::after {
  content: '';
  position: absolute;
  bottom: 0; left: 16px; right: 16px;
  height: 2px;
  background: #c9a962;
  transform: scaleX(0);
  transition: transform .2s ease;
}

.appnav-link:hover { color: #faf8f5; }

.appnav-link.router-link-active {
  color: #c9a962;
}

.appnav-link.router-link-active::after {
  transform: scaleX(1);
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

@media (max-width: 640px) {
  .appnav-links { display: none; }
  .appnav-inner { padding: 0 16px; gap: 0; }
}
</style>
