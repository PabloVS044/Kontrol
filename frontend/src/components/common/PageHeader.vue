<template>
  <div class="page-header">
    <div class="header-left">
      <h1 class="header-title">{{ title }}</h1>
      <p v-if="subtitle" class="header-subtitle">{{ subtitle }}</p>
    </div>
    <div class="header-actions">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' }
})
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 32px;
}
.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.header-title {
  font-family: 'Playfair Display', serif;
  font-size: clamp(28px, 5vw, 48px);
  font-weight: 400;
  color: #faf8f5;
  margin: 0;
  line-height: 1.1;
}
.header-subtitle {
  font-size: 14px;
  color: #888;
  margin: 0;
}
.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 8px;
}
</style>

