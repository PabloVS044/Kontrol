<template>
  <div id="app">
    <!-- Sin tope, los destellos de las líneas llegaban a blanco (#fff) detrás
         de subtítulos y burbujas. Con maxIntensity 0.11 el pico medido en
         pantalla, sumado al fondo de página, es #272727: todo token de texto
         supera 4.5:1 sobre él (tests/theme.test.js). El resto del dibujo no
         cambia. -->
    <div class="background">
      <LineWaves
        :speed="0.2"
        :innerLineCount="32"
        :outerLineCount="36"
        :warpIntensity="1"
        :rotation="-45"
        :edgeFadeWidth="0"
        :colorCycleSpeed="1"
        :brightness="0.08"
        :maxIntensity="0.11"
        color1="var(--k-bg-wave-line)"
        color2="var(--k-bg-wave-line)"
        color3="var(--k-bg-wave-line)"
        :enableMouseInteraction="true"
        :mouseInfluence="2"
      />
    </div>

    <div class="content">
      <AppSurface :active="Boolean(route.meta.surface)">
        <RouterView />
      </AppSurface>
    </div>
    <FloatingChat v-if="authStore.isLoggedIn && authStore.hasEmpresa && route.name !== 'chat' && !hideFloatingButtons" />
    <BirdieFloatingButton v-if="authStore.isLoggedIn && authStore.hasEmpresa && prefsStore.birdieVisible && !hideFloatingButtons" />
    <BirdieAssistant v-if="authStore.isLoggedIn && authStore.hasEmpresa" />
    <VideoCallOverlay v-if="authStore.isLoggedIn && authStore.hasEmpresa" />
    <LegalConsentModal />
    <StorageConsentBanner />
    <PlanRequiredNotice v-if="authStore.isLoggedIn" />
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, onMounted, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { RouterView, useRoute } from "vue-router";
import AppSurface from "./components/UI/AppSurface/AppSurface.vue";
import FloatingChat from "./components/chat/FloatingChat.vue";
import BirdieFloatingButton from "./components/birdie/BirdieFloatingButton.vue";
import BirdieAssistant from "./components/birdie/BirdieAssistant.vue";
import VideoCallOverlay from "./components/chat/VideoCallOverlay.vue";
import LegalConsentModal from "./components/LegalConsentModal.vue";
import StorageConsentBanner from "./components/StorageConsentBanner.vue";
import PlanRequiredNotice from "./components/billing/PlanRequiredNotice.vue";
import { useAuthStore } from './stores/auth'
import { useChatStore } from './stores/chat'
import { useSaleConfigStore } from './stores/saleConfig'
import { usePreferencesStore } from './stores/preferences'
import { useFontScale } from './composables/useFontScale.js'

const LineWaves = defineAsyncComponent(() => import("./components/UI/Backgrounds/Waves/Waves.vue"));

const authStore = useAuthStore()
const chatStore = useChatStore()
const saleConfigStore = useSaleConfigStore()
const prefsStore = usePreferencesStore()
const route = useRoute()
const { setFontScaleActive } = useFontScale()

// El tamaño de letra elegido es para la aplicación: las pantallas públicas
// (landing, login, registro) se maquetan con su propia tipografía fluida.
watch(() => Boolean(route.meta.surface), setFontScaleActive, { immediate: true })

// En un teléfono, Chat y el asistente IA ocupan la pantalla entera y los
// botones flotantes caían encima de sus controles: Birdie sobre videollamada y
// nuevo mensaje, la burbuja del chat sobre el botón de enviar.
const isPhone = useMediaQuery('(max-width: 768px)')
const hideFloatingButtons = computed(() => isPhone.value && ['chat', 'agent'].includes(route.name))

onMounted(() => {
  prefsStore.load()
  if (authStore.isLoggedIn) {
    authStore.loadEmpresas()
    if (authStore.hasEmpresa) {
      chatStore.connect()
      // La moneda la necesitan pantallas fuera del POS, así que se carga una
      // vez aquí en lugar de que cada vista la resuelva por su cuenta.
      saleConfigStore.load()
    }
  }
})

watch(() => authStore.isLoggedIn, (loggedIn) => {
  if (loggedIn && authStore.hasEmpresa) chatStore.connect()
  else chatStore.disconnect()
})

watch(() => authStore.hasEmpresa, (has) => {
  if (has && authStore.isLoggedIn) {
    chatStore.connect()
    saleConfigStore.load()
  }
})

// Cambiar de empresa cambia la moneda: cada una tiene su propia configuración.
watch(() => authStore.idEmpresaActual, (id) => {
  if (id && authStore.isLoggedIn) saleConfigStore.load({ force: true })
})

watch(() => authStore.idUsuario, () => prefsStore.load())
</script>

<style scoped>
#app {
  position: relative;
  width: 100%;
  min-height: 100vh;
}

.background {
  position: fixed;
  inset: 0;
  z-index: var(--k-z-background);
  filter: var(--k-bg-wave-filter);
}

.content {
  position: relative;
  z-index: var(--k-z-base);
}
</style>
