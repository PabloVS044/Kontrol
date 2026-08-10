<template>
  <a
    class="anchor"
    :href="link"
    :style="{
      '--background': backColor || 'var(-Primary)',
      '--hover': hoverColor || 'var(--Primary2)',
      '--color': textColor || 'var(--BtnText)',
    }"
  >
    <!-- Label del botón -->
    <span v-if="label">{{ label }}</span>

    <component v-if="icon && typeof icon !== 'string'" :is="icon" :size="16" />
    <img v-else-if="icon" :src="icon" :alt="label" />
  </a>
</template>

<script setup>
import "./Anchor.css";

const props = defineProps({
  label: { type: String, default: "" },
  link: { type: String, default: "#" },
  backColor: { type: String, default: "" },
  hoverColor: { type: String, default: "" },
  textColor: { type: String, default: "" },
  icon: { type: [String, Object, Function], default: "" },
});
</script>