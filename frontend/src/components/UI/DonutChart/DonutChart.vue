<template>
  <svg :viewBox="`0 0 ${size} ${size}`" :width="displayWidth" :height="displayWidth">
    <circle
      :cx="center" :cy="center" :r="radius"
      fill="none" stroke="#181818" :stroke-width="strokeWidth"
    />
    <circle
      :cx="center" :cy="center" :r="radius"
      fill="none"
      :stroke="color"
      :stroke-width="strokeWidth"
      :stroke-dasharray="`${filled} ${circumference}`"
      :stroke-dashoffset="dashOffset"
      stroke-linecap="butt"
      :transform="`rotate(-90 ${center} ${center})`"
    />
    <text
      v-if="label"
      :x="center" :y="center + labelOffsetY"
      text-anchor="middle" :fill="labelColor"
      :font-size="labelFontSize" font-family="Manrope" font-weight="700"
    >{{ label }}</text>
    <text
      v-if="sublabel"
      :x="center" :y="center + labelOffsetY + sublabelOffsetY"
      text-anchor="middle" fill="#555"
      :font-size="sublabelFontSize" font-family="Manrope"
    >{{ sublabel }}</text>
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  pct:              { type: Number, default: 0 },
  color:            { type: String, default: '#c9a962' },
  size:             { type: Number, default: 80 },
  radius:           { type: Number, default: 28 },
  strokeWidth:      { type: Number, default: 10 },
  label:            { type: String, default: '' },
  labelColor:       { type: String, default: '#fff' },
  labelFontSize:    { type: Number, default: 11 },
  labelOffsetY:     { type: Number, default: 4 },
  sublabel:         { type: String, default: '' },
  sublabelFontSize: { type: Number, default: 6 },
  sublabelOffsetY:  { type: Number, default: 10 },
  displayWidth:     { type: String, default: '80px' },
})

const center        = computed(() => props.size / 2)
const circumference = computed(() => 2 * Math.PI * props.radius)
const dashOffset    = computed(() => circumference.value / 4)
const filled        = computed(() => circumference.value * Math.min(props.pct, 100) / 100)
</script>
