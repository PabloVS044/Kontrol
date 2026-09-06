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

    <div class="scanner-footer">
      <p class="scanner-msg" :class="messageTone">{{ message }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
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

/**
 * Un único mensaje visible a la vez, con su tono semántico (SCRUM-12). El fallo
 * de cámara manda sobre el feedback del padre: si no hay cámara, saber por qué
 * es más útil que el resultado del último escaneo.
 */
const message = computed(() => {
  if (cameraError.value) return cameraError.value
  if (props.feedback) return props.feedback.msg
  return t('inventory.scanner.hint')
})

const messageTone = computed(() => {
  if (cameraError.value) return 'err'
  if (props.feedback) return props.feedback.type
  return 'hint'
})

async function start() {
  cameraError.value = null
  await nextTick()
  if (!videoEl.value) return

  // getUserMedia solo existe en contexto seguro (https o localhost). Al abrir la
  // app por IP de LAN en http el objeto no existe y el fallo se ve igual que una
  // camara ausente, asi que lo distinguimos antes de intentar.
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraError.value = window.isSecureContext
      ? t('inventory.scanner.noCamera')
      : t('inventory.scanner.insecureContext')
    return
  }

  try {
    const { BrowserMultiFormatReader } = await import('@zxing/browser')
    const { DecodeHintType, BarcodeFormat } = await import('@zxing/library')

    // TRY_HARDER cuesta mas CPU por intento pero es lo que rescata un 1D
    // ligeramente desenfocado, que es el caso normal con webcam de foco fijo.
    const hints = new Map()
    hints.set(DecodeHintType.TRY_HARDER, true)
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128, BarcodeFormat.CODE_39,
      BarcodeFormat.ITF, BarcodeFormat.QR_CODE,
    ])

    reader = new BrowserMultiFormatReader(hints)
    controls = await reader.decodeFromConstraints(
      // Sin width/height el navegador entrega su default de 640x480, que no da
      // los ~4 px por modulo que necesita un EAN-13: pedimos lo maximo que la
      // camara soporte. Son `ideal`, asi que degrada solo si no hay mas.
      {
        video: {
          facingMode: { ideal: 'environment' },
          width:  { ideal: 1920 },
          height: { ideal: 1080 },
        },
      },
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
/**
 * Panel de escaneo — identidad visual v2 (SCRUM-19).
 *
 * Los mensajes usan los colores semánticos de SCRUM-12: el permiso de cámara
 * denegado y el código inexistente salen en el rojo de estado, el duplicado en
 * el ámbar de vigilancia y el alta en el verde de éxito. Antes eran literales
 * (#fb7185 / #34d399) ajenos a la paleta.
 */

.scanner-overlay {
  position: fixed; inset: 0; z-index: var(--k-z-modal);
  background: var(--k-shade-1);
  display: flex; flex-direction: column;
}
.scanner-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: var(--k-border-width) solid var(--k-shade-6);
}
.scanner-title {
  font-family: var(--k-font-display); font-size: var(--k-font-size-heading-2);
  color: var(--k-color-text);
}
.scanner-close {
  background: none; border: none; color: var(--k-text-muted);
  font-size: var(--k-font-size-body-large); cursor: pointer;
  line-height: 1; padding: 4px;
  min-width: var(--k-target-min-size); min-height: var(--k-target-min-size);
  transition: var(--k-transition-ui);
}
.scanner-close:hover { color: var(--k-color-text); }

.scanner-viewport {
  position: relative; flex: 1; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  background: rgb(var(--k-color-black-rgb));
}
.scanner-video { width: 100%; height: 100%; object-fit: cover; }
.scanner-frame {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: min(72vw, 320px); height: min(40vw, 180px);
  border: 2px solid var(--k-color-primary); border-radius: var(--k-radius-md);
  box-shadow: 0 0 0 9999px rgba(var(--k-color-black-rgb), 0.45);
}

.scanner-footer {
  padding: 16px 20px 20px;
  border-top: var(--k-border-width) solid var(--k-shade-6);
}

/* Estados controlados: cada tono trae fondo, borde y texto propios, de modo
   que el mensaje se lee también sin distinguir el color (WCAG §9). */
.scanner-msg {
  margin: 0;
  text-align: center; padding: 10px 16px;
  font-family: var(--k-font-sans); font-size: var(--k-font-size-body-small);
  border: var(--k-border-width) solid transparent;
}
.scanner-msg.hint { color: var(--k-text-muted); }
.scanner-msg.ok {
  color: var(--k-alert-ok-text);
  background: var(--k-alert-ok-bg);
  border-color: var(--k-alert-ok-border);
}
.scanner-msg.warn {
  color: var(--k-alert-watching-text);
  background: var(--k-alert-watching-bg);
  border-color: var(--k-alert-watching-border);
}
.scanner-msg.err {
  color: var(--k-alert-critical-text);
  background: var(--k-alert-critical-bg);
  border-color: var(--k-alert-critical-border);
}
</style>
