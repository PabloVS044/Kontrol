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
  padding: var(--space-4);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-4);
  font-family: var(--font-sans); 
  border: var(--border-width) solid transparent;
}

.alert-ok {
  background: var(--Success, 0.1);
  border: var(--border-width) solid var(--SuccessText);
  border-color: var(--SuccessText);
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  color: var(--SuccessText);
  display: flex; gap: var(--space-3); align-items: center;
}
.alert-ok .alert-msg { color: var(--TextSoft); font-weight: 400; }

.alert-box.watching {
  background: var(--Background-alert-box-watching);
  border: var(--border-width) solid rgba(250,204,21,0.45);
}
.alert-box.watching .alert-header { color: var(--Background-alert-box-watching); }

.alert-box.warning {
  background: var(--Background-alert-box-warning);
  border: var(--border-width) solid var(--Background-alert-box-warning-border);
}
.alert-box.warning .alert-header { color: var(--alert-header-warning); }

.alert-box.critical {
  background: var(--Background-alert-box-critical);
  border: var(--border-width) solid var(--Border-alert-box-critical);
}
.alert-box.critical .alert-header { color: var(--alert-header-critical); }

.alert-header {
  display: flex; gap: var(--space-2); margin-bottom: var(--space-1);
  font-size: var(--text-xs); font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-caps);
}
.alert-box p {
  font-size: var(--text-2xs); color: var(--TextSoft); line-height: var(--leading-normal); margin: 0;
}

.icon {
  font-style: normal;
}
</style>
