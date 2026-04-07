<template>
  <component
    :is="tag"
    :class="['animated-text', className]"
    :style="{ textAlign, display: 'block', wordWrap: 'break-word' }"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <!-- Cada palabra es un span nowrap → no se parte letra por letra al responsive -->
    <span
      v-for="(word, wi) in words"
      :key="wi"
      style="display: inline-block; white-space: nowrap;"
    >
      <span
        v-for="(char, ci) in word.chars"
        :key="ci"
        :ref="el => setCharRef(el, word.offset + ci)"
        :style="hasShiny ? shinyCharStyle : { display: 'inline-block', willChange: 'transform, opacity' }"
        class="split-char"
      >{{ char }}</span>
      <!-- Espacio entre palabras (excepto la última) -->
      <span v-if="wi < words.length - 1" style="display: inline-block;">&nbsp;</span>
    </span>
  </component>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// ─── Props ────────────────────────────────────────────────────────────────────
const props = defineProps({
  text:      { type: String, required: true },
  effects:   { type: String, default: 'split' }, // 'split' | 'shiny' | 'split shiny'
  className: { type: String, default: '' },
  tag:       { type: String, default: 'p' },
  textAlign: { type: String, default: 'center' },

  // ── Split ────────────────────────────────────────────────────
  splitDelay: { type: Number, default: 50 },
  duration:   { type: Number, default: 1.25 },
  ease:       { type: String, default: 'power3.out' },
  from:       { type: Object, default: () => ({ opacity: 0, y: 40 }) },
  to:         { type: Object, default: () => ({ opacity: 1, y: 0 }) },
  threshold:  { type: Number, default: 0.1 },
  rootMargin: { type: String, default: '-100px' },

  // ── Shiny ────────────────────────────────────────────────────
  disabled:     { type: Boolean, default: false },
  speed:        { type: Number,  default: 2 },
  color:        { type: String,  default: '#b5b5b5' },
  shineColor:   { type: String,  default: '#ffffff' },
  spread:       { type: Number,  default: 120 },
  yoyo:         { type: Boolean, default: false },
  pauseOnHover: { type: Boolean, default: false },
  direction:    { type: String,  default: 'left' },
  delay:        { type: Number,  default: 0 },

  // ── Callback ─────────────────────────────────────────────────
  onLetterAnimationComplete: { type: Function, default: null },
});

const emit = defineEmits(['letterAnimationComplete']);

// ─── Efectos activos ──────────────────────────────────────────────────────────
const activeEffects = computed(() => props.effects.toLowerCase().split(/\s+/));
const hasSplit      = computed(() => activeEffects.value.includes('split'));
const hasShiny      = computed(() => activeEffects.value.includes('shiny'));

// ─── Palabras → chars agrupados con offset global para los refs ───────────────
// words = [{ chars: ['H','o','l','a'], offset: 0 }, { chars: ['m','u','n','d','o'], offset: 4 }, ...]
const words = computed(() => {
  let offset = 0;
  return props.text.split(' ').map(word => {
    const entry = { chars: [...word], offset };
    offset += word.length;
    return entry;
  });
});

const charRefs = ref([]);

function setCharRef(el, i) {
  if (el) charRefs.value[i] = el;
}

// ─── Shiny RAF ────────────────────────────────────────────────────────────────
const progress = ref(0);
const elapsed  = ref(0);
const lastTime = ref(null);
const isPaused = ref(false);
const dirSign  = ref(props.direction === 'left' ? 1 : -1);
let rafId = null;

function tick(time) {
  rafId = requestAnimationFrame(tick);

  if (!hasShiny.value || props.disabled || isPaused.value) {
    lastTime.value = null;
    return;
  }
  if (lastTime.value === null) { lastTime.value = time; return; }

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
      progress.value = d === 1 ? (t / animDur) * 100 : 100 - (t / animDur) * 100;
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
      progress.value = d === 1 ? (t / animDur) * 100 : 100 - (t / animDur) * 100;
    } else {
      progress.value = d === 1 ? 100 : 0;
    }
  }
}

const shinyCharStyle = computed(() => ({
  backgroundImage: `linear-gradient(${props.spread}deg, ${props.color} 0%, ${props.color} 35%, ${props.shineColor} 50%, ${props.color} 65%, ${props.color} 100%)`,
  backgroundSize: '200% auto',
  backgroundPosition: `${150 - progress.value * 2}% center`,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  display: 'inline-block',
  willChange: 'transform, opacity'
}));

// ─── Split GSAP ───────────────────────────────────────────────────────────────
function runSplitAnimation() {
  if (!hasSplit.value) return;
  const els = charRefs.value.filter(Boolean);
  if (!els.length) return;

  const startPct    = (1 - props.threshold) * 100;
  const marginMatch = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(props.rootMargin);
  const marginValue = marginMatch ? parseFloat(marginMatch[1]) : 0;
  const marginUnit  = marginMatch ? (marginMatch[2] || 'px') : 'px';
  let sign = '';
  if (marginValue < 0) sign = `-=${Math.abs(marginValue)}${marginUnit}`;
  else if (marginValue > 0) sign = `+=${marginValue}${marginUnit}`;

  gsap.fromTo(
    els,
    { ...props.from },
    {
      ...props.to,
      duration: props.duration,
      ease: props.ease,
      stagger: props.splitDelay / 1000,
      scrollTrigger: {
        trigger: els[0].parentElement,
        start: `top ${startPct}%${sign}`,
        once: true
      },
      onComplete() {
        emit('letterAnimationComplete');
        props.onLetterAnimationComplete?.();
      }
    }
  );
}

// ─── Hover ────────────────────────────────────────────────────────────────────
function onMouseEnter() { if (props.pauseOnHover) isPaused.value = true;  }
function onMouseLeave() { if (props.pauseOnHover) isPaused.value = false; }

watch(() => props.direction, (val) => {
  dirSign.value  = val === 'left' ? 1 : -1;
  elapsed.value  = 0;
  progress.value = 0;
});

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(() => {
  rafId = requestAnimationFrame(tick);
  setTimeout(runSplitAnimation, 50);
});

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId);
  ScrollTrigger.getAll().forEach(st => st.kill());
});
</script>