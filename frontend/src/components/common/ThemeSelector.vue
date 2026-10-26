<template>
  <div class="theme-inline" role="group" :aria-label="$t('settings.prefs.theme')">
    <button
      v-for="option in availableThemes"
      :key="option"
      type="button"
      class="theme-inline-opt"
      :class="{ selected: theme === option }"
      :aria-pressed="theme === option"
      @click="setTheme(option)"
    >{{ $t(`settings.prefs.themes.${option}`) }}</button>
  </div>
</template>

<script setup>
import { useTheme } from '@/composables/useTheme.js'

const { theme, availableThemes, setTheme } = useTheme()
</script>

<style scoped>
/* Mismo control que la variante inline de LanguageSelector. */
.theme-inline {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  background: var(--k-shade-2);
  border: var(--k-border-width) solid var(--k-shade-6);
  border-radius: var(--k-radius-sm);
}

.theme-inline-opt {
  background: transparent;
  border: none;
  padding: 7px 14px;
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-gray-3);
  cursor: pointer;
  border-radius: calc(var(--k-radius-sm) - 2px);
  transition: color 0.15s, background 0.15s;
}

.theme-inline-opt:hover { color: var(--k-color-text); background: rgba(var(--k-ink-rgb), 0.04); }

.theme-inline-opt.selected {
  color: var(--k-shade-1);
  background: var(--k-color-primary);
}

.theme-inline-opt:focus-visible {
  outline: 2px solid var(--k-color-primary);
  outline-offset: 2px;
}
</style>
