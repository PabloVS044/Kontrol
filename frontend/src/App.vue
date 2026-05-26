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
    <BirdieFloatingButton v-if="authStore.isLoggedIn && authStore.hasEmpresa" />
    <VideoCallOverlay v-if="authStore.isLoggedIn && authStore.hasEmpresa" />
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { RouterView, useRoute } from "vue-router";
import LineWaves from "./components/UI/Backgrounds/Waves/Waves.vue";
import FloatingChat from "./components/chat/FloatingChat.vue";
import BirdieFloatingButton from "./components/birdie/BirdieFloatingButton.vue";
import VideoCallOverlay from "./components/chat/VideoCallOverlay.vue";
import { useAuthStore } from './stores/auth'
import { useChatStore } from './stores/chat'

const authStore = useAuthStore()
const chatStore = useChatStore()
const route = useRoute()

onMounted(() => {
  if (authStore.isLoggedIn) {
    authStore.loadEmpresas()
    if (authStore.hasEmpresa) chatStore.connect()
  }
})

watch(() => authStore.isLoggedIn, (loggedIn) => {
  if (loggedIn && authStore.hasEmpresa) chatStore.connect()
  else chatStore.disconnect()
})

watch(() => authStore.hasEmpresa, (has) => {
  if (has && authStore.isLoggedIn) chatStore.connect()
})
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
