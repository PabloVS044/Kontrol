<template>
  <div class="circle" :style="{ '--back': color, '--roundedColor': roundedColor }">
    <div class="circle-rounded">
      <component v-if="icon && typeof icon !== 'string'" :is="icon" :size="iconSize" :color="iconColor" stroke-width="1.5" />
      <img v-else-if="typeof icon === 'string'" :src="icon" alt="" />
    </div>
  </div>
</template>

<script setup>
import "./CircleRounded.css";

const props = defineProps({
  size: {
    type: Number,
    default: 200,
  },
  color: {
    type: String,
    default: "var(--Primary)",
  },
  animationDuration: {
    type: Number,
    default: 2, // seconds
  },
  roundedColor: {
    type: String,
    default: "var(--Primary2)",
  },
  icon: {
    type: [String, Object],
    default: "",
  },
  iconSize: {
    type: Number,
    default: 100,
  },
  iconColor: {
    type: String,
    default: "currentColor",
  },
});
</script>
