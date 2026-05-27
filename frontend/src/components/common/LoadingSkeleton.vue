<template>
  <div class="skeleton-grid">
    <div 
      v-for="n in count" 
      :key="n" 
      class="skeleton-card"
      :class="cardClass"
    >
      <div class="skeleton-accent"></div>
      <div class="skeleton-body">
        <div class="skeleton-line short"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line mid"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  count: { type: Number, default: 6 },
  cardClass: { type: String, default: '' }
})
</script>

<style scoped>
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}
.skeleton-card {
  background: #0f0f0f;
  border: 1px solid #1f1f1f;
  height: 200px;
  display: flex;
  flex-direction: column;
  pointer-events: none;
}
.skeleton-accent {
  height: 3px;
  background: linear-gradient(90deg, #1f1f1f 0%, #2a2a2a 50%, #1f1f1f 100%);
}
.skeleton-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}
.skeleton-line {
  height: 10px;
  background: linear-gradient(90deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%);
  border-radius: 2px;
  animation: pulse 1.4s ease-in-out infinite;
}
.skeleton-line.short { width: 50%; }
.skeleton-line.mid { width: 70%; }
@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}
</style>

