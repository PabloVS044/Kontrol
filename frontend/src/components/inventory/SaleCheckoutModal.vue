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

      <div class="checkout-total">
        <span class="ct-label">{{ $t('inventory.checkout.total') }}</span>
        <span class="ct-value">${{ total.toFixed(2) }}</span>
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
import { lineTotal } from '@/utils/sales.js'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  items:      { type: Array, default: () => [] },
  total:      { type: Number, default: 0 },
  subtitle:   { type: String, default: '' },
  error:      { type: String, default: null },
  submitting: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'confirm'])

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
