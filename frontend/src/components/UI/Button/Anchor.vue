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
    <span v-if="label">{{ label }}</span>
    <component v-if="icon && typeof icon !== 'string'" :is="icon" :size="18" />
    <img v-else-if="icon" :src="icon" :alt="label" />
  </a>
</template>

<script setup>
import "./Anchor.css";

const props = defineProps({
  label: { type: String, default: "" },
  link: { type: String, default: "#" },
  // Sin valor, `--background` queda sin declarar y `var(--background)` invalida
  // la regla: el enlace sale transparente. Es intencional — así un Anchor sin
  // color explícito es un enlace de texto, no un botón. Ponerle un fallback
  // dorado convirtió los cuatro enlaces de la landing en píldoras.
  backColor: { type: String, default: "" },
  hoverColor: { type: String, default: "var(--Primary)" },
  textColor: { type: String, default: "var(--Text)" },
  icon: { type: [String, Object, Function], default: "" },
});
</script>