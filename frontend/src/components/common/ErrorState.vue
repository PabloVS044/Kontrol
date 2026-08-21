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
  gap: var(--k-space-2);
  background: var(--Background);
  min-height: 300px;
  padding: var(--k-space-7);
}
.state-title {
  font-family: Var(--font-display), serif;
  font-size: var(--k-font-size-heading-1);
  color: var(--Text);
}
.state-msg {
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-small);
  color: var(--TextMuted);
  text-align: center;
  max-width: 400px;
  line-height: var(--k-leading-relaxed);
}
</style>

