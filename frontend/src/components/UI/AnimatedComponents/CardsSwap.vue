<template>
  <div
    ref="containerRef"
    class="card-swap-container"
    :style="{ width: `${width}px`, height: `${height}px` }"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <slot />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, provide } from 'vue';
import gsap from 'gsap';

// ─── Props ────────────────────────────────────────────────────────────────────
const props = defineProps({
  width:            { type: Number,  default: 500 },
  height:           { type: Number,  default: 400 },
  cardDistance:     { type: Number,  default: 60 },
  verticalDistance: { type: Number,  default: 70 },
  delay:            { type: Number,  default: 5000 },
  pauseOnHover:     { type: Boolean, default: false },
  skewAmount:       { type: Number,  default: 6 },
  easing:           { type: String,  default: 'elastic' },
});

const emit = defineEmits(['cardClick']);

const containerRef = ref(null);

// ─── Cards register themselves via provide/inject ─────────────────────────────
const registeredCards = [];
function registerCard(el) {
  registeredCards.push(el);
}
provide('registerCard', registerCard);

// ─── Config ───────────────────────────────────────────────────────────────────
function getConfig() {
  return props.easing === 'elastic'
    ? { ease: 'elastic.out(0.6,0.9)', durDrop: 2,   durMove: 2,   durReturn: 2,   promoteOverlap: 0.9,  returnDelay: 0.05 }
    : { ease: 'power1.inOut',         durDrop: 0.8,  durMove: 0.8, durReturn: 0.8, promoteOverlap: 0.45, returnDelay: 0.2  };
}

function makeSlot(i, distX, distY, total) {
  return { x: i * distX, y: -i * distY, z: -i * distX * 1.5, zIndex: total - i };
}

function placeNow(el, slot) {
  gsap.set(el, {
    x: slot.x, y: slot.y, z: slot.z,
    xPercent: -50, yPercent: -50,
    skewY: props.skewAmount,
    transformOrigin: 'center center',
    zIndex: slot.zIndex,
    force3D: true,
  });
}

// ─── Animation ────────────────────────────────────────────────────────────────
let order      = [];
let tlCurrent  = null;
let intervalId = null;

function swap() {
  const cards = registeredCards;
  if (order.length < 2 || !cards.length) return;

  const [front, ...rest] = order;
  const elFront = cards[front];
  const cfg     = getConfig();
  const tl      = gsap.timeline();
  tlCurrent     = tl;

  tl.to(elFront, { y: '+=500', duration: cfg.durDrop, ease: cfg.ease });

  tl.addLabel('promote', `-=${cfg.durDrop * cfg.promoteOverlap}`);
  rest.forEach((idx, i) => {
    const el   = cards[idx];
    const slot = makeSlot(i, props.cardDistance, props.verticalDistance, cards.length);
    tl.set(el, { zIndex: slot.zIndex }, 'promote');
    tl.to(el, { x: slot.x, y: slot.y, z: slot.z, duration: cfg.durMove, ease: cfg.ease }, `promote+=${i * 0.15}`);
  });

  const backSlot = makeSlot(cards.length - 1, props.cardDistance, props.verticalDistance, cards.length);
  tl.addLabel('return', `promote+=${cfg.durMove * cfg.returnDelay}`);
  tl.call(() => gsap.set(elFront, { zIndex: backSlot.zIndex }), undefined, 'return');
  tl.to(elFront, { x: backSlot.x, y: backSlot.y, z: backSlot.z, duration: cfg.durReturn, ease: cfg.ease }, 'return');
  tl.call(() => { order = [...rest, front]; });
}

function startInterval() { intervalId = window.setInterval(swap, props.delay); }
function stopInterval()  { clearInterval(intervalId); intervalId = null; }

function onMouseEnter() { if (!props.pauseOnHover) return; tlCurrent?.pause(); stopInterval(); }
function onMouseLeave() { if (!props.pauseOnHover) return; tlCurrent?.play(); startInterval(); }

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(() => {
  // Wait a tick so Card children have mounted and registered
  setTimeout(() => {
    const total = registeredCards.length;
    order = Array.from({ length: total }, (_, i) => i);

    registeredCards.forEach((card, i) => {
      placeNow(card, makeSlot(i, props.cardDistance, props.verticalDistance, total));
    });

    swap();
    startInterval();
  }, 0);
});

onUnmounted(() => {
  stopInterval();
  tlCurrent?.kill();
});
</script>

<style scoped>
.card-swap-container {
  position: relative;
  perspective: 900px;
  overflow: visible;
  flex-shrink: 0;
}
</style>