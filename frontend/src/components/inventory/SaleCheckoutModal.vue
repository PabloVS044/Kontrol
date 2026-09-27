<template>
  <BaseModal v-model="show" :title="$t('inventory.checkout.title')" max-width="440px">
    <div class="checkout-body">
      <p class="checkout-hint">{{ subtitle }}</p>

      <div class="checkout-lines">
        <div
          v-for="item in items"
          :key="item.product.id_producto"
          class="checkout-line"
        >
          <span class="cl-qty">{{ item.cantidad }}×</span>
          <span class="cl-name">{{ item.product.nombre }}</span>
          <span class="cl-amount">${{ subtotal(item).toFixed(2) }}</span>
        </div>
      </div>

      <!-- Campo de descuento: solo si la empresa lo permite, y acotado a su
           tope. El backend vuelve a validarlo; esto evita que el cajero prometa
           un descuento que la venta va a rechazar. -->
      <label v-if="config.descuento_activo" class="checkout-discount">
        <span class="cd-label">{{ $t('inventory.checkout.discount') }}</span>
        <span class="cd-input-wrap">
          <input
            :value="discountPercent"
            type="number"
            class="cd-input"
            min="0"
            :max="config.descuento_max_pct"
            step="1"
            :disabled="submitting"
            @input="onDiscountInput"
          />
          <span class="cd-suffix">%</span>
        </span>
        <span class="cd-max">{{ $t('inventory.checkout.discountMax', { max: config.descuento_max_pct }) }}</span>
      </label>

      <!-- Desglose: se enseña lo que compone el total en vez de una sola cifra.
           Las líneas de descuento e IVA solo aparecen si suman algo. -->
      <div class="checkout-breakdown">
        <div class="cb-row">
          <span class="cb-label">{{ $t('inventory.checkout.subtotal') }}</span>
          <span class="cb-value">${{ breakdown.subtotal.toFixed(2) }}</span>
        </div>
        <div v-if="breakdown.discount > 0" class="cb-row cb-row--minus">
          <span class="cb-label">
            {{ $t('inventory.checkout.discountLine', { pct: discountPercent }) }}
          </span>
          <span class="cb-value">−${{ breakdown.discount.toFixed(2) }}</span>
        </div>
        <div v-if="breakdown.tax > 0" class="cb-row">
          <span class="cb-label">
            {{ $t('inventory.checkout.vatLine', { pct: vatPercentLabel }) }}
          </span>
          <span class="cb-value">${{ breakdown.tax.toFixed(2) }}</span>
        </div>
      </div>

      <div class="checkout-total">
        <span class="ct-label">{{ $t('inventory.checkout.total') }}</span>
        <span class="ct-value">${{ breakdown.total.toFixed(2) }}</span>
      </div>

      <p v-if="error" class="checkout-error">{{ error }}</p>

      <div class="modal-actions">
        <Button
          class="btn-cancel"
          :label="$t('inventory.checkout.back')"
          :disabled="submitting"
          back-color="var(--k-shade-3)"
          hover-back="var(--k-shade-4)"
          @click="show = false"
        />
        <Button
          class="btn-confirm"
          data-birdie="sale-confirm"
          :label="submitting ? $t('inventory.checkout.confirming') : $t('inventory.checkout.confirm')"
          :disabled="submitting || !items.length"
          back-color="var(--k-color-primary)"
          hover-back="var(--k-color-primary-2)"
          @click="$emit('confirm')"
        />
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { computed } from 'vue'
import BaseModal from '@/components/UI/Modal/BaseModal.vue'
import Button from '@/components/UI/Button/Button.vue'
import { lineTotal, calcSale } from '@/utils/sales.js'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  items:      { type: Array, default: () => [] },
  subtitle:   { type: String, default: '' },
  error:      { type: String, default: null },
  submitting: { type: Boolean, default: false },
  /**
   * Configuración de venta de la empresa, tal como la devuelve
   * `GET /api/companies/sale-config`. Decide si se pide descuento y qué IVA se
   * pinta; el cálculo que se cobra lo hace el servidor de todos modos.
   */
  config: {
    type: Object,
    default: () => ({ iva_activo: false, iva_tasa: 0, descuento_activo: false, descuento_max_pct: 0 }),
  },
  discountPercent: { type: Number, default: 0 },
})

const emit = defineEmits(['update:modelValue', 'confirm', 'update:discountPercent'])

const show = computed({
  get: () => props.modelValue,
  // Mientras la venta está en vuelo el diálogo no se cierra: cerrarlo dejaría
  // al cajero sin saber si el movimiento llegó a registrarse.
  set: (v) => { if (!props.submitting) emit('update:modelValue', v) },
})

// Mismo cálculo que el carrito y que el total: `utils/sales.js`.
function subtotal(item) {
  return lineTotal(item)
}

/**
 * Desglose para mostrar. Lo definitivo lo calcula y persiste el backend —esta
 * vista solo lo anticipa—, y `utils/sales.js` comparte con él los vectores de
 * `shared/test-vectors/`, así que las dos cifras no pueden separarse.
 */
const breakdown = computed(() =>
  calcSale(props.items, {
    discountPercent: props.config.descuento_activo ? props.discountPercent : 0,
    taxRate: props.config.iva_activo ? Number(props.config.iva_tasa) : 0,
  })
)

/** La tasa se guarda como fracción; en el ticket se lee en porcentaje. */
const vatPercentLabel = computed(() =>
  Math.round(Number(props.config.iva_tasa) * 10000) / 100
)

function onDiscountInput(e) {
  const max = Number(props.config.descuento_max_pct) || 0
  let next = Math.floor(Number(e.target.value))
  if (!Number.isFinite(next) || next < 0) next = 0
  // Se recorta al tope al escribirlo: dejar pasar un 50 y que el servidor lo
  // rechace al confirmar descubre el problema con el cliente ya esperando.
  if (next > max) next = max
  emit('update:discountPercent', next)
  if (next !== Number(e.target.value)) e.target.value = next
}
</script>

<style scoped>
/**
 * Modal de cobro — identidad visual v2 (SCRUM-19).
 *
 * Reutiliza el diálogo y el botón migrados en SCRUM-14; aquí solo vive el
 * resumen de la venta. El total repite el tratamiento del carrito (display
 * serif, tabular) para que el cajero reconozca la misma cifra que acaba de
 * ver en el panel.
 */

.checkout-body {
  padding: 24px;
  display: flex; flex-direction: column; gap: 16px;
}

.checkout-hint {
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-text-muted);
  margin: 0;
}

.checkout-lines {
  display: flex; flex-direction: column;
  border: var(--k-border-width) solid var(--k-shade-6);
  max-height: 40vh; overflow-y: auto;
}
.checkout-line {
  display: flex; align-items: baseline; gap: 12px;
  padding: 10px 14px;
  background: var(--k-shade-1);
}
.checkout-line + .checkout-line { border-top: var(--k-border-width) solid var(--k-shade-6); }

.cl-qty {
  flex: 0 0 auto; min-width: 32px;
  font-family: var(--k-font-display); font-size: var(--k-font-size-body-large);
  color: var(--k-color-primary); font-variant-numeric: tabular-nums;
}
.cl-name {
  flex: 1; min-width: 0;
  font-size: var(--k-font-size-body-small); color: var(--k-color-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.cl-amount {
  flex: 0 0 auto;
  font-size: var(--k-font-size-body-small); color: var(--k-text-soft);
  font-variant-numeric: tabular-nums;
}

/* ── descuento en caja ── */
.checkout-discount {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--k-space-2) var(--k-space-3);
  padding: var(--k-space-3) 0;
  border-top: var(--k-border-width) solid var(--k-shade-6);
}
.cd-label {
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-text-soft);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.cd-input-wrap { display: flex; align-items: stretch; margin-left: auto; }
.cd-input {
  width: 72px;
  min-height: var(--k-target-min-size);
  padding: 0 var(--k-space-2);
  background: var(--k-form-input-bg);
  border: var(--k-border-width) solid var(--k-shade-7);
  border-right: none;
  color: var(--k-color-text);
  font-family: var(--k-font-mono);
  font-size: var(--k-font-size-body-main);
  text-align: right;
}
.cd-input:focus {
  outline: none;
  background: var(--k-form-input-focus-bg);
  border-color: var(--k-color-primary);
}
.cd-suffix {
  display: flex;
  align-items: center;
  padding: 0 var(--k-space-2);
  background: var(--k-shade-4);
  border: var(--k-border-width) solid var(--k-shade-7);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-text-muted);
}
.cd-max {
  flex-basis: 100%;
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption);
  color: var(--k-text-dim);
}

/* ── desglose ── */
.checkout-breakdown {
  display: flex;
  flex-direction: column;
  gap: var(--k-space-2);
  padding: var(--k-space-3) 0;
  border-top: var(--k-border-width) solid var(--k-shade-6);
}
.cb-row { display: flex; align-items: baseline; justify-content: space-between; gap: var(--k-space-3); }
.cb-label {
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-text-muted);
}
.cb-value {
  font-family: var(--k-font-mono);
  font-size: var(--k-font-size-body-small);
  color: var(--k-text-soft);
}
/* El descuento resta: se marca en el color de la marca para que no se lea como
   un cargo más. */
.cb-row--minus .cb-value { color: var(--k-color-primary); }

.checkout-total {
  display: flex; align-items: baseline; justify-content: space-between;
  padding-top: 16px; border-top: var(--k-border-width) solid var(--k-shade-6);
}
.ct-label {
  font-size: var(--k-font-size-caption); color: var(--k-color-primary);
  text-transform: uppercase; letter-spacing: var(--k-tracking-caps);
}
.ct-value {
  font-family: var(--k-font-display); font-size: var(--k-font-size-display-2);
  color: var(--k-color-text); line-height: 1; font-variant-numeric: tabular-nums;
}

.checkout-error {
  margin: 0;
  font-family: var(--k-font-sans); font-size: var(--k-font-size-caption-lg);
  color: var(--k-alert-critical-text);
  background: var(--k-alert-critical-bg);
  border: var(--k-border-width) solid var(--k-alert-critical-border);
  padding: 10px 12px;
}

.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
.modal-actions .btn {
  border-radius: 0;
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  font-weight: var(--k-font-weight-semibold);
  letter-spacing: var(--k-tracking-caps); text-transform: uppercase;
  padding: 12px 20px;
}
.modal-actions .btn-cancel {
  border: var(--k-border-width) solid var(--k-shade-6);
  color: var(--k-color-text);
}
.modal-actions .btn-confirm { color: var(--k-form-btn-text); }
</style>
