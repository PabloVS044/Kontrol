<template>
  <div
    ref="gridRef"
    class="grid-wave"
    :style="{ '--cols': cols, '--cell-gap': gap, '--base-color': baseColor, '--active-color': activeColor, '--scale-boost': maxScale - 1 }"
    @pointermove="onPointerMove"
    @pointerleave="onPointerLeave"
  >
    <span
      v-for="i in rows * cols"
      :key="i"
      class="grid-wave-cell"
      :ref="el => setCellRef(el, i - 1)"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from "vue";
import { gsap } from "gsap";

// ─── Props ────────────────────────────────────────────────────────────────────
const props = defineProps({
  rows: { type: Number, default: 12 },
  cols: { type: Number, default: 12 },
  gap: { type: String, default: "6px" },
  baseColor: { type: String, default: "var(--k-color-border)" },
  activeColor: { type: String, default: "var(--k-color-primary-2)" },
  // Influence radius in px: how far from the pointer a cell still reacts.
  radius: { type: Number, default: 160 },
  maxScale: { type: Number, default: 1.6 },
});

// ─── Refs ─────────────────────────────────────────────────────────────────────
const gridRef = ref(null);
let cellEls = [];
function setCellRef(el, i) {
  if (el) cellEls[i] = el;
}

let quickSetters = [];
let idleTimeline = null;
let rafId = null;
let pendingEvent = null;

const prefersReducedMotion = computed(
  () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
);
const canHover = computed(
  () => window.matchMedia("(hover: hover) and (pointer: fine)").matches
);

// ─── Pointer-follow mode (mouse/trackpad) ──────────────────────────────────────
function processPointer() {
  rafId = null;
  if (!pendingEvent || !gridRef.value) return;

  const rect = gridRef.value.getBoundingClientRect();
  const px = pendingEvent.clientX - rect.left;
  const py = pendingEvent.clientY - rect.top;

  cellEls.forEach((cell, i) => {
    if (!cell) return;
    const cellRect = cell.getBoundingClientRect();
    const cx = cellRect.left - rect.left + cellRect.width / 2;
    const cy = cellRect.top - rect.top + cellRect.height / 2;
    const dist = Math.hypot(px - cx, py - cy);
    const intensity = Math.max(0, 1 - dist / props.radius);
    quickSetters[i]?.(intensity);
  });
}

function onPointerMove(e) {
  if (prefersReducedMotion.value || !canHover.value) return;
  pendingEvent = e;
  if (rafId === null) rafId = requestAnimationFrame(processPointer);
}

function onPointerLeave() {
  if (prefersReducedMotion.value || !canHover.value) return;
  cellEls.forEach((cell, i) => quickSetters[i]?.(0));
}

// ─── Idle wave mode (touch devices — no pointer to follow) ─────────────────────
function startIdleWave() {
  idleTimeline = gsap.timeline({ repeat: -1, repeatDelay: 0.8 });
  idleTimeline
    .to(cellEls, {
      "--intensity": 1,
      duration: 0.7,
      ease: "power2.out",
      stagger: { grid: [props.rows, props.cols], from: "center", amount: 1.1 },
    })
    .to(
      cellEls,
      {
        "--intensity": 0,
        duration: 0.7,
        ease: "power2.in",
        stagger: { grid: [props.rows, props.cols], from: "center", amount: 1.1 },
      },
      "-=0.35"
    );
}

// ─── Setup / teardown ───────────────────────────────────────────────────────────
// Extracted so a rows/cols change (see watcher below) can tear down and rebuild
// against the new cell count instead of animating stale, mismatched elements.
function teardown() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  pendingEvent = null;
  idleTimeline?.kill();
  idleTimeline = null;
  quickSetters = [];
}

function setup() {
  if (prefersReducedMotion.value) return; // static grid, no motion at all

  if (canHover.value) {
    quickSetters = cellEls.map(cell =>
      cell ? gsap.quickTo(cell, "--intensity", { duration: 0.35, ease: "power2.out" }) : null
    );
  } else {
    startIdleWave();
  }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(setup);

onUnmounted(() => {
  teardown();
  cellEls = [];
});

watch(
  () => [props.rows, props.cols],
  async () => {
    teardown();
    cellEls = []; // v-for will re-populate this via setCellRef as it re-renders
    await nextTick();
    setup();
  }
);
</script>

<style scoped>
.grid-wave {
  display: grid;
  grid-template-columns: repeat(var(--cols), 1fr);
  gap: var(--cell-gap);
  width: 100%;
}

.grid-wave-cell {
  aspect-ratio: 1;
  border-radius: 4px;
  background: color-mix(in srgb, var(--active-color) calc(var(--intensity, 0) * 100%), var(--base-color));
  transform: scale(calc(1 + var(--intensity, 0) * var(--scale-boost)));
}
</style>
