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
  background: #0a0a0a;
  min-height: 300px;
}
.state-title {
  font-family: 'Playfair Display', serif;
  font-size: 24px;
  color: var(--Text);
}
.state-msg {
  font-size: 14px;
  color: var(--TextMuted);
  text-align: center;
  max-width: 400px;
}
</style>

