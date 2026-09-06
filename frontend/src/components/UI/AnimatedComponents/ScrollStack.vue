<template>
  <div
    :class="['scroll-stack-scroller', className]"
    :style="useWindowScroll ? { overflow: 'visible' } : {}"
    ref="scrollerRef"
  >
    <div class="scroll-stack-inner" ref="innerRef">
      <slot />
      <div class="scroll-stack-end" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import Lenis from 'lenis';

// ─── Props ────────────────────────────────────────────────────────────────────
const props = defineProps({
  className:         { type: String,   default: '' },
  itemDistance:      { type: Number,   default: 100 },
  itemScale:         { type: Number,   default: 0.03 },
  itemStackDistance: { type: Number,   default: 30 },
  stackPosition:     { type: String,   default: '20%' },
  scaleEndPosition:  { type: String,   default: '10%' },
  baseScale:         { type: Number,   default: 0.85 },
  scaleDuration:     { type: Number,   default: 0.5 },
  rotationAmount:    { type: Number,   default: 0 },
  blurAmount:        { type: Number,   default: 0 },
  useWindowScroll:   { type: Boolean,  default: false },
  onStackComplete:   { type: Function, default: null },
});

// ─── Refs ─────────────────────────────────────────────────────────────────────
const scrollerRef = ref(null);
const innerRef     = ref(null);

let cards          = [];
let lenis          = null;
let rafId          = null;
let stackCompleted = false;
let isUpdating     = false;
const lastTransforms = new Map();

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calculateProgress(scrollTop, start, end) {
  if (scrollTop < start) return 0;
  if (scrollTop > end)   return 1;
  return (scrollTop - start) / (end - start);
}

function parsePercentage(value, containerHeight) {
  if (typeof value === 'string' && value.includes('%')) {
    return (parseFloat(value) / 100) * containerHeight;
  }
  return parseFloat(value);
}

function getScrollData() {
  if (props.useWindowScroll) {
    return { scrollTop: window.scrollY, containerHeight: window.innerHeight };
  }
  const scroller = scrollerRef.value;
  return { scrollTop: scroller.scrollTop, containerHeight: scroller.clientHeight };
}

// ─── Cached layout offsets ──────────────────────────────────────────────────────
// `getBoundingClientRect()` reports the element's PAINTED position, which
// includes any CSS transform already applied to it. Since this component sets
// `translateY(...)` on every card, re-measuring a card's position with
// `getBoundingClientRect()` on each scroll tick would read back its own
// previous transform, feeding it into the next frame's calculation — the
// stack would visibly jitter/drift instead of tracking the scroll smoothly.
// Layout offsets are measured once (before any transform is applied) and
// cached; only a resize re-measures them, since transforms never affect them.
let cardOffsets = [];
let endOffset   = 0;

function measureOffsets() {
  if (props.useWindowScroll) {
    cardOffsets = cards.map(card => card.getBoundingClientRect().top + window.scrollY);
    const endEl = document.querySelector('.scroll-stack-end');
    endOffset   = endEl ? endEl.getBoundingClientRect().top + window.scrollY : 0;
  } else {
    cardOffsets = cards.map(card => card.offsetTop);
    const endEl = scrollerRef.value?.querySelector('.scroll-stack-end');
    endOffset   = endEl ? endEl.offsetTop : 0;
  }

  updateRunway();
}

// The last card never scrolls away on its own: once released from pinning it
// keeps a fixed translateY roughly equal to its own height plus the stack
// offsets (see the release branch in updateCardTransforms). The trailing
// space after the stack must be at least that tall, or the released card
// visually overlaps whatever section comes next. `stackPosition` is a
// percentage of the *viewport* height, so a fixed CSS value can never get
// this right for every screen — it has to be computed from real measurements.
function updateRunway() {
  if (!innerRef.value || !cards.length) return;

  const { containerHeight } = getScrollData();
  const stackPositionPx = parsePercentage(props.stackPosition, containerHeight);
  const lastIndex       = cards.length - 1;
  // offsetHeight (not getBoundingClientRect) so a `scale()` already applied
  // to the card mid-animation doesn't shrink the measurement.
  const lastCardHeight  = cards[lastIndex].offsetHeight;

  const releaseOffset = lastCardHeight - containerHeight / 2 + stackPositionPx
    + props.itemStackDistance * lastIndex;

  const EXTRA_GAP_PX = 64; // breathing room before the next section
  innerRef.value.style.paddingBottom = `${Math.max(releaseOffset, 0) + EXTRA_GAP_PX}px`;
}

// ─── Core animation ───────────────────────────────────────────────────────────
function updateCardTransforms() {
  if (!cards.length || isUpdating) return;
  isUpdating = true;

  const { scrollTop, containerHeight } = getScrollData();
  const stackPositionPx    = parsePercentage(props.stackPosition, containerHeight);
  const scaleEndPositionPx = parsePercentage(props.scaleEndPosition, containerHeight);

  const endElementTop = endOffset;

  cards.forEach((card, i) => {
    if (!card) return;

    const cardTop      = cardOffsets[i];
    const triggerStart = cardTop - stackPositionPx - props.itemStackDistance * i;
    const triggerEnd   = cardTop - scaleEndPositionPx;
    const pinStart     = cardTop - stackPositionPx - props.itemStackDistance * i;
    const pinEnd       = endElementTop - containerHeight / 2;

    const scaleProgress = calculateProgress(scrollTop, triggerStart, triggerEnd);
    const targetScale   = props.baseScale + i * props.itemScale;
    const scale         = 1 - scaleProgress * (1 - targetScale);
    const rotation      = props.rotationAmount ? i * props.rotationAmount * scaleProgress : 0;

    let blur = 0;
    if (props.blurAmount) {
      let topCardIndex = 0;
      for (let j = 0; j < cards.length; j++) {
        const jTriggerStart = cardOffsets[j] - stackPositionPx - props.itemStackDistance * j;
        if (scrollTop >= jTriggerStart) topCardIndex = j;
      }
      if (i < topCardIndex) blur = Math.max(0, (topCardIndex - i) * props.blurAmount);
    }

    let translateY = 0;
    const isPinned = scrollTop >= pinStart && scrollTop <= pinEnd;
    if (isPinned) {
      translateY = scrollTop - cardTop + stackPositionPx + props.itemStackDistance * i;
    } else if (scrollTop > pinEnd) {
      translateY = pinEnd - cardTop + stackPositionPx + props.itemStackDistance * i;
    }

    const next = {
      translateY: Math.round(translateY * 100) / 100,
      scale:      Math.round(scale * 1000) / 1000,
      rotation:   Math.round(rotation * 100) / 100,
      blur:       Math.round(blur * 100) / 100,
    };

    const last       = lastTransforms.get(i);
    const hasChanged = !last
      || Math.abs(last.translateY - next.translateY) > 0.1
      || Math.abs(last.scale      - next.scale)      > 0.001
      || Math.abs(last.rotation   - next.rotation)   > 0.1
      || Math.abs(last.blur       - next.blur)        > 0.1;

    if (hasChanged) {
      const rotate = next.rotation !== 0 ? ` rotate(${next.rotation}deg)` : '';
      card.style.transform = `translateY(${next.translateY}px) scale(${next.scale})${rotate}`;
      card.style.filter    = next.blur > 0 ? `blur(${next.blur}px)` : 'none';
      lastTransforms.set(i, next);
    }

    // Stack complete callback
    if (i === cards.length - 1) {
      const isInView = scrollTop >= pinStart && scrollTop <= pinEnd;
      if (isInView && !stackCompleted) {
        stackCompleted = true;
        props.onStackComplete?.();
      } else if (!isInView && stackCompleted) {
        stackCompleted = false;
      }
    }
  });

  isUpdating = false;
}

// ─── Lenis setup ──────────────────────────────────────────────────────────────
function setupLenis() {
  const easingFn = t => Math.min(1, 1.001 - Math.pow(2, -10 * t));

  if (props.useWindowScroll) {
    lenis = new Lenis({
      duration: 1.2, easing: easingFn, smoothWheel: true,
      touchMultiplier: 2, infinite: false, wheelMultiplier: 1,
      lerp: 0.1, syncTouch: true, syncTouchLerp: 0.075,
    });
  } else {
    const scroller = scrollerRef.value;
    lenis = new Lenis({
      wrapper: scroller,
      content: scroller.querySelector('.scroll-stack-inner'),
      duration: 1.2, easing: easingFn, smoothWheel: true,
      touchMultiplier: 2, infinite: false, normalizeWheel: true,
      wheelMultiplier: 1, touchInertiaMultiplier: 35,
      lerp: 0.1, syncTouch: true, syncTouchLerp: 0.075, touchInertia: 0.6,
    });
  }

  lenis.on('scroll', updateCardTransforms);

  const raf = time => {
    lenis.raf(time);
    rafId = requestAnimationFrame(raf);
  };
  rafId = requestAnimationFrame(raf);
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(() => {
  const scroller = scrollerRef.value;
  if (!scroller) return;

  cards = Array.from(
    props.useWindowScroll
      ? document.querySelectorAll('.scroll-stack-card')
      : scroller.querySelectorAll('.scroll-stack-card')
  );

  cards.forEach((card, i) => {
    if (i < cards.length - 1) card.style.marginBottom = `${props.itemDistance}px`;
    card.style.willChange      = 'transform';
    card.style.transformOrigin = 'top center';
    card.style.transform       = 'none';
  });

  // Measured while every card still has `transform: none`, so the cached
  // offsets reflect real layout position, not a previously-applied transform.
  measureOffsets();

  window.addEventListener('resize', handleResize);
  // Late-loading web fonts/images can still shift layout after this point;
  // the previous per-frame remeasurement absorbed that automatically, so a
  // one-off re-measure on 'load' keeps that same guarantee with the cache.
  window.addEventListener('load', handleResize);

  setupLenis();
  updateCardTransforms();
});

function handleResize() {
  // A resize can change layout (offsets), but never a card's own transform,
  // so re-measuring here is safe and keeps the stack aligned after reflow.
  measureOffsets();
  updateCardTransforms();
}

onUnmounted(() => {
  if (rafId)  cancelAnimationFrame(rafId);
  if (lenis)  lenis.destroy();
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('load', handleResize);
  stackCompleted = false;
  cards          = [];
  cardOffsets    = [];
  lastTransforms.clear();
  isUpdating     = false;
});
</script>

<style scoped>
.scroll-stack-scroller {
  position: relative;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: visible;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  transform: translateZ(0);
  will-change: scroll-position;
}

.scroll-stack-inner {
  padding: 0 5rem;
  /* Fallback for the instant before JS measures and sets the real value
     inline (see updateRunway) — modest on purpose, not a magic number tuned
     to cancel out elsewhere. */
  padding-bottom: 6rem;
  min-height: 100vh;
}

@media (max-width: 768px) {
  .scroll-stack-inner { padding-left: 1.25rem; padding-right: 1.25rem; }
}

@media (max-width: 480px) {
  .scroll-stack-inner { padding-left: 0.5rem; padding-right: 0.5rem; }
}

.scroll-stack-end {
  width: 100%;
  height: 1px;
}
</style>