<template>
  <section class="ai-box">
    <div class="ai-content">
      <h3 class="ai-title">KONTROL AI ANALYSIS</h3>
      <p class="ai-message">"{{ userName }}, {{ insight }}"</p>
    </div>
    <Button
      v-if="project"
      label="REVIEW BUDGET"
      @click="$emit('review-budget', project)"
    />
  </section>
</template>

<script setup>
import Button from '../UI/Button/Button.vue'

defineProps({
  userName: { type: String, required: true },
  insight: { type: String, required: true },
  project: { type: Object, default: null },
})

defineEmits(['review-budget'])
</script>

<style scoped>
.ai-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(12,10,5,0.9);
  border: 1px dashed var(--Primary);
  padding: 40px;
  margin-bottom: 40px;
  gap: 32px;
}

.ai-title {
  color: var(--Primary);
  font-size: 12px;
  letter-spacing: 0.1em;
  margin-bottom: 12px;
  font-family: 'DM Sans', sans-serif;
}

.ai-message {
  font-style: italic;
  font-size: 1.05rem;
  max-width: 800px;
  line-height: 1.6;
  font-family: 'DM Sans', sans-serif;
}

.ai-box :deep(.btn) {
  background: var(--Primary);
  color: #0a0a0a;
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  border-radius: 0;
  padding: 12px 24px;
  white-space: nowrap;
  flex-shrink: 0;
}

.ai-box :deep(.btn:hover) {
  filter: brightness(1.15);
}

@media (max-width: 768px) {
  .ai-box { flex-direction: column; align-items: flex-start; padding: 28px; }
}
</style>
