<template>
  <div id="app">
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
        color1="var(--Text)"
        color2="var(--Text)"
        color3="var(--Text)"
        :enableMouseInteraction="true"
        :mouseInfluence="2"
      />
    </div>

    <div class="content">
      <RouterView />
    </div>
    <FloatingChat v-if="authStore.isLoggedIn && authStore.hasEmpresa && route.name !== 'chat'" />
    <BirdieFloatingButton v-if="authStore.isLoggedIn && authStore.hasEmpresa && prefsStore.birdieVisible" />
    <BirdieAssistant v-if="authStore.isLoggedIn && authStore.hasEmpresa" />
    <VideoCallOverlay v-if="authStore.isLoggedIn && authStore.hasEmpresa" />
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { RouterView, useRoute } from "vue-router";
import LineWaves from "./components/UI/Backgrounds/Waves/Waves.vue";
import FloatingChat from "./components/chat/FloatingChat.vue";
import BirdieFloatingButton from "./components/birdie/BirdieFloatingButton.vue";
import BirdieAssistant from "./components/birdie/BirdieAssistant.vue";
import VideoCallOverlay from "./components/chat/VideoCallOverlay.vue";
import { useAuthStore } from './stores/auth'
import { useChatStore } from './stores/chat'
import { useSaleConfigStore } from './stores/saleConfig'
import { usePreferencesStore } from './stores/preferences'

const authStore = useAuthStore()
const chatStore = useChatStore()
const saleConfigStore = useSaleConfigStore()
const prefsStore = usePreferencesStore()
const route = useRoute()

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
  z-index: 0;
}

.content {
  position: relative;
  z-index: 1;
}
</style>
