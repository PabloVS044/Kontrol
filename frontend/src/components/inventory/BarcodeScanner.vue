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

      <!-- Confirmación del código leído. Sin esto, escanear metía la unidad en
           el carrito a ciegas y había que salir del escáner para comprobar qué
           se había añadido. -->
      <div v-if="pending" class="scan-confirm">
        <div class="sc-info">
          <span class="sc-name">{{ pending.product.nombre }}</span>
          <span class="sc-meta">
            ${{ Number(pending.product.precio_venta).toFixed(2) }}
            · {{ $t('inventory.scanner.available', { count: pending.max }) }}
            <template v-if="pending.inCart">
              · {{ $t('inventory.scanner.inCart', { count: pending.inCart }) }}
            </template>
          </span>
        </div>

        <div class="sc-qty">
          <button
            type="button"
            class="sc-step"
            :aria-label="$t('inventory.card.decrease')"
            :disabled="qty <= 1"
            @click="stepQty(-1)"
          >−</button>
          <input
            v-model.number="qty"
            class="sc-qty-input"
            type="number"
            inputmode="numeric"
            :min="1"
            :max="pending.max"
            :aria-label="$t('inventory.scanner.quantity')"
            @input="clampQty"
          />
          <button
            type="button"
            class="sc-step"
            :aria-label="$t('inventory.card.increase')"
            :disabled="qty >= pending.max"
            @click="stepQty(1)"
          >+</button>
        </div>

        <button type="button" class="sc-add" @click="confirmPending">
          {{ $t('inventory.scanner.add') }}
        </button>
        <button type="button" class="sc-discard" @click="$emit('cancel')">
          {{ $t('inventory.scanner.discard') }}
        </button>
      </div>
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
  /**
   * Producto leído a la espera de confirmación: `{ product, max, inCart }`.
   * Lo resuelve el padre, que es quien conoce el catálogo, el carrito y los
   * permisos; aquí solo se pinta y se elige la cantidad. Cuando es `null` el
   * panel es el de siempre, que es como lo usan los formularios de producto.
   */
  pending:    { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'detected', 'confirm', 'cancel'])

const videoEl     = ref(null)
const cameraError = ref(null)
const qty         = ref(1)

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

/** Cada lectura empieza en una unidad, nunca hereda la cantidad de la anterior. */
watch(() => props.pending, () => {
  qty.value = 1
})

function clampQty() {
  const max = props.pending?.max ?? 1
  let next = Math.floor(Number(qty.value))
  if (!Number.isFinite(next) || next < 1) next = 1
  if (next > max) next = max
  qty.value = next
}

function stepQty(delta) {
  qty.value = qty.value + delta
  clampQty()
}

function confirmPending() {
  if (!props.pending) return
  clampQty()
  emit('confirm', qty.value)
}

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
        // Mientras se confirma una lectura, el mismo código no vuelve a
        // dispararla: el producto sigue delante de la cámara mientras el
        // usuario ajusta la cantidad. Un código distinto sí la sustituye, que
        // es lo que se espera al haber escaneado el artículo equivocado.
        if (props.pending && text === lastCode) return
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
  position: relative; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  background: rgb(var(--k-color-black-rgb));
  /* `min-height: 0` es lo que deja encogerse al vídeo cuando aparece la tarjeta
     de confirmación. Sin él un hijo flex no baja de su tamaño de contenido y en
     móvil la tarjeta se salía por debajo de la pantalla. */
  flex: 1 1 auto; min-height: 96px;
}
.scanner-video { width: 100%; height: 100%; object-fit: cover; }
.scanner-frame {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: min(72vw, 320px); height: min(40vw, 180px);
  border: 2px solid var(--k-color-primary); border-radius: var(--k-radius-md);
  box-shadow: 0 0 0 9999px rgba(var(--k-color-black-rgb), 0.45);
}

.scanner-footer {
  flex: 0 0 auto;
  padding: 16px 20px 20px;
  border-top: var(--k-border-width) solid var(--k-shade-6);
  background: var(--k-shade-1);
  max-height: 65vh;
  overflow-y: auto;
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

/* ── Confirmación de la lectura ──────────────────────────────────────────── */

.scan-confirm {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  background: var(--k-shade-3);
  border: var(--k-border-width) solid var(--k-color-primary);
}

.sc-info { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.sc-name {
  font-family: var(--k-font-display);
  font-size: var(--k-font-size-body-large);
  color: var(--k-color-text);
  line-height: var(--k-leading-snug);
  /* Un nombre largo se parte en varias líneas en vez de ensanchar el panel. */
  overflow-wrap: anywhere;
}
.sc-meta {
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption);
  color: var(--k-text-muted);
}

.sc-qty {
  display: flex;
  align-items: stretch;
  border: var(--k-border-width) solid var(--k-shade-6);
  background: var(--k-shade-1);
}
.sc-step {
  flex: 0 0 52px;
  background: transparent;
  border: none;
  color: var(--k-color-primary);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-heading-2);
  font-weight: var(--k-font-weight-semibold);
  cursor: pointer;
  min-height: 52px;
  transition: var(--k-transition-ui);
}
.sc-step:hover:not(:disabled) { background: var(--k-surface-primary-tint); }
.sc-step:disabled { color: var(--k-text-faint); cursor: not-allowed; }

.sc-qty-input {
  flex: 1; min-width: 0;
  background: transparent;
  border: none;
  border-left: var(--k-border-width) solid var(--k-shade-6);
  border-right: var(--k-border-width) solid var(--k-shade-6);
  text-align: center;
  color: var(--k-color-text);
  font-family: var(--k-font-sans);
  /* 16px es el mínimo que evita que iOS haga zoom al enfocar el campo. */
  font-size: var(--k-font-size-body-large);
  font-weight: var(--k-font-weight-semibold);
  outline: none;
}
.sc-qty-input::-webkit-outer-spin-button,
.sc-qty-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.sc-qty-input { -moz-appearance: textfield; }

.sc-add {
  width: 100%;
  background: var(--k-color-primary);
  color: var(--k-form-btn-text);
  border: none;
  cursor: pointer;
  padding: 14px 16px;
  min-height: 52px;
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  font-weight: var(--k-font-weight-semibold);
  letter-spacing: var(--k-tracking-caps);
  text-transform: uppercase;
  transition: var(--k-transition-ui);
}
.sc-add:hover { filter: brightness(var(--k-state-hover-brightness)); }

.sc-discard {
  width: 100%;
  background: transparent;
  color: var(--k-text-muted);
  border: none;
  cursor: pointer;
  padding: 4px;
  min-height: var(--k-target-min-size);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  transition: var(--k-transition-ui);
}
.sc-discard:hover { color: var(--k-color-text); }

/* Móvil: la cámara cede sitio y los controles crecen para el pulgar. */
@media (max-width: 600px) {
  .scanner-footer { padding: 12px 14px 16px; max-height: 70vh; }
  .scan-confirm { padding: 12px; gap: 10px; }
  .sc-step { flex-basis: 60px; min-height: 56px; }
  .sc-add { min-height: 56px; }
}

/* Pantallas bajas (móvil apaisado): la tarjeta manda sobre el vídeo. */
@media (max-height: 520px) {
  .scanner-viewport { min-height: 72px; }
  .scanner-footer { max-height: 78vh; }
}
</style>
