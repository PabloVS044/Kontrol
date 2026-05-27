<template>
  <div class="filter-bar">
    <button
      v-for="filter in filters"
      :key="filter.key"
      class="filter-btn"
      :class="{ active: modelValue === filter.key }"
      @click="$emit('update:modelValue', filter.key)"
    >
      {{ filter.label }}
      <ChevronDown :size="10" class="chevron" />
    </button>
  </div>
</template>

<script setup>
import { ChevronDown } from 'lucide-vue-next'

defineProps({
  filters: { type: Array, required: true },
  modelValue: { type: String, required: true },
})

defineEmits(['update:modelValue'])
</script>

<style scoped>
.filter-bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 12px;
  background: #111111;
  border: 1px solid #1f1f1f;
  color: #555;
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  cursor: pointer;
  transition: color .2s, border-color .2s, background .2s;
}

.filter-btn.active,
.filter-btn:hover {
  color: #c9a962;
  border-color: rgba(201,169,98,0.35);
  background: #111111;
}

.chevron { opacity: .8; }
</style>
