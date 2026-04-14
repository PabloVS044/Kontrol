<template>
  <header class="appnav">
    <div class="appnav-inner">

      <RouterLink class="appnav-brand" to="/">
        <img :src="logo" alt="Kontrol" />
        <span>Kontrol</span>
      </RouterLink>

      <div class="appnav-links" :class="{ 'is-open': isMenuOpen }">
        <RouterLink class="appnav-link" to="/dashboard" @click="closeMenu">Dashboard</RouterLink>
        <RouterLink class="appnav-link" to="/inventory" @click="closeMenu">Inventory</RouterLink>
        <RouterLink class="appnav-link" to="/projects" @click="closeMenu">Projects</RouterLink>
        <RouterLink class="appnav-link" to="/reports" @click="closeMenu">Reports</RouterLink>
        <RouterLink class="appnav-link" to="/finance" @click="closeMenu">Finance</RouterLink>
      </div>

      <div class="appnav-end">
        <div class="appnav-avatar">{{ userInitial }}</div>
        
        <button class="hamburger" @click="toggleMenu" aria-label="Menu">
          <span :class="{'line': true, 'line-top': isMenuOpen}"></span>
          <span :class="{'line': true, 'line-middle': isMenuOpen}"></span>
          <span :class="{'line': true, 'line-bottom': isMenuOpen}"></span>
        </button>
      </div>

    </div>
  </header>
</template>

<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import logo from '../assets/img/kontrol.png'

const authStore = useAuthStore()
const isMenuOpen = ref(false)

const userInitial = computed(() => {
  const name = authStore.user?.nombre || authStore.user?.email || 'U'
  return name.charAt(0).toUpperCase()
})

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = () => {
  isMenuOpen.value = false
}
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
  display: flex;
  align-items: center;
  gap: 16px;
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

.hamburger {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 20px;
  position: relative;
  z-index: 101;
}

.hamburger .line {
  display: block;
  width: 100%;
  height: 2px;
  background-color: #faf8f5;
  position: absolute;
  left: 0;
  transition: all 0.3s ease;
}

.hamburger .line:nth-child(1) { top: 0; }
.hamburger .line:nth-child(2) { top: 9px; }
.hamburger .line:nth-child(3) { top: 18px; }

.hamburger .line.line-top {
  transform: translateY(9px) rotate(45deg);
}
.hamburger .line.line-middle {
  opacity: 0;
}
.hamburger .line.line-bottom {
  transform: translateY(-9px) rotate(-45deg);
}

/* Tablet: reducir gap y padding */
@media (max-width: 900px) {
  .appnav-inner { padding: 0 20px; gap: 20px; }
  .appnav-link  { padding: 0 10px; font-size: 11px; }
}

/* Mobile: mostrar menu hamburguesa y ocultar/mostrar links según estado */
@media (max-width: 640px) {
  .hamburger {
    display: block;
  }

  .appnav-inner { padding: 0 16px; gap: 0; }

  .appnav-links { 
    position: fixed;
    top: 56px;
    left: 0;
    right: 0;
    background: rgba(10, 10, 10, 0.98);
    border-bottom: 1px solid #1f1f1f;
    flex-direction: column;
    padding: 20px 0;
    gap: 16px;
    align-items: center;
    clip-path: polygon(0 0, 100% 0, 100% 0, 0 0);
    transition: clip-path 0.3s ease-in-out;
    pointer-events: none;
  }

  .appnav-links.is-open {
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
    pointer-events: auto;
  }

  .appnav-link {
    font-size: 16px;
    padding: 10px 20px;
    width: 100%;
    justify-content: center;
  }
}
</style>
