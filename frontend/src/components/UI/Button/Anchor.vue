<template>
  <a
    class="anchor"
    :href="link"
    :style="{
      '--background': backColor,
      '--hover': hoverColor,
      '--color': textColor,
    }"
  >
    {{ label }}
    <component v-if="icon && typeof icon !== 'string'" :is="icon" :size="18" />
    <img v-else-if="icon" :src="icon" :alt="label" />
  </a>
</template>
<script setup>
import "./Anchor.css";

const props = defineProps({
  label: { type: String, default: "LinkButton" },
  link: { type: String, default: "" },
  backColor: { type: String, default: "" },
  hoverColor: { type: String, default: "var(--Primary)" },
  textColor: { type: String, default: "var(--Text)" },
  icon: { type: [String, Object, Function], default: "" },
});
</script>
