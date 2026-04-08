<template>
  <span
    class="pill"
    :style="{
      '--color': btnColor,
      '--dot-color': circleColor,
      '--text': textColor,
    }"
  >
    <div
      v-if="circleColor"
      class="dot"
    ></div>
    <p class="pill-text">{{ label }}</p>
  </span>
</template>

<script setup>
import "./Pill.css";

const props = defineProps({
  label: String,
  btnColor: String,
  circleColor: String,
  textColor: String,
});
</script>
