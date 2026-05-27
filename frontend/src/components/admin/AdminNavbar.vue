<template>
  <header class="appnav">
    <div class="appnav-inner">

      <RouterLink class="appnav-brand" to="/">
        <img :src="logo" alt="Kontrol" />
        <span>Kontrol</span>
      </RouterLink>

      <div class="admin-badge-wrap">
        <span class="admin-badge">Super User</span>
      </div>

      <div class="appnav-links" :class="{ 'is-open': isMenuOpen }">
        <RouterLink class="appnav-link" :to="{ name: 'admin-dashboard' }" @click="closeMenu">{{ $t('navbar.admin.overview') }}</RouterLink>
        <RouterLink class="appnav-link" :to="{ name: 'admin-companies' }" @click="closeMenu">{{ $t('navbar.admin.companies') }}</RouterLink>
        <RouterLink class="appnav-link" :to="{ name: 'admin-users' }"     @click="closeMenu">{{ $t('navbar.admin.users') }}</RouterLink>
      </div>

      <div class="appnav-end">
        <div ref="langBtnRef" class="lang-picker">
          <button class="lang-btn" @click.stop="isLangOpen = !isLangOpen" :class="{ active: isLangOpen }">
            <Languages :size="16" />
          </button>
          <div v-if="isLangOpen" class="lang-dropdown">
            <button class="lang-opt" :class="{ selected: locale === 'en' }" @click="setLocale('en')">English</button>
            <button class="lang-opt" :class="{ selected: locale === 'es' }" @click="setLocale('es')">Español</button>
          </div>
        </div>
        <div class="appnav-avatar" @click="logout" title="Sign out">{{ userInitial }}</div>
        <button class="hamburger" @click="toggleMenu" aria-label="Menu">
          <span :class="{ line: true, 'line-top': isMenuOpen }"></span>
          <span :class="{ line: true, 'line-middle': isMenuOpen }"></span>
          <span :class="{ line: true, 'line-bottom': isMenuOpen }"></span>
        </button>
      </div>

    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Languages } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import logo from '@/assets/img/kontrol.png'

const authStore  = useAuthStore()
const router     = useRouter()
const { locale } = useI18n()
const isMenuOpen  = ref(false)
const isLangOpen  = ref(false)
const langBtnRef  = ref(null)

const userInitial = computed(() => {
  const name = authStore.user?.nombre || authStore.user?.email || 'U'
  return name.charAt(0).toUpperCase()
})

function localeKey() { return `locale_${authStore.idUsuario}` }

function setLocale(lang) {
  locale.value = lang
  localStorage.setItem(localeKey(), lang)
  isLangOpen.value = false
}

function handleClickOutside(e) {
  if (langBtnRef.value && !langBtnRef.value.contains(e.target)) {
    isLangOpen.value = false
  }
}

onMounted(() => {
  const saved = localStorage.getItem(localeKey())
  if (saved) locale.value = saved
  document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => document.removeEventListener('click', handleClickOutside))

function logout() {
  authStore.logout()
  locale.value = 'en'
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
  color: #faf8f5;
}

.admin-badge-wrap {
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-right: 1px solid #1a1a1a;
  margin-right: 12px;
}

.admin-badge {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #c9a962;
  background: rgba(201,169,98,0.1);
  padding: 2px 7px;
  border: 1px solid rgba(201,169,98,0.2);
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

.appnav-link.router-link-exact-active { color: #c9a962; }
.appnav-link.router-link-exact-active::after { transform: scaleX(1); }

.appnav-end {
  margin-left: auto;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 16px;
}

.lang-picker {
  position: relative;
  display: flex;
  align-items: center;
}

.lang-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  padding: 6px;
  cursor: pointer;
  color: #444;
  transition: color 0.15s;
  border-radius: 4px;
}

.lang-btn:hover,
.lang-btn.active { color: #c9a962; }

.lang-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  background: #0f0f0f;
  border: 1px solid #1f1f1f;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 110px;
  z-index: 200;
}

.lang-opt {
  background: transparent;
  border: none;
  text-align: left;
  padding: 7px 10px;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  color: #555;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}

.lang-opt:hover { color: #faf8f5; background: rgba(255,255,255,0.04); }
.lang-opt.selected { color: #c9a962; }

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
  transition: border-color 0.15s;
}

.appnav-avatar:hover { border-color: #555; }

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
