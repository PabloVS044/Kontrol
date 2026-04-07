<template>
  <a
    class="anchor"
    :href="link"
    :style="{
      '--background': backColor,
      '--hover': hoverColor,
      '--color': textColor,
    }"
    >{{ label }}</a
  >
</template>
<script setup>
import "./Anchor.css";

const props = defineProps({
  label: { type: String, default: "LinkButton" },
  link: { type: String, default: "" },
  backColor: { type: String, default: "" },
  hoverColor: { type: String, default: "var(--Primary)" },
  textColor: { type: String, default: "var(--Text)" },
});
</script>
