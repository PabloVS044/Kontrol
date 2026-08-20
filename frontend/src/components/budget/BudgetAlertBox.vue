<template>
  <div v-if="meta.kind === 'ok'" class="alert-box alert-ok">
    <strong>✓ {{ meta.title }}</strong>
    <span class="alert-msg">{{ meta.message }}</span>
  </div>
  <div v-else class="alert-box" :class="meta.kind">
    <div class="alert-content">
      <div class="alert-header">
        <span class="icon">⚠</span>
        <strong>{{ meta.title }}</strong>
      </div>
      <p>{{ meta.message }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  level:   { type: String, default: null },
  message: { type: String, default: '' },
})

const { t } = useI18n()

const LEVEL_META = computed(() => ({
  SALUDABLE:   { kind: 'ok',       title: t('budget.alertBox.onTrack.title'),  message: t('budget.alertBox.onTrack.message') },
  PRECAUCION:  { kind: 'watching', title: t('budget.alertBox.watching.title'), message: t('budget.alertBox.watching.message') },
  ADVERTENCIA: { kind: 'warning',  title: t('budget.alertBox.warning.title'),  message: t('budget.alertBox.warning.message') },
  CRITICO:     { kind: 'critical', title: t('budget.alertBox.critical.title'), message: t('budget.alertBox.critical.message') },
  EXCEDIDO:    { kind: 'critical', title: t('budget.alertBox.overrun.title'),  message: t('budget.alertBox.overrun.message') },
}))

const meta = computed(() => {
  const base = LEVEL_META.value[props.level] ?? LEVEL_META.value.SALUDABLE
  return { ...base, message: props.message || base.message }
})
</script>

<style scoped>
.alert-box {
  padding: var(--k-space-4);
  border-radius: var(--k-radius-md);
  margin-bottom: var(--k-space-4);
  font-family: var(--k-font-sans); 
  border: var(--k-border-width) solid transparent;
}

/* Los cuatro niveles siguen el mismo patrón: tinte de fondo + borde del mismo
   color a más opacidad + cabecera en el tono claro. Todos los valores salen de
   `theme.css`; ningún literal de color vive aquí. */

.alert-ok {
  /* Antes: `background: var(--Success, 0.1)`. La intención era un tinte al
     10 %, pero eso no es lo que hace `var()`: el 0.1 es el fallback y solo
     aplica si --Success no existe. Como sí existe, salía el verde oscuro
     opaco de la paleta a fondo completo. */
  background: var(--k-alert-ok-bg);
  border: var(--k-border-width) solid var(--k-alert-ok-border);
  padding: var(--k-space-3) var(--k-space-4);
  font-size: var(--k-font-size-body-small);
  color: var(--k-alert-ok-text);
  display: flex; gap: var(--k-space-3); align-items: center;
}
.alert-ok .alert-msg { color: var(--k-text-soft); font-weight: 400; }

.alert-box.watching {
  background: var(--k-alert-watching-bg);
  border: var(--k-border-width) solid var(--k-alert-watching-border);
}
/* La cabecera usaba el MISMO color que el fondo: texto invisible. */
.alert-box.watching .alert-header { color: var(--k-alert-watching-text); }

.alert-box.warning {
  background: var(--k-alert-warning-bg);
  border: var(--k-border-width) solid var(--k-alert-warning-border);
}
.alert-box.warning .alert-header { color: var(--k-alert-warning-text); }

.alert-box.critical {
  background: var(--k-alert-critical-bg);
  border: var(--k-border-width) solid var(--k-alert-critical-border);
}
.alert-box.critical .alert-header { color: var(--k-alert-critical-text); }

.alert-header {
  display: flex; gap: var(--k-space-2); margin-bottom: var(--k-space-1);
  font-size: var(--k-font-size-caption-lg); font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--k-tracking-caps);
}
.alert-box p {
  font-size: var(--k-font-size-caption); color: var(--k-text-soft); line-height: var(--k-leading-normal); margin: 0;
}

.icon {
  font-style: normal;
}
</style>
