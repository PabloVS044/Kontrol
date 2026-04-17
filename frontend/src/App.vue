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
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { RouterView } from "vue-router";
import LineWaves from "./components/UI/Backgrounds/Waves/Waves.vue";
import { useAuthStore } from './stores/auth'

const authStore = useAuthStore()

onMounted(() => {
  // Refresh empresa list on every page load so it stays in sync
  if (authStore.isLoggedIn) authStore.loadEmpresas()
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
