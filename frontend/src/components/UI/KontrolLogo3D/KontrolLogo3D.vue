<template>
  <div ref="containerRef" class="kontrol-logo-3d" :style="{ width, height }">
    <KontrolLogo3DScene v-if="showScene" v-bind="sceneBindings" @loaded="loaded = true" />
    <div v-if="!loaded" class="kontrol-logo-3d__fallback">
      <img src="@/assets/img/kontrol.png" alt="Kontrol" />
    </div>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, ref } from 'vue'
import { logger } from '../../../utils/logger.js'
import { useVisibleOnce } from '../../../composables/useVisibleOnce.js'
import { sceneProps } from './kontrolLogo3DProps.js'

const KontrolLogo3DScene = defineAsyncComponent(() =>
  import('./KontrolLogo3DScene.vue').catch((err) => {
    logger.error('[KontrolLogo3D] Failed to load 3D scene:', err)
    return { render: () => null }
  })
)

const props = defineProps({
  ...sceneProps,
  width: { type: String, default: '420px' },
  height: { type: String, default: '420px' },
})

const sceneBindings = computed(() => {
  const { width: _w, height: _h, ...rest } = props
  return rest
})

const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

const containerRef = ref(null)
const loaded = ref(false)
const showScene = useVisibleOnce(containerRef, { enabled: !reduceMotion })
</script>

<style scoped>
.kontrol-logo-3d {
  position: relative;
  max-width: 100%;
}
.kontrol-logo-3d::before {
  content: '';
  position: absolute;
  inset: 8%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(202, 168, 96, 0.55) 0%, rgba(202, 168, 96, 0.18) 40%, transparent 70%);
  filter: blur(40px);
  z-index: -1;
  pointer-events: none;
}
.kontrol-logo-3d__fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.kontrol-logo-3d__fallback img {
  width: 80%;
  opacity: 0.5;
}
</style>
