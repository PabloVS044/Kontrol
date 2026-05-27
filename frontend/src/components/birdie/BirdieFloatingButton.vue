<template>
  <Teleport to="body">
    <button
      v-if="!birdieStore.isOpen"
      ref="btnRef"
      class="birdie-fab"
      :class="{ dragging: isDragging }"
      :style="positionStyle"
      type="button"
      @mousedown="onMouseDown"
      @touchstart.passive="onTouchStart"
      @click="onClick"
      @mouseenter="isHovering = true"
      @mouseleave="isHovering = false"
    >
      <img
        :src="isHovering ? birdieWink : birdieProfile"
        alt="Birdie"
        draggable="false"
      />
    </button>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import birdieProfile from '../../assets/img/birdie/birdie-profile.png'
import birdieWink from '../../assets/img/birdie/birdie-wink.png'
import { useBirdieStore } from '../../stores/birdie'

const birdieStore = useBirdieStore()

const STORAGE_KEY = 'birdie-fab-position'
const SIZE = 60
const MARGIN = 16
const DRAG_THRESHOLD = 4

const btnRef = ref(null)
const isHovering = ref(false)
const isDragging = ref(false)
const wasDragged = ref(false)

const position = ref(loadPosition())
const dragStart = ref(null)

const positionStyle = computed(() => ({
  left: `${position.value.x}px`,
  top: `${position.value.y}px`,
}))

function loadPosition() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        return clampToViewport(parsed.x, parsed.y)
      }
    }
  } catch (_) { /* ignore */ }

  return defaultPosition()
}

function defaultPosition() {
  if (typeof window === 'undefined') return { x: 24, y: 100 }
  return {
    x: window.innerWidth - SIZE - 24,
    y: 100,
  }
}

function clampToViewport(x, y) {
  if (typeof window === 'undefined') return { x, y }
  const maxX = window.innerWidth - SIZE - MARGIN
  const maxY = window.innerHeight - SIZE - MARGIN
  return {
    x: Math.max(MARGIN, Math.min(x, maxX)),
    y: Math.max(MARGIN, Math.min(y, maxY)),
  }
}

function savePosition() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(position.value))
  } catch (_) { /* ignore */ }
}

function onMouseDown(event) {
  if (event.button !== 0) return
  startDrag(event.clientX, event.clientY)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(event) {
  updateDrag(event.clientX, event.clientY)
}

function onMouseUp() {
  endDrag()
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
}

function onTouchStart(event) {
  const touch = event.touches[0]
  if (!touch) return
  startDrag(touch.clientX, touch.clientY)
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('touchend', onTouchEnd)
}

function onTouchMove(event) {
  const touch = event.touches[0]
  if (!touch) return
  event.preventDefault()
  updateDrag(touch.clientX, touch.clientY)
}

function onTouchEnd() {
  endDrag()
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', onTouchEnd)
}

function startDrag(clientX, clientY) {
  wasDragged.value = false
  dragStart.value = {
    pointerX: clientX,
    pointerY: clientY,
    originX: position.value.x,
    originY: position.value.y,
  }
}

function updateDrag(clientX, clientY) {
  if (!dragStart.value) return
  const dx = clientX - dragStart.value.pointerX
  const dy = clientY - dragStart.value.pointerY

  if (!isDragging.value && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
    isDragging.value = true
    wasDragged.value = true
  }

  if (isDragging.value) {
    position.value = clampToViewport(
      dragStart.value.originX + dx,
      dragStart.value.originY + dy,
    )
  }
}

function endDrag() {
  if (isDragging.value) savePosition()
  isDragging.value = false
  dragStart.value = null
}

function onClick(event) {
  if (wasDragged.value) {
    event.preventDefault()
    event.stopPropagation()
    wasDragged.value = false
    return
  }
  birdieStore.open()
}

function handleResize() {
  position.value = clampToViewport(position.value.x, position.value.y)
}

onMounted(() => {
  position.value = clampToViewport(position.value.x, position.value.y)
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', onTouchEnd)
})
</script>

<style scoped>
.birdie-fab {
  position: fixed;
  z-index: 600;
  width: 60px;
  height: 60px;
  padding: 0;
  border: 1.5px solid var(--Primary, #caa860);
  border-radius: 50%;
  background: radial-gradient(
    circle at 30% 30%,
    var(--Background3, #282825),
    var(--Background2, #120f07) 75%
  );
  cursor: grab;
  overflow: hidden;
  box-shadow:
    0 6px 22px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(202, 168, 96, 0.15) inset;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  user-select: none;
  touch-action: none;
}

.birdie-fab:hover {
  transform: scale(1.06);
  border-color: var(--Primary2, #b27f2a);
  box-shadow:
    0 8px 26px rgba(202, 168, 96, 0.35),
    0 0 0 1px rgba(202, 168, 96, 0.3) inset;
}

.birdie-fab.dragging {
  cursor: grabbing;
  transform: scale(1.08);
  transition: none;
  box-shadow:
    0 12px 32px rgba(0, 0, 0, 0.65),
    0 0 0 1px rgba(202, 168, 96, 0.4) inset;
}

.birdie-fab img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  -webkit-user-drag: none;
}
</style>
