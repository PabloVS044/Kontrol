<template>
  <div class="sales-root">
    <AppNavbar />
    <main class="sales-content">
      <header class="page-header">
        <p class="eyebrow">{{ $t('sales.eyebrow') }}</p>
        <h1>{{ $t('sales.title') }}</h1>
        <p class="subtitle">{{ $t('sales.subtitle') }}</p>
      </header>

      <!-- Solo navegación: cada tarjeta lleva a donde ya vive esa función. -->
      <nav class="sales-grid" :aria-label="$t('sales.title')">
        <RouterLink v-if="authStore.canViewInventory" class="sales-card" to="/inventory">
          <span class="sc-title">{{ $t('sales.checkout.title') }}</span>
          <span class="sc-copy">{{ $t('sales.checkout.copy') }}</span>
        </RouterLink>

        <RouterLink class="sales-card" :to="{ path: '/reports', hash: '#sales' }">
          <span class="sc-title">{{ $t('sales.history.title') }}</span>
          <span class="sc-copy">{{ $t('sales.history.copy') }}</span>
        </RouterLink>

        <!-- Misma regla que SettingsView: solo quien puede cambiarla la ve. -->
        <RouterLink v-if="canManageCompany" class="sales-card" :to="{ path: '/settings', hash: '#sale-config' }">
          <span class="sc-title">{{ $t('sales.config.title') }}</span>
          <span class="sc-copy">{{ $t('sales.config.copy') }}</span>
        </RouterLink>
      </nav>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AppNavbar from '../components/AppNavbar.vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const canManageCompany = computed(() =>
  ['owner', 'admin'].includes(authStore.empresaActual?.rol)
)
</script>

<style scoped>
.sales-root { min-height: 100vh; color: var(--k-color-text); font-family: var(--k-font-sans); }
.sales-content { max-width: 1240px; margin: 56px auto 0; padding: 80px var(--k-space-6) var(--k-space-7); }

.page-header { margin-bottom: var(--k-space-6); padding-bottom: var(--k-space-5); border-bottom: var(--k-border-width) solid var(--k-color-border); }
.eyebrow { color: var(--k-color-primary); font-size: var(--k-font-size-caption); letter-spacing: var(--k-tracking-caps); text-transform: uppercase; }
h1 { margin: var(--k-space-2) 0; font-family: var(--k-font-display); font-weight: var(--k-font-weight-regular); font-size: var(--k-font-size-display-2); }
.subtitle { margin: 0; color: var(--k-text-muted); }

.sales-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--k-space-5); }

.sales-card {
  display: flex;
  flex-direction: column;
  gap: var(--k-space-2);
  padding: var(--k-space-5);
  background: var(--k-shade-3);
  border: var(--k-border-width) solid var(--k-shade-6);
  text-decoration: none;
  transition: var(--k-transition-ui);
}
.sales-card:hover { border-color: var(--k-color-primary); }
.sc-title { font-size: var(--k-font-size-body-large); color: var(--k-color-text); }
.sc-copy { font-size: var(--k-font-size-caption-lg); color: var(--k-text-muted); }

@media (max-width: 900px) { .sales-grid { grid-template-columns: 1fr; } }
@media (max-width: 620px) { .sales-content { padding: 48px var(--k-space-4) var(--k-space-6); } }
</style>
