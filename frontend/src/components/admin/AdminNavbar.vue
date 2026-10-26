<template>
  <header class="appnav">
    <div class="appnav-inner">

      <RouterLink class="appnav-brand" to="/">
        <img :src="logo" alt="Kontrol" />
        <span>Kontrol</span>
      </RouterLink>

      <div class="admin-badge-wrap">
        <span class="admin-badge">{{ $t('navbar.admin.superUser') }}</span>
      </div>

      <div class="appnav-links" :class="{ 'is-open': isMenuOpen }">
        <RouterLink class="appnav-link" :to="{ name: 'admin-dashboard' }" @click="closeMenu">{{ $t('navbar.admin.overview') }}</RouterLink>
        <RouterLink class="appnav-link" :to="{ name: 'admin-companies' }" @click="closeMenu">{{ $t('navbar.admin.companies') }}</RouterLink>
        <RouterLink class="appnav-link" :to="{ name: 'admin-users' }"     @click="closeMenu">{{ $t('navbar.admin.users') }}</RouterLink>
      </div>

      <div class="appnav-end">
        <LanguageSelector />
        <div class="appnav-avatar" @click="logout" :title="$t('navbar.account.signOut')">{{ userInitial }}</div>
        <button class="hamburger" @click="toggleMenu" :aria-label="$t('navbar.menu.open')">
          <span :class="{ line: true, 'line-top': isMenuOpen }"></span>
          <span :class="{ line: true, 'line-middle': isMenuOpen }"></span>
          <span :class="{ line: true, 'line-bottom': isMenuOpen }"></span>
        </button>
      </div>

    </div>
  </header>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import LanguageSelector from '@/components/common/LanguageSelector.vue'
import logo from '@/assets/img/kontrol.png'

const authStore  = useAuthStore()
const router     = useRouter()
const isMenuOpen  = ref(false)

const userInitial = computed(() => {
  const name = authStore.user?.nombre || authStore.user?.email || 'U'
  return name.charAt(0).toUpperCase()
})

// El idioma sobrevive al cierre de sesión: es del navegador, no de la cuenta.
function logout() {
  authStore.logout()
  router.push({ name: 'login' })
}
function toggleMenu()  { isMenuOpen.value = !isMenuOpen.value }
function closeMenu()   { isMenuOpen.value = false }
</script>

<style scoped>
.appnav {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 56px;
  background: var(--k-shade-1);
  border-bottom: 1px solid var(--k-shade-6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: var(--k-z-nav);
  display: flex;
  align-items: stretch;
}

.appnav-inner {
  width: 100%;
  display: flex;
  align-items: stretch;
  padding: 0 32px;
  gap: 0;
}

.appnav-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  flex-shrink: 0;
  padding-right: 16px;
}

.appnav-brand img { width: 28px; height: 28px; }

.appnav-brand span {
  font-family: 'Bungee', 'Manrope', sans-serif;
  font-size: 14px;
  letter-spacing: 1px;
  color: var(--k-color-text);
}

.admin-badge-wrap {
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-right: 1px solid var(--k-shade-4);
  margin-right: 12px;
}

.admin-badge {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--k-color-primary);
  background: rgba(var(--k-color-primary-rgb), 0.1);
  padding: 2px 7px;
  border: 1px solid rgba(var(--k-color-primary-rgb), 0.2);
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
  color: var(--k-text-faint);
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
  background: var(--k-color-primary);
  transform: scaleX(0);
  transition: transform .2s ease;
}

.appnav-link:hover { color: var(--k-color-text); }

.appnav-link.router-link-exact-active { color: var(--k-color-primary); }
.appnav-link.router-link-exact-active::after { transform: scaleX(1); }

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
  background: var(--k-shade-6);
  border: 1px solid var(--k-shade-7);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--k-color-primary);
  cursor: pointer;
  transition: border-color 0.15s;
}

.appnav-avatar:hover { border-color: var(--k-shade-8); }

.hamburger {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 20px;
  position: relative;
  z-index: var(--k-z-top);
}

.hamburger .line {
  display: block;
  width: 100%;
  height: 2px;
  background-color: var(--k-color-text);
  position: absolute;
  left: 0;
  transition: all 0.3s ease;
}

.hamburger .line:nth-child(1) { top: 0; }
.hamburger .line:nth-child(2) { top: 9px; }
.hamburger .line:nth-child(3) { top: 18px; }

.hamburger .line.line-top    { transform: translateY(9px) rotate(45deg); }
.hamburger .line.line-middle { opacity: 0; }
.hamburger .line.line-bottom { transform: translateY(-9px) rotate(-45deg); }

@media (max-width: 900px) {
  .appnav-inner { padding: 0 20px; }
  .appnav-link  { padding: 0 10px; font-size: 11px; }
}

@media (max-width: 640px) {
  .hamburger { display: block; }
  .appnav-inner { padding: 0 16px; }

  .appnav-links {
    position: fixed;
    top: 56px;
    left: 0; right: 0;
    background: var(--k-shade-1);
    border-bottom: 1px solid var(--k-shade-6);
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
