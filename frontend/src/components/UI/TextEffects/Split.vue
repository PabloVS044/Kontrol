<template>
  <component
    :is="tag"
    ref="elRef"
    :class="['split-parent', className]"
    :style="{
      textAlign,
      display: 'block',
      whiteSpace: 'normal',
      wordWrap: 'break-word',
      willChange: 'transform, opacity'
    }"
  >
    {{ text }}
  </component>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText as GSAPSplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, GSAPSplitText);

// ─── Props ────────────────────────────────────────────────────────────────────
const props = defineProps({
  text: {
    type: String,
    required: true
  },
  className: {
    type: String,
    default: ''
  },
  delay: {
    type: Number,
    default: 50
  },
  duration: {
    type: Number,
    default: 1.25
  },
  ease: {
    type: String,
    default: 'power3.out'
  },
  splitType: {
    type: String,
    default: 'chars'
  },
  from: {
    type: Object,
    default: () => ({ opacity: 0, y: 40 })
  },
  to: {
    type: Object,
    default: () => ({ opacity: 1, y: 0 })
  },
  threshold: {
    type: Number,
    default: 0.1
  },
  rootMargin: {
    type: String,
    default: '-100px'
  },
  textAlign: {
    type: String,
    default: 'center'
  },
  tag: {
    type: String,
    default: 'p'
  },
  showCallback: {
    type: Boolean,
    default: false
  },
  onLetterAnimationComplete: {
    type: Function,
    default: null
  }
});

// ─── Emits ────────────────────────────────────────────────────────────────────
const emit = defineEmits(['letterAnimationComplete']);

// ─── State ────────────────────────────────────────────────────────────────────
const elRef = ref(null);
const fontsLoaded = ref(false);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildScrollStart() {
  const startPct = (1 - props.threshold) * 100;
  const marginMatch = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(props.rootMargin);
  const marginValue = marginMatch ? parseFloat(marginMatch[1]) : 0;
  const marginUnit = marginMatch ? (marginMatch[2] || 'px') : 'px';

  let sign = '';
  if (marginValue < 0) sign = `-=${Math.abs(marginValue)}${marginUnit}`;
  else if (marginValue > 0) sign = `+=${marginValue}${marginUnit}`;

  return `top ${startPct}%${sign}`;
}

function resolveTargets(splitInstance) {
  const { splitType } = props;
  if (splitType.includes('chars') && splitInstance.chars?.length) return splitInstance.chars;
  if (splitType.includes('words') && splitInstance.words?.length) return splitInstance.words;
  if (splitType.includes('lines') && splitInstance.lines?.length) return splitInstance.lines;
  return splitInstance.chars ?? splitInstance.words ?? splitInstance.lines ?? [];
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────
function cleanup() {
  const el = elRef.value;
  if (!el) return;

  ScrollTrigger.getAll()
    .filter(st => st.trigger === el)
    .forEach(st => st.kill());

  if (el._rbsplitInstance) {
    try { el._rbsplitInstance.revert(); } catch (_) { /* noop */ }
    el._rbsplitInstance = null;
  }
}

// ─── Animation ────────────────────────────────────────────────────────────────
function runAnimation() {
  const el = elRef.value;
  if (!el || !props.text || !fontsLoaded.value) return;

  cleanup();

  const start = buildScrollStart();

  const splitInstance = new GSAPSplitText(el, {
    type: props.splitType,
    smartWrap: true,
    autoSplit: props.splitType === 'lines',
    linesClass: 'split-line',
    wordsClass: 'split-word',
    charsClass: 'split-char',
    reduceWhiteSpace: false,
    onSplit(self) {
      const targets = resolveTargets(self);

      gsap.fromTo(
        targets,
        { ...props.from },
        {
          ...props.to,
          duration: props.duration,
          ease: props.ease,
          stagger: props.delay / 1000,
          scrollTrigger: {
            trigger: el,
            start,
            once: true,
            fastScrollEnd: true,
            anticipatePin: 0.4
          },
          onComplete() {
            emit('letterAnimationComplete');
            if (props.showCallback && typeof props.onLetterAnimationComplete === 'function') {
              props.onLetterAnimationComplete();
            }
          },
          willChange: 'transform, opacity',
          force3D: true
        }
      );
    }
  });

  el._rbsplitInstance = splitInstance;
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(() => {
  if (document.fonts.status === 'loaded') {
    fontsLoaded.value = true;
  } else {
    document.fonts.ready.then(() => {
      fontsLoaded.value = true;
    });
  }
});

onUnmounted(cleanup);

// Corre la animación cuando las fuentes cargan o cambian props relevantes
watch(
  [
    fontsLoaded,
    () => props.text,
    () => props.delay,
    () => props.duration,
    () => props.ease,
    () => props.splitType,
    () => JSON.stringify(props.from),
    () => JSON.stringify(props.to),
    () => props.threshold,
    () => props.rootMargin
  ],
  async ([loaded]) => {
    if (!loaded) return; // esperar a que las fuentes estén listas
    await nextTick();    // esperar a que Vue actualice el DOM
    runAnimation();
  }
);
</script>