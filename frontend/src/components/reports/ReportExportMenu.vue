<template>
  <div ref="root" class="export-menu">
    <button
      class="btn-outline"
      type="button"
      :disabled="disabled || busyFormat !== null"
      :aria-expanded="open"
      aria-haspopup="menu"
      @click="toggle"
    >
      <svg class="icon14" viewBox="0 0 14 14" fill="none">
        <path d="M7 10V2M4 7l3 3 3-3M2 12h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="square"/>
      </svg>
      {{ busyFormat ? $t('reports.export.working', { format: busyFormat }) : $t('reports.header.export') }}
      <svg class="icon10 chevron" :class="{ up: open }" viewBox="0 0 10 10" fill="none">
        <path d="M2 4l3 3 3-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="square"/>
      </svg>
    </button>

    <div v-if="open" class="export-pop" role="menu">
      <span class="pop-label">{{ $t('reports.export.chooseFormat') }}</span>

      <button
        v-for="option in FORMATS"
        :key="option.format"
        class="pop-item"
        type="button"
        role="menuitem"
        @click="choose(option.format)"
      >
        <span class="pop-tag">{{ option.format }}</span>
        <span class="pop-text">
          <span class="pop-title">{{ $t(option.titleKey) }}</span>
          <span class="pop-desc">{{ $t(option.descKey) }}</span>
        </span>
      </button>

      <span class="pop-footnote">{{ $t('reports.export.scopeNote', { filter: filterLabel }) }}</span>
    </div>

    <p v-if="error" class="export-error">{{ error }}</p>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const FORMATS = [
  {
    format: 'PDF',
    titleKey: 'reports.export.pdfTitle',
    descKey: 'reports.export.pdfDesc',
  },
  {
    format: 'CSV',
    titleKey: 'reports.export.csvTitle',
    descKey: 'reports.export.csvDesc',
  },
]

defineProps({
  // Shown in the menu so it is obvious what subset the file will contain.
  filterLabel: { type: String, default: '' },
  busyFormat: { type: String, default: null },
  error: { type: String, default: null },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['export'])

const root = ref(null)
const open = ref(false)

function toggle() {
  open.value = !open.value
}

function choose(format) {
  open.value = false
  emit('export', format)
}

function onOutsideClick(event) {
  if (open.value && root.value && !root.value.contains(event.target)) open.value = false
}

function onEscape(event) {
  if (event.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('click', onOutsideClick)
  document.addEventListener('keydown', onEscape)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onOutsideClick)
  document.removeEventListener('keydown', onEscape)
})
</script>

<style scoped>
.export-menu {
  position: relative;
  display: inline-flex;
  flex-direction: column;
}

.btn-outline {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: #111111;
  border: 1px solid #2a2a2a;
  color: var(--TextMuted);
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color .2s, color .2s;
}

.btn-outline:hover:not(:disabled) {
  border-color: #caa860;
  color: var(--Primary);
}

.btn-outline:disabled {
  opacity: 0.6;
  cursor: progress;
}

.icon14 { width: 14px; height: 14px; }
.icon10 { width: 10px; height: 10px; }

.chevron { transition: transform .2s; }
.chevron.up { transform: rotate(180deg); }

/* ─── Popover ────────────────────────────────────────────────────────────── */
.export-pop {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 40;
  width: 268px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px;
  background: #0d0d0d;
  border: 1px solid #2a2a2a;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
}

.pop-label {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--TextFaint);
  padding: 2px 4px 8px;
}

.pop-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  padding: 9px 8px;
  background: none;
  border: 1px solid transparent;
  text-align: left;
  cursor: pointer;
  transition: background .15s, border-color .15s;
}

.pop-item:hover {
  background: #141414;
  border-color: rgba(202, 168, 96, 0.3);
}

.pop-tag {
  flex-shrink: 0;
  margin-top: 1px;
  padding: 3px 7px;
  font-family: 'Manrope', sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--Primary);
  background: rgba(202, 168, 96, 0.1);
  border: 1px solid rgba(202, 168, 96, 0.25);
}

.pop-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.pop-title {
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #e8e4de;
}

.pop-desc {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  line-height: 1.4;
  color: var(--TextFaint);
}

.pop-footnote {
  padding: 8px 4px 2px;
  margin-top: 6px;
  border-top: 1px solid #1a1a1a;
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  color: var(--TextDim);
}

.export-error {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 30;
  margin: 0;
  padding: 6px 10px;
  max-width: 268px;
  background: #0d0d0d;
  border: 1px solid rgba(224, 82, 82, 0.4);
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  color: var(--ErrorText);
}

@media (max-width: 640px) {
  .export-menu { width: 100%; }
  .btn-outline { width: 100%; justify-content: center; }
  .export-pop { width: 100%; }
}
</style>
