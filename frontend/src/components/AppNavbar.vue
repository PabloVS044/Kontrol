<template>
  <header class="appnav">
    <div class="appnav-inner">

      <RouterLink class="appnav-brand" to="/">
        <img :src="logo" alt="Kontrol" />
        <span>Kontrol</span>
      </RouterLink>

      <!-- Empresa selector -->
      <div v-if="authStore.hasEmpresa" class="empresa-selector" @click.stop="toggleDropdown">
        <div class="empresa-current">
          <span class="empresa-name">{{ authStore.empresaActual?.nombre ?? '—' }}</span>
          <span class="empresa-role">{{ authStore.empresaActual?.rol ?? '' }}</span>
          <svg class="chevron" :class="{ open: dropdownOpen }" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 4l4 4 4-4" stroke="var(--k-gray-3)" stroke-width="1.4" stroke-linecap="square"/>
          </svg>
        </div>

        <Teleport to="body">
          <div v-if="dropdownOpen" class="empresa-backdrop" @click="closeDropdown" />
          <div
            v-if="dropdownOpen"
            class="empresa-dropdown"
            :style="dropdownStyle"
          >
            <p class="dd-label">{{ $t('navbar.yourWorkspaces') }}</p>
            <button
              v-for="empresa in authStore.empresas"
              :key="empresa.id_empresa"
              class="dd-item"
              :class="{ active: empresa.id_empresa === authStore.idEmpresaActual }"
              @click="selectEmpresa(empresa)"
            >
              <span class="dd-item-name">{{ empresa.nombre }}</span>
              <span class="dd-item-role">{{ empresa.rol }}</span>
            </button>
            <div class="dd-divider" />
            <RouterLink class="dd-new" to="/onboarding" @click="closeDropdown">
              {{ $t('navbar.createWorkspace') }}
            </RouterLink>
          </div>
        </Teleport>
      </div>

      <!-- Un toque fuera cierra el cajón. Sin esto había que volver al hamburguesa
           con el menú tapando media pantalla. -->
      <div v-if="isMenuOpen" class="appnav-backdrop" @click="closeMenu" />

      <div id="appnav-links" class="appnav-links" :class="{ 'is-open': isMenuOpen }">
        <RouterLink class="appnav-link" to="/dashboard" @click="closeMenu">{{ $t('navbar.dashboard') }}</RouterLink>
        <RouterLink v-if="authStore.canViewInventory" class="appnav-link" to="/inventory" @click="closeMenu">{{ $t('navbar.inventory') }}</RouterLink>
        <RouterLink v-if="authStore.canViewInventory" class="appnav-link" to="/suppliers" @click="closeMenu">Suppliers</RouterLink>
        <RouterLink v-if="authStore.canViewProjects" class="appnav-link" to="/projects" @click="closeMenu">{{ $t('navbar.projects') }}</RouterLink>
        <RouterLink v-if="authStore.canManageTeams" class="appnav-link" to="/teams" @click="closeMenu">{{ $t('navbar.teams') }}</RouterLink>
        <RouterLink class="appnav-link" to="/budget" @click="closeMenu">{{ $t('navbar.budget') }}</RouterLink>
        <RouterLink class="appnav-link" to="/reports" @click="closeMenu">{{ $t('navbar.reports') }}</RouterLink>
        <RouterLink class="appnav-link" to="/chat" @click="closeMenu">{{ $t('navbar.chat') }}</RouterLink>
        <RouterLink class="appnav-link" to="/marketing" @click="closeMenu">{{ $t('navbar.marketing') }}</RouterLink>
        <RouterLink class="appnav-link appnav-link--agent" to="/agent" @click="closeMenu">{{ $t('navbar.ai') }}</RouterLink>
        <RouterLink
          v-if="isAdminOrOwner"
          class="appnav-link"
          to="/integrations"
          @click="closeMenu"
        >{{ $t('navbar.integrations') }}</RouterLink>
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
        <!-- El avatar abre un menú en vez de cerrar sesión de golpe: una inicial
             suelta se lee como "ver mi perfil", y el clic destruía la sesión sin
             decir que eso iba a pasar. Aquí el cierre de sesión está escrito. -->
        <div ref="userMenuRef" class="user-menu">
          <button
            class="appnav-avatar"
            :class="{ active: isUserMenuOpen }"
            :aria-label="$t('navbar.account.open')"
            :aria-expanded="isUserMenuOpen"
            aria-haspopup="menu"
            @click.stop="isUserMenuOpen = !isUserMenuOpen"
          >{{ userInitial }}</button>

          <div v-if="isUserMenuOpen" class="user-dropdown" role="menu">
            <div class="ud-identity">
              <span class="ud-name">{{ userDisplayName }}</span>
              <span v-if="authStore.user?.email" class="ud-email">{{ authStore.user.email }}</span>
            </div>

            <div class="ud-divider" />

            <!-- Visible para todos: la pantalla tiene preferencias personales
                 —ocultar el asistente— además de la configuración de empresa,
                 que sí queda reservada al dueño dentro de la propia vista. -->
            <RouterLink
              class="ud-item"
              role="menuitem"
              to="/settings"
              @click="closeUserMenu"
            >
              <Settings :size="15" />
              <span>{{ $t('navbar.account.settings') }}</span>
            </RouterLink>

            <button class="ud-item ud-item--signout" role="menuitem" @click="logout">
              <LogOut :size="15" />
              <span>{{ $t('navbar.account.signOut') }}</span>
            </button>
          </div>
        </div>

        <button
          class="hamburger"
          :aria-label="isMenuOpen ? $t('navbar.menu.close') : $t('navbar.menu.open')"
          :aria-expanded="isMenuOpen"
          aria-controls="appnav-links"
          @click.stop="toggleMenu"
        >
          <span :class="{'line': true, 'line-top': isMenuOpen}"></span>
          <span :class="{'line': true, 'line-middle': isMenuOpen}"></span>
          <span :class="{'line': true, 'line-bottom': isMenuOpen}"></span>
        </button>
      </div>

    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Languages, LogOut, Settings } from 'lucide-vue-next'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import logo from '../assets/img/kontrol.png'

const authStore = useAuthStore()
const router    = useRouter()
const route     = useRoute()
const { locale, t } = useI18n()

const dropdownOpen  = ref(false)
const dropdownStyle = ref({})
const triggerEl     = ref(null)
const isMenuOpen  = ref(false)
const isLangOpen  = ref(false)
const langBtnRef  = ref(null)
const isUserMenuOpen = ref(false)
const userMenuRef    = ref(null)

const isAdminOrOwner = computed(() => {
  const rol = authStore.empresaActual?.rol
  return rol === 'owner' || rol === 'admin'
})

const userInitial = computed(() => {
  const name = authStore.user?.nombre || authStore.user?.email || 'U'
  return name.charAt(0).toUpperCase()
})

/** Nombre para el menú de cuenta; el email queda como respaldo. */
const userDisplayName = computed(() => {
  const u = authStore.user
  const full = [u?.nombre, u?.apellido].filter(Boolean).join(' ').trim()
  return full || u?.email || 'Kontrol'
})

function closeUserMenu() {
  isUserMenuOpen.value = false
}

function toggleDropdown(e) {
  if (!dropdownOpen.value) {
    const rect = e.currentTarget.getBoundingClientRect()
    dropdownStyle.value = {
      position: 'fixed',
      top:  rect.bottom + 8 + 'px',
      left: rect.left + 'px',
      zIndex: 9999,
    }
  }
  dropdownOpen.value = !dropdownOpen.value
}

function closeDropdown() {
  dropdownOpen.value = false
}

async function selectEmpresa(empresa) {
  authStore.setEmpresaActual(empresa)
  await authStore.loadAccessContext()
  closeDropdown()

  if (route.name === 'inventory' && !authStore.canViewInventory) {
    router.push({ name: 'dashboard' })
    return
  }

  if (route.name === 'projects' && !authStore.canViewProjects) {
    router.push({ name: 'dashboard' })
  }
}

function logout() {
  authStore.logout()
  locale.value = 'en'
  router.push({ name: 'login' })
}

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
  if (userMenuRef.value && !userMenuRef.value.contains(e.target)) {
    isUserMenuOpen.value = false
  }
}

// Escape cierra lo que esté abierto: con el cajón de navegación ocupando la
// pantalla, no tener salida por teclado deja atrapado a quien no usa ratón.
function onKeydown(e) {
  if (e.key !== 'Escape') return
  closeDropdown()
  closeUserMenu()
  closeMenu()
  isLangOpen.value = false
}

// Navegar cierra el cajón. Los links ya llaman a closeMenu, pero un cambio de
// ruta por el botón atrás del navegador lo dejaba abierto sobre la vista nueva.
watch(() => route.fullPath, () => {
  closeMenu()
  closeUserMenu()
})

onMounted(() => {
  const saved = localStorage.getItem(localeKey())
  if (saved) locale.value = saved
  window.addEventListener('keydown', onKeydown)
  document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  document.removeEventListener('click', handleClickOutside)
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
  background: #0b0b0b;
  border-bottom: var(--k-border-width) solid var(--k-shade-6);
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
  padding: 0 var(--k-space-6);
  gap: 0;
}

.appnav-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  flex-shrink: 0;
  padding-right: var(--k-space-5);
  border-right: var(--k-border-width) solid var(--k-shade-4);
  margin-right: var(--k-space-3);
}

.appnav-brand img {
  width: 28px;
  height: 28px;
}

.appnav-brand span {
  font-family: 'Bungee', var(--k-font-sans);
  font-size: var(--k-font-size-body-main);
  letter-spacing: 1px;
  color: var(--Text);
}

/* ── Empresa selector ── */
.empresa-selector {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  padding: 0 var(--k-space-4);
  cursor: pointer;
  border-right: var(--k-border-width) solid var(--k-shade-4);
  margin-right: var(--k-space-3);
  position: relative;
}

.empresa-current {
  display: flex;
  align-items: center;
  gap: var(--k-space-2);
}

.empresa-name {
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  font-weight: 600;
  color: var(--Text);
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empresa-role {
  font-size: 10px;
  color: var(--Primary);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  background: #1e170d;
  padding: 1px 6px;
  border: var(--k-border-width) solid #3d3322;
}

.chevron {
  transition: transform 0.2s;
  flex-shrink: 0;
}
.chevron.open {
  transform: rotate(180deg);
}

/* Dropdown  */
.empresa-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9998;
}

:global(.empresa-dropdown) {
  background: var(--k-shade-2);
  border: var(--k-border-width) solid var(--k-shade-6);
  min-width: 220px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.6);
  display: flex;
  flex-direction: column;
}

:global(.dd-label) {
  font-family: var(--k-font-sans);
  font-size: 10px;
  letter-spacing: 0.1em;
  /* Estaba en var(--k-gray-1) sobre fondo var(--k-shade-2): ratio ~1.2:1, ilegible. Es el único
     cambio del PR #86 que se conserva aquí — es contraste, no estética. */
  color: var(--TextMuted);
  padding: 12px 16px 6px;
}

:global(.dd-item) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: none;
  border: none;
  padding: 10px 16px;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
  gap: var(--k-space-3);
}

:global(.dd-item:hover) {
  background: var(--k-shade-3);
}

:global(.dd-item.active) {
  background: #1a150f;
}

:global(.dd-item-name) {
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-small);
  color: var(--Text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

:global(.dd-item-role) {
  font-size: 10px;
  color: var(--k-gray-3);
  flex-shrink: 0;
  text-transform: capitalize;
}

:global(.dd-divider) {
  height: 1px;
  background: var(--k-shade-4);
  margin: 4px 0;
}

:global(.dd-new) {
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  color: var(--Primary);
  padding: 10px 16px;
  text-decoration: none;
  display: block;
  transition: background 0.15s;
}

:global(.dd-new:hover) {
  background: #1a150f;
}

/* ── Nav links ── */
.appnav-links {
  display: flex;
  align-items: stretch;
  gap: 0;
  flex: 1;
}

.appnav-link {
  position: relative;
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  font-weight: 500;
  color: var(--k-gray-3);
  text-decoration: none;
  padding: 0 var(--k-space-4);
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
  background: var(--Primary);
  transform: scaleX(0);
  transition: transform .2s ease;
}

.appnav-link:hover { color: var(--Text); }

.appnav-link.router-link-active {
  color: var(--Primary);
}

.appnav-link.router-link-active::after {
  transform: scaleX(1);
}

/* --Secondary (#886911) daba 3.82:1 sobre la barra: no llega a AA. Se usa el
   dorado de marca; la ruta activa sigue marcada por el subrayado. */
.appnav-link--agent {
  color: var(--Primary);
}

.appnav-link--agent:hover {
  color: var(--Text);
}

/* ── End ── */
.appnav-end {
  margin-left: auto;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: var(--k-space-4);
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
  color: var(--k-gray-2);
  transition: color 0.15s;
  border-radius: var(--k-radius-sm);
}

.lang-btn:hover,
.lang-btn.active { color: var(--Primary); }

.lang-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  background: var(--k-shade-2);
  border: var(--k-border-width) solid var(--k-shade-6);
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
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-gray-3);
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}

.lang-opt:hover { color: var(--Text); background: rgba(255,255,255,0.04); }
.lang-opt.selected { color: var(--Primary); }

/* ── Menú de cuenta ── */
.user-menu { position: relative; }

.appnav-avatar {
  width: 32px;
  height: 32px;
  background: var(--k-shade-6);
  border: var(--k-border-width) solid var(--k-shade-7);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  font-weight: 600;
  color: var(--k-color-primary);
  cursor: pointer;
  padding: 0;
  transition: border-color 0.15s;
}

.appnav-avatar:hover,
.appnav-avatar.active {
  border-color: var(--k-color-primary);
}

.user-dropdown {
  position: absolute;
  top: calc(100% + var(--k-space-2));
  right: 0;
  min-width: 220px;
  z-index: 200;
  background: var(--k-shade-2);
  border: var(--k-border-width) solid var(--k-shade-6);
  padding: var(--k-space-2) 0;
  display: flex;
  flex-direction: column;
}

.ud-identity {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--k-space-2) var(--k-space-4) var(--k-space-3);
}
.ud-name {
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-color-text);
  overflow-wrap: anywhere;
}
.ud-email {
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption);
  color: var(--k-text-muted);
  overflow-wrap: anywhere;
}

.ud-divider {
  height: var(--k-border-width);
  background: var(--k-shade-6);
  margin: 0 0 var(--k-space-2);
}

.ud-item {
  display: flex;
  align-items: center;
  gap: var(--k-space-3);
  width: 100%;
  min-height: var(--k-target-min-size);
  padding: 0 var(--k-space-4);
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  text-decoration: none;
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-text-soft);
  transition: var(--k-transition-ui);
}
.ud-item:hover {
  background: var(--k-shade-4);
  color: var(--k-color-text);
}
/* Cerrar sesión se distingue del resto: es la acción destructiva del menú. */
.ud-item--signout { color: var(--k-state-error-text); }
.ud-item--signout:hover {
  background: var(--k-shade-4);
  color: var(--k-state-error-text);
}

/* Tablet */
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
  background-color: var(--Text);
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

/* Cierra el cajón al tocar fuera. Bajo la barra para no taparla. */
.appnav-backdrop {
  position: fixed;
  top: 56px;
  left: 0; right: 0; bottom: 0;
  z-index: 98;
  background: rgba(var(--k-color-black-rgb), 0.5);
}

/* Compactar antes de plegar: gana sitio y retrasa el cajón. */
@media (max-width: 1400px) {
  .appnav-inner { padding: 0 var(--k-space-5); }
  .appnav-link  { padding: 0 10px; font-size: var(--k-font-size-caption); }
  .empresa-name { max-width: 100px; }
}

/*
 * Cajón de navegación.
 *
 * El umbral estaba en 640px, pero la fila de enlaces necesita ~1300px para
 * caber: entre 641px y ahí, `.appnav-links` seguía en fila sin `flex-wrap` ni
 * desbordamiento visible, así que los últimos enlaces —marketing, IA,
 * integraciones— quedaban cortados fuera del ancho y no había hamburguesa para
 * alcanzarlos. En una tablet o un portátil estrecho simplemente no existían.
 *
 * Ahora se plega en cuanto la fila deja de caber, que es el único momento en el
 * que el cajón hace falta.
 */
@media (max-width: 1300px) {
  .hamburger { display: block; }

  .appnav-inner { padding: 0 var(--k-space-4); gap: 0; }

  .appnav-links {
    position: fixed;
    top: 56px;
    left: 0;
    right: 0;
    z-index: 99;
    background: var(--k-shade-1);
    border-bottom: var(--k-border-width) solid var(--k-shade-6);
    flex-direction: column;
    padding: var(--k-space-3) 0;
    gap: 0;
    align-items: stretch;
    /* Once enlaces no caben en un móvil apaisado: el cajón se desplaza en vez
       de dejar los últimos fuera de la pantalla, que es el fallo que se
       arrastraba en la fila. */
    max-height: calc(100vh - 56px);
    overflow-y: auto;
    overscroll-behavior: contain;
    clip-path: polygon(0 0, 100% 0, 100% 0, 0 0);
    transition: clip-path 0.3s ease-in-out;
    pointer-events: none;
  }

  .appnav-links.is-open {
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
    pointer-events: auto;
  }

  .appnav-link {
    font-size: var(--k-font-size-body-main);
    padding: 0 var(--k-space-5);
    min-height: var(--k-target-min-size);
    width: 100%;
    justify-content: flex-start;
  }

  /* En fila el subrayado marca la activa; apilado se lee mejor como barra
     lateral, y el subrayado a 16px del borde quedaba flotando. El eje de la
     escala cambia con la orientación: scaleX no abre una barra vertical. */
  .appnav-link::after {
    left: 0;
    right: auto;
    top: 0;
    bottom: 0;
    width: 2px;
    height: auto;
    transform: scaleY(0);
  }

  .appnav-link.router-link-active::after {
    transform: scaleY(1);
  }
}

@media (max-width: 640px) {
  .empresa-role { display: none; }
  .appnav-link { font-size: var(--k-font-size-body-large); }
}
</style>
