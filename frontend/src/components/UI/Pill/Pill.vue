<template>
  <span
    class="pill"
    :style="{
      '--pill-bg': bgColor || 'var(--Background3)',
      '--pill-dot': circleColor,
      '--pill-text': textColor || 'var(--Text)',
    }"
  >
    <span
      v-if="circleColor"
      class="dot"
    ></span>
    <span class="pill-text">{{ label }}</span>
  </span>
</template>

<script setup>
import "./Pill.css";

const props = defineProps({
  label: { type: String, required: true },
  bgColor: String,
  circleColor: String,
  textColor: String,
});
</script>