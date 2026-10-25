<template>
  <div class="app-surface" :class="{ 'app-surface--active': active, 'app-surface--block': block }">
    <div v-if="active && !block" class="app-surface__scrim" aria-hidden="true"></div>
    <slot />
  </div>
</template>

<script setup>
/**
 * Superficie de las vistas internas (DT-09 / T-18).
 *
 * Pone una sola capa de contraste entre el fondo animado de App.vue y el
 * contenido, con el token `--k-surface-scrim`. Antes cada
 * vista lo resolvía por su cuenta: unas dejaban las ondas a la vista, otras
 * pintaban su propio velo del 92 % y el chat un negro opaco. Las vistas ya no
 * declaran fondo de página; solo sus tarjetas y paneles.
 *
 * App.vue la activa con `meta.surface` de la ruta. Landing, login, registro,
 * onboarding e invitación no la llevan: muestran el fondo animado completo.
 * Con `block`, el velo es el fondo del propio bloque y no de toda la pantalla.
 */
defineProps({
  active: { type: Boolean, default: false },
  block: { type: Boolean, default: false },
})
</script>

<style scoped>
/* Fija y detrás del contenido: dentro del contexto de apilamiento de
   `.content` (z-index 1) queda por encima de `.background` (z-index 0),
   cubre todo el viewport aunque la vista sea más corta y no se desplaza. */
.app-surface__scrim {
  position: fixed;
  inset: 0;
  z-index: var(--k-z-negative);
  background: var(--k-surface-scrim);
  pointer-events: none;
}

.app-surface--block {
  background: var(--k-surface-panel);
  box-shadow: inset 0 0 0 var(--k-border-width) var(--k-surface-panel-border);
  border-radius: var(--k-radius-lg);
  padding: var(--k-space-5);
}
</style>
