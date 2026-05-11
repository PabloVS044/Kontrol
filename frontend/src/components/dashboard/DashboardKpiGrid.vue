<template>
  <section class="kpi-grid">
    <Card
      v-for="stat in stats"
      :key="stat.label"
      :title="stat.value"
      :subtitle="stat.label"
      :back="stat.back"
      titleColor="#faf8f5"
      borderColor="#1f1f1f"
      shadowColor="rgba(0,0,0,0.5)"
    >
      <Pill
        :label="stat.trend"
        :btnColor="stat.trendColor + '18'"
        :circleColor="stat.trendColor"
        :textColor="stat.trendColor"
      />
    </Card>
  </section>
</template>

<script setup>
import Card from '../UI/Card/Card.vue'
import Pill from '../UI/Pill/Pill.vue'

defineProps({
  stats: { type: Array, required: true },
})
</script>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 40px;
}

.kpi-grid :deep(.card) {
  max-width: none;
  width: 100%;
  margin: 0;
  border-radius: 4px;
  padding: 24px;
  gap: 12px;
}

.kpi-grid :deep(.card-title) {
  font-size: 2rem;
  font-family: 'Playfair Display', serif;
}

.kpi-grid :deep(.card-subtitle) {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #666;
}

@media (max-width: 900px) {
  .kpi-grid { grid-template-columns: 1fr; }
}
</style>
