<template>
  <span
    :class="['shiny-text', className]"
    :style="spanStyle"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >{{ text }}</span>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';

// ─── Props ────────────────────────────────────────────────────────────────────
const props = defineProps({
  text:         { type: String,  required: true },
  disabled:     { type: Boolean, default: false },
  speed:        { type: Number,  default: 2 },
  className:    { type: String,  default: '' },
  color:        { type: String,  default: '#b5b5b5' },
  shineColor:   { type: String,  default: '#ffffff' },
  spread:       { type: Number,  default: 120 },
  yoyo:         { type: Boolean, default: false },
  pauseOnHover: { type: Boolean, default: false },
  direction:    { type: String,  default: 'left' },
  delay:        { type: Number,  default: 0 }
});

// ─── State ────────────────────────────────────────────────────────────────────
const progress     = ref(0);   // 0–100
const isPaused     = ref(false);
const elapsed      = ref(0);
const lastTime     = ref(null);
const dirSign      = ref(props.direction === 'left' ? 1 : -1);

// ─── RAF loop ─────────────────────────────────────────────────────────────────
let rafId = null;

function tick(time) {
  rafId = requestAnimationFrame(tick);

  if (props.disabled || isPaused.value) {
    lastTime.value = null;
    return;
  }

  if (lastTime.value === null) {
    lastTime.value = time;
    return;
  }

  const delta = time - lastTime.value;
  lastTime.value = time;
  elapsed.value += delta;

  const animDur  = props.speed * 1000;
  const delayDur = props.delay * 1000;
  const d        = dirSign.value;

  if (props.yoyo) {
    const cycleDur  = animDur + delayDur;
    const fullCycle = cycleDur * 2;
    const t         = elapsed.value % fullCycle;

    if (t < animDur) {
      const p = (t / animDur) * 100;
      progress.value = d === 1 ? p : 100 - p;
    } else if (t < cycleDur) {
      progress.value = d === 1 ? 100 : 0;
    } else if (t < cycleDur + animDur) {
      const p = 100 - ((t - cycleDur) / animDur) * 100;
      progress.value = d === 1 ? p : 100 - p;
    } else {
      progress.value = d === 1 ? 0 : 100;
    }
  } else {
    const cycleDur = animDur + delayDur;
    const t        = elapsed.value % cycleDur;

    if (t < animDur) {
      const p = (t / animDur) * 100;
      progress.value = d === 1 ? p : 100 - p;
    } else {
      progress.value = d === 1 ? 100 : 0;
    }
  }
}

rafId = requestAnimationFrame(tick);

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId);
});

// ─── Reset when direction changes ─────────────────────────────────────────────
watch(() => props.direction, (val) => {
  dirSign.value  = val === 'left' ? 1 : -1;
  elapsed.value  = 0;
  progress.value = 0;
});

// ─── Computed styles ──────────────────────────────────────────────────────────
const backgroundPosition = computed(() => `${150 - progress.value * 2}% center`);

const spanStyle = computed(() => ({
  backgroundImage: `linear-gradient(${props.spread}deg, ${props.color} 0%, ${props.color} 35%, ${props.shineColor} 50%, ${props.color} 65%, ${props.color} 100%)`,
  backgroundSize: '200% auto',
  backgroundPosition: backgroundPosition.value,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  display: 'inline-block'
}));

// ─── Hover ────────────────────────────────────────────────────────────────────
function onMouseEnter() { if (props.pauseOnHover) isPaused.value = true;  }
function onMouseLeave() { if (props.pauseOnHover) isPaused.value = false; }
</script>