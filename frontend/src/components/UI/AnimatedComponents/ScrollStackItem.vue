<template>
  <div :class="['scroll-stack-card', itemClassName]">
    <div class="scroll-stack-card-header">
      <span v-if="step !== null" class="step-badge">Step {{ step }}</span>
      <h3 class="scroll-stack-card-title">{{ title }}</h3>
    </div>
    <p class="scroll-stack-card-description" v-if="description">{{ description }}</p>
    <slot />
    <ol class="scroll-stack-card-process" v-if="process.length">
      <li v-for="(item, index) in process" :key="index">
        <span class="process-item-number">{{ index + 1 }}</span>
        <span class="process-item-text">{{ item }}</span>
      </li>
    </ol>
  </div>
</template>

<script setup>
defineProps({
  itemClassName: { type: String, default: '' },
  step:          { type: Number, default: null },
  title:         { type: String, default: '' },
  description:   { type: String, default: '' },
  process:       { type: Array,  default: () => [] },
});
</script>

<style scoped>
.scroll-stack-card {
  transform-origin: top center;
  will-change: transform, opacity;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.1);
  min-height: 20rem;
  width: 100%;
  margin: 30px 0;
  padding: 3rem;
  border-radius: 40px;
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.scroll-stack-card-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.step-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 3rem;
  height: 3rem;
  padding: 0 1rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--Text) 12%, transparent);
  color: var(--Text);
  font-weight: 700;
  font-size: 0.95rem;
}

.scroll-stack-card-title {
  margin: 0;
  color: var(--Text);
  font-size: 1.6rem;
  line-height: 1.2;
}

.scroll-stack-card-description {
  margin: 1rem 0 0;
  color: color-mix(in srgb, var(--Text) 75%, transparent);
  font-size: 1rem;
  line-height: 1.6;
  max-width: 40rem;
}

.scroll-stack-card-process {
  list-style: none;
  padding: 1.25rem 0 0 0;
  margin: 0 auto;
  display: grid;
  gap: 0.85rem;
  max-width: 36rem;
}

.scroll-stack-card-process li {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 0.85rem;
}

.process-item-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--Text) 15%, transparent);
  color: var(--Text);
  font-weight: 700;
}

.process-item-text {
  color: color-mix(in srgb, var(--Text) 85%, transparent);
  line-height: 1.6;
}
</style>