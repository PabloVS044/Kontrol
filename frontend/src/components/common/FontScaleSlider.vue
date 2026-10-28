<template>
  <div class="fs">
    <div class="fs-row">
      <span class="fs-a fs-a--sm" aria-hidden="true">A</span>
      <input
        :id="id"
        class="fs-range"
        type="range"
        min="0"
        :max="availableScales.length - 1"
        step="1"
        :value="index"
        :aria-valuetext="label"
        :style="{ '--fs-fill': `${fill}%` }"
        @input="onInput"
      />
      <span class="fs-a fs-a--lg" aria-hidden="true">A</span>
    </div>
    <output class="fs-value" :for="id">{{ label }}</output>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFontScale } from '@/composables/useFontScale.js'

defineProps({
  id: { type: String, default: 'font-scale' },
})

const { t } = useI18n()
const { fontScale, availableScales, setFontScale } = useFontScale()

const index = computed(() => Math.max(0, availableScales.indexOf(fontScale.value)))
const label = computed(() => t(`settings.prefs.fontSizes.${fontScale.value}`))
const fill = computed(() => (index.value / (availableScales.length - 1)) * 100)

function onInput(event) {
  // Se aplica al soltar cada paso, no al guardar: el cambio se ve en la misma
  // pantalla de Configuración y así se puede juzgar antes de seguir.
  setFontScale(availableScales[Number(event.target.value)])
}
</script>

<style scoped>
.fs {
  display: flex;
  flex-direction: column;
  gap: var(--k-space-1);
  max-width: 320px;
}

.fs-row {
  display: flex;
  align-items: center;
  gap: var(--k-space-3);
}

.fs-a {
  flex-shrink: 0;
  font-family: var(--k-font-display);
  color: var(--k-text-muted);
  line-height: 1;
}
.fs-a--sm { font-size: var(--k-font-size-caption-lg); }
.fs-a--lg { font-size: var(--k-font-size-heading-2); }

/* El track se pinta a mano para que el tramo recorrido vaya en dorado en
   Chrome y Safari; Firefox lo hace con ::-moz-range-progress. */
.fs-range {
  flex: 1;
  min-width: 0;
  height: var(--k-target-min-size);
  margin: 0;
  background: transparent;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.fs-range::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(
    to right,
    var(--k-color-primary) var(--fs-fill),
    var(--k-shade-7) var(--fs-fill)
  );
}
.fs-range::-moz-range-track {
  height: 4px;
  border-radius: 2px;
  background: var(--k-shade-7);
}
.fs-range::-moz-range-progress {
  height: 4px;
  border-radius: 2px;
  background: var(--k-color-primary);
}

.fs-range::-webkit-slider-thumb {
  width: 18px;
  height: 18px;
  margin-top: -7px;
  border: 2px solid var(--k-shade-1);
  border-radius: 50%;
  background: var(--k-color-primary);
  -webkit-appearance: none;
  appearance: none;
}
.fs-range::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border: 2px solid var(--k-shade-1);
  border-radius: 50%;
  background: var(--k-color-primary);
}

.fs-range:focus-visible {
  outline: var(--k-focus-ring);
  outline-offset: var(--k-focus-ring-offset);
}

.fs-value {
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-color-primary);
}
</style>
