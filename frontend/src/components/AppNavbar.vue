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
            <path d="M2 4l4 4 4-4" stroke="#555" stroke-width="1.4" stroke-linecap="square"/>
          </svg>
        </div>

        <Teleport to="body">
          <div v-if="dropdownOpen" class="empresa-backdrop" @click="closeDropdown" />
          <div
            v-if="dropdownOpen"
            class="empresa-dropdown"
            :style="dropdownStyle"
          >
            <p class="dd-label">YOUR WORKSPACES</p>
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
              + Create new workspace
            </RouterLink>
          </div>
        </Teleport>
      </div>

      <div class="appnav-links">
        <RouterLink class="appnav-link" to="/dashboard">Dashboard</RouterLink>
        <RouterLink v-if="authStore.canViewInventory" class="appnav-link" to="/inventory">Inventory</RouterLink>
        <RouterLink v-if="authStore.canViewProjects" class="appnav-link" to="/projects">Projects</RouterLink>
        <RouterLink class="appnav-link" to="/finance">Finance</RouterLink>
      </div>

      <div class="appnav-end">
        <div class="appnav-avatar" @click="logout" title="Sign out">{{ userInitial }}</div>
      </div>

    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import logo from '../assets/img/kontrol.png'

const authStore = useAuthStore()
const router    = useRouter()
const route     = useRoute()

const dropdownOpen  = ref(false)
const dropdownStyle = ref({})
const triggerEl     = ref(null)

const userInitial = computed(() => {
  const name = authStore.user?.nombre || authStore.user?.email || 'U'
  return name.charAt(0).toUpperCase()
})

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
  router.push({ name: 'login' })
}

function onKeydown(e) {
  if (e.key === 'Escape') closeDropdown()
}

onMounted(()  => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
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
  padding-right: 24px;
  border-right: 1px solid #1a1a1a;
  margin-right: 12px;
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

/* ── Empresa selector ── */
.empresa-selector {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  padding: 0 16px;
  cursor: pointer;
  border-right: 1px solid #1a1a1a;
  margin-right: 12px;
  position: relative;
}

.empresa-current {
  display: flex;
  align-items: center;
  gap: 8px;
}

.empresa-name {
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #faf8f5;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empresa-role {
  font-size: 10px;
  color: #c9a962;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  background: rgba(201,169,98,0.1);
  padding: 1px 6px;
  border: 1px solid rgba(201,169,98,0.2);
}

.chevron {
  transition: transform 0.2s;
  flex-shrink: 0;
}
.chevron.open {
  transform: rotate(180deg);
}

/* Dropdown (rendered via Teleport to body) */
.empresa-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9998;
}

:global(.empresa-dropdown) {
  background: #0f0f0f;
  border: 1px solid #1f1f1f;
  min-width: 220px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.6);
  display: flex;
  flex-direction: column;
}

:global(.dd-label) {
  font-family: 'Manrope', sans-serif;
  font-size: 10px;
  letter-spacing: 0.1em;
  color: #333;
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
  gap: 12px;
}

:global(.dd-item:hover) {
  background: rgba(255,255,255,0.04);
}

:global(.dd-item.active) {
  background: rgba(201,169,98,0.06);
}

:global(.dd-item-name) {
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  color: #faf8f5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

:global(.dd-item-role) {
  font-size: 10px;
  color: #555;
  flex-shrink: 0;
  text-transform: capitalize;
}

:global(.dd-divider) {
  height: 1px;
  background: #1a1a1a;
  margin: 4px 0;
}

:global(.dd-new) {
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  color: #c9a962;
  padding: 10px 16px;
  text-decoration: none;
  display: block;
  transition: background 0.15s;
}

:global(.dd-new:hover) {
  background: rgba(201,169,98,0.06);
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

/* ── End ── */
.appnav-end {
  margin-left: auto;
  flex-shrink: 0;
  display: flex;
  align-items: center;
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
  transition: border-color 0.15s;
}

.appnav-avatar:hover {
  border-color: #555;
}

/* Tablet */
@media (max-width: 900px) {
  .appnav-inner { padding: 0 20px; }
  .appnav-link  { padding: 0 10px; font-size: 11px; }
  .empresa-name { max-width: 100px; }
}

/* Mobile */
@media (max-width: 640px) {
  .appnav-links    { display: none; }
  .appnav-inner    { padding: 0 16px; }
  .empresa-role    { display: none; }
}
</style>
