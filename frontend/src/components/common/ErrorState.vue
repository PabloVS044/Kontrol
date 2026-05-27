<template>
  <div class="state-screen">
    <p class="state-title">{{ title }}</p>
    <p class="state-msg">{{ message }}</p>
    <slot name="actions" />
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  message: { type: String, required: true }
})
</script>

<style scoped>
.state-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(10,10,10,0.82);
  min-height: 300px;
}
.state-title {
  font-family: 'Playfair Display', serif;
  font-size: 24px;
  color: #faf8f5;
}
.state-msg {
  font-size: 14px;
  color: #888;
  text-align: center;
  max-width: 400px;
}
</style>

