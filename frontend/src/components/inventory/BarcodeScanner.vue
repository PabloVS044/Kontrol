<template>
  <div v-if="modelValue" class="scanner-overlay">
    <div class="scanner-head">
      <span class="scanner-title">{{ $t('inventory.scanner.title') }}</span>
      <button class="scanner-close" :aria-label="$t('inventory.scanner.close')" @click="close">✕</button>
    </div>

    <div class="scanner-viewport">
      <video ref="videoEl" class="scanner-video" muted playsinline autoplay></video>
      <div class="scanner-frame"></div>
    </div>

    <p v-if="cameraError" class="scanner-msg err">{{ cameraError }}</p>
    <p v-else-if="feedback" class="scanner-msg" :class="feedback.type === 'err' ? 'err' : 'ok'">{{ feedback.msg }}</p>
    <p v-else class="scanner-msg hint">{{ $t('inventory.scanner.hint') }}</p>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
// @zxing is loaded on demand (dynamic import inside start) so it ships as its
// own chunk and never weighs down the inventory route's initial load.

const { t } = useI18n()

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  // Transient message the parent can surface over the camera, e.g. { type, msg }
  feedback:   { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'detected'])

const videoEl     = ref(null)
const cameraError = ref(null)

let reader = null
let controls = null
let lastCode = null
let lastTime = 0

async function start() {
  cameraError.value = null
  await nextTick()
  if (!videoEl.value) return
  try {
    const { BrowserMultiFormatReader } = await import('@zxing/browser')
    reader = new BrowserMultiFormatReader()
    controls = await reader.decodeFromConstraints(
      { video: { facingMode: { ideal: 'environment' } } },
      videoEl.value,
      (result) => {
        if (!result) return
        const text = result.getText()
        const now = Date.now()
        // Debounce: ZXing fires repeatedly while a code stays in frame.
        if (text === lastCode && now - lastTime < 1500) return
        lastCode = text
        lastTime = now
        emit('detected', text)
      }
    )
  } catch (err) {
    cameraError.value = err?.name === 'NotAllowedError'
      ? t('inventory.scanner.permissionError')
      : t('inventory.scanner.noCamera')
  }
}

function stop() {
  try { controls?.stop() } catch { /* already stopped */ }
  controls = null
  reader = null
  lastCode = null
}

function close() {
  emit('update:modelValue', false)
}

watch(() => props.modelValue, (open) => {
  if (open) start()
  else stop()
})

onBeforeUnmount(stop)
</script>

<style scoped>
.scanner-overlay {
  position: fixed; inset: 0; z-index: 300;
  background: #050505;
  display: flex; flex-direction: column;
}
.scanner-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid #1f1f1f;
}
.scanner-title {
  font-family: 'Playfair Display', serif; font-size: 18px; color: #faf8f5;
}
.scanner-close {
  background: none; border: none; color: #888; font-size: 18px; cursor: pointer;
  line-height: 1; padding: 4px;
}
.scanner-close:hover { color: #faf8f5; }

.scanner-viewport {
  position: relative; flex: 1; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  background: #000;
}
.scanner-video { width: 100%; height: 100%; object-fit: cover; }
.scanner-frame {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: min(72vw, 320px); height: min(40vw, 180px);
  border: 2px solid #c9a962; border-radius: 8px;
  box-shadow: 0 0 0 9999px rgba(0,0,0,0.45);
}

.scanner-msg {
  text-align: center; padding: 16px 20px;
  font-family: 'Manrope', sans-serif; font-size: 13px;
}
.scanner-msg.hint { color: #888; }
.scanner-msg.ok   { color: #34d399; }
.scanner-msg.err  { color: #fb7185; }
</style>
