<template>
  <span
    class="pill"
    :style="{
      '--pill-bg': btnColor,
      '--pill-dot': circleColor,
      '--pill-text': textColor,
    }"
  >
    <span
      v-if="circleColor"
      class="pill-dot"
    ></span>
    <span class="pill-text">{{ label }}</span>
  </span>
</template>

<script setup>
import "./Pill.css";

/**
 * `btnColor` conserva su nombre a propósito. El PR #86 lo renombró a `bgColor`
 * sin tocar los 14 puntos de uso repartidos por 12 archivos (ProjectCard,
 * ReportsKpiGrid, DashboardKpiGrid, ProductCard, InventoryPage, ProjectsView,
 * LandingPage, IntegrationsView, ReportDetailHeader, ReportDetailSidePanel),
 * así que todos los pills perdieron su color de estado en silencio: Vue no
 * avisa de una prop desconocida, simplemente cae al valor por defecto.
 *
 * `label` vuelve a ser opcional: marcarla `required` genera un warning en cada
 * pill decorativo que solo lleva punto de color.
 *
 * Los defaults viven en Pill.css como fallback de cada `var()`, no aquí: así
 * un `undefined` no pisa el valor de la hoja.
 */
const props = defineProps({
  label: String,
  btnColor: String,
  circleColor: String,
  textColor: String,
});
</script>
