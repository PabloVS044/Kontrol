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
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 16px;
  font-family: 'Manrope', sans-serif;
}

.alert-ok {
  background: rgba(52,211,153,0.12);
  border: 1px solid rgba(52,211,153,0.4);
  padding: 14px 16px;
  font-size: 13px;
  color: #6ee7b7;
  display: flex; gap: 10px; align-items: center;
}
.alert-ok .alert-msg { color: #b8e8d4; font-weight: 400; }

.alert-box.watching {
  background: rgba(250,204,21,0.12);
  border: 1px solid rgba(250,204,21,0.45);
}
.alert-box.watching .alert-header { color: #facc15; }

.alert-box.warning {
  background: rgba(249,115,22,0.18);
  border: 1px solid rgba(249,115,22,0.55);
}
.alert-box.warning .alert-header { color: #fdba74; }

.alert-box.critical {
  background: rgba(251,113,133,0.18);
  border: 1px solid rgba(251,113,133,0.6);
}
.alert-box.critical .alert-header { color: #fda4af; }

.alert-header {
  display: flex; gap: 8px; margin-bottom: 4px;
  font-size: 13px; font-weight: 600;
}
.alert-box p {
  font-size: 12px; color: #e8e8e8; line-height: 1.5; margin: 0;
}
</style>
