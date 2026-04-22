<template>
  <div class="pb-bg">
    <div class="pb-fill" :style="{ width: Math.min(pct, 100) + '%', background: color, height }"></div>
  </div>
</template>

<script setup>
defineProps({
  pct:    { type: Number, default: 0 },
  color:  { type: String, default: '#c9a962' },
  height: { type: String, default: '4px' },
})
</script>

<style scoped>
.pb-bg {
  background: #1a1a1a;
  width: 100%;
}
.pb-fill {
  transition: width 0.5s ease;
}
</style>
