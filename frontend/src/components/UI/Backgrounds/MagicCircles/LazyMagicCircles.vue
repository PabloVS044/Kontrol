<template>
  <div ref="containerRef" class="magic-rings-placeholder" :style="scene ? null : { background: $attrs.background }">
    <component :is="scene" v-if="scene" v-bind="$attrs" />
  </div>
</template>

<script setup>
import { shallowRef, watch, ref } from 'vue'
import { logger } from '../../../../utils/logger.js'
import { useVisibleOnce } from '../../../../composables/useVisibleOnce.js'

defineOptions({ inheritAttrs: false })

const containerRef = ref(null)
const visible = useVisibleOnce(containerRef)
const scene = shallowRef(null)

watch(visible, async (isVisible) => {
  if (!isVisible) return
  try {
    scene.value = (await import('./MagicCircles.vue')).default
  } catch (err) {
    logger.error('[LazyMagicCircles] Failed to load MagicCircles:', err)
  }
})
</script>

<style scoped>
.magic-rings-placeholder {
  width: 100%;
  height: 100%;
  min-height: 400px;
}
</style>
