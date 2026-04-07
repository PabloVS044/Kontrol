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

    <RouterView />
  </div>
</template>

<script setup>
import { RouterView } from "vue-router"
import LineWaves from "./components/UI/Backgrounds/Waves/Waves.vue"
</script>

<style scoped>
#app {
  position: relative;
  width: 100%;
  height: 100vh;
}

.background {
  position: fixed;   /* fijo para que cubra toda la pantalla al hacer scroll */
  inset: 0;          /* top:0 right:0 bottom:0 left:0 */
  z-index: 0;
}

/* El RouterView va encima del fondo */
:deep(.router-view) {
  position: relative;
  z-index: 1;
}
</style>