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

const props = defineProps({
  level:   { type: String, default: null },
  message: { type: String, default: '' },
})

const LEVEL_META = {
  SALUDABLE:   { kind: 'ok',       title: 'On track.',  message: 'No budget overrun detected.' },
  PRECAUCION:  { kind: 'watching', title: 'Watching',   message: 'Spending is approaching the warning threshold.' },
  ADVERTENCIA: { kind: 'warning',  title: 'Warning',    message: 'Budget usage is high.' },
  CRITICO:     { kind: 'critical', title: 'Critical',   message: 'Budget fully consumed.' },
  EXCEDIDO:    { kind: 'critical', title: 'Overrun',    message: 'Spending has exceeded the budget.' },
}

const meta = computed(() => {
  const base = LEVEL_META[props.level] ?? LEVEL_META.SALUDABLE
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
  background: #34d399;
  border: 1px solid rgba(52,211,153,0.4);
  padding: 14px 16px;
  font-size: 13px;
  color: #6ee7b7;
  display: flex; gap: 10px; align-items: center;
}
.alert-ok .alert-msg { color: #b8e8d4; font-weight: 400; }

.alert-box.watching {
  background: #facc15;
  border: 1px solid rgba(250,204,21,0.45);
}
.alert-box.watching .alert-header { color: #facc15; }

.alert-box.warning {
  background: #f97316;
  border: 1px solid rgba(249,115,22,0.55);
}
.alert-box.warning .alert-header { color: #fdba74; }

.alert-box.critical {
  background: #fb7185;
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
