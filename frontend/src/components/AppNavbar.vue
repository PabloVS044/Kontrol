<template>
  <header class="appnav">
    <div class="appnav-inner">

      <RouterLink class="appnav-brand" to="/">
        <img :src="logo" alt="Kontrol" />
        <span>Kontrol</span>
      </RouterLink>

      <nav class="appnav-links">
        <RouterLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          custom
          v-slot="{ href, isActive, navigate }"
        >
          <Anchor
            :label="link.label"
            :link="href"
            :textColor="isActive ? '#0a0a0a' : 'var(--Text)'"
            :backColor="isActive ? '#c9a962' : 'transparent'"
            hoverColor="rgba(201,169,98,0.12)"
            @click.prevent="navigate"
          />
        </RouterLink>
      </nav>

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
import Anchor from './UI/Button/Anchor.vue'

const authStore = useAuthStore()

const userInitial = computed(() => {
  const name = authStore.user?.nombre || authStore.user?.email || 'U'
  return name.charAt(0).toUpperCase()
})

const navLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/inventory',  label: 'Inventory'  },
  { to: '/projects',   label: 'Projects'   },
  { to: '/finance',    label: 'Finance'    },
]
</script>

<style scoped>
.appnav {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 56px;
  background: rgba(10,10,10,0.92);
  border-bottom: 1px solid #1f1f1f;
  backdrop-filter: blur(8px);
  z-index: 100;
  display: flex;
  align-items: center;
}

.appnav-inner {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 0 32px;
  gap: 32px;
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

/* override anchor pill size to fit the navbar height */
.appnav-links :deep(.anchor) {
  padding: 5px 14px;
  border-radius: 50px;
  font-size: 12px;
  font-weight: 500;
  font-family: 'Manrope', sans-serif;
  transition: background-color 0.2s, color 0.2s;
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
  border-radius: 50%;
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
