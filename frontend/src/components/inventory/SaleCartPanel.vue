<template>
  <div class="sale-cart-panel">
    <div>
      <div class="ctx-title">{{ $t('inventory.sale.title') }}</div>
      <div class="ctx-subtitle">{{ subtitle }}</div>
    </div>

    <div class="sale-items">
      <div
        v-for="item in items"
        :key="item.product.id_producto"
        class="sale-item"
      >
        <span class="sale-item-qty">{{ item.cantidad }}×</span>
        <div class="sale-item-info">
          <span class="sale-item-name">{{ item.product.nombre }}</span>
          <span class="sale-item-unit">${{ Number(item.product.precio_venta).toFixed(2) }} {{ $t('inventory.sale.perUnit') }}</span>
        </div>
        <div class="sale-item-right">
          <span class="sale-item-subtotal">${{ subtotal(item).toFixed(2) }}</span>
          <button class="sale-item-remove" :aria-label="$t('inventory.sale.remove')" @click="$emit('remove', item.product)">×</button>
        </div>
      </div>
    </div>

    <div class="sale-total-row">
      <span class="sale-total-label">{{ $t('inventory.sale.total') }}</span>
      <span class="sale-total-value">${{ total.toFixed(2) }}</span>
    </div>

    <p v-if="error" class="sale-error">{{ error }}</p>

    <button
      data-birdie="sale-submit"
      class="sale-submit"
      :disabled="submitting || !items.length"
      @click="$emit('submit')"
    >
      <span v-if="submitting">{{ $t('inventory.sale.submitting') }}</span>
      <span v-else>{{ $t('inventory.sale.submit') }}</span>
    </button>

    <button class="sale-cancel" :disabled="submitting" @click="$emit('cancel')">
      {{ $t('inventory.sale.cancel') }}
    </button>
  </div>
</template>

<script setup>
import { lineTotal } from '@/utils/sales.js'

defineProps({
  items:      { type: Array, default: () => [] },
  total:      { type: Number, default: 0 },
  subtitle:   { type: String, default: '' },
  error:      { type: String, default: null },
  submitting: { type: Boolean, default: false },
})

defineEmits(['remove', 'submit', 'cancel'])

// Mismo cálculo que usa el total del carrito y que cubren los tests de
// `utils/sales.js`: el panel no vuelve a multiplicar precio por cantidad.
function subtotal(item) {
  return lineTotal(item)
}
</script>

<style scoped>
/**
 * Identidad visual v2 (SCRUM-19). Estos estilos vivían sueltos en
 * `InventoryPage.css`, que se importa sin `scoped` y por tanto filtraba las
 * clases `.sale-*` a toda la aplicación. Ahora viven en el componente que las
 * usa, ya sobre tokens `--k-*`.
 */

.sale-cart-panel { display: flex; flex-direction: column; gap: 20px; }

.ctx-title {
  font-family: var(--k-font-display);
  font-size: var(--k-font-size-heading-2);
  color: var(--k-color-text);
}
.ctx-subtitle {
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-text-muted);
  margin-top: 4px;
}

.sale-items {
  display: flex; flex-direction: column; gap: 10px;
  max-height: 50vh; overflow-y: auto; padding-right: 4px;
}
.sale-item {
  display: flex; align-items: center; gap: 12px;
  border: var(--k-border-width) solid var(--k-shade-6);
  background: rgba(var(--k-color-black-rgb), 0.7);
  padding: 12px 14px;
}
.sale-item-qty {
  font-family: var(--k-font-display); font-size: var(--k-font-size-heading-2);
  color: var(--k-color-primary); min-width: 36px; text-align: left; line-height: 1;
}
.sale-item-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.sale-item-name {
  font-size: var(--k-font-size-body-small); font-weight: var(--k-font-weight-medium);
  color: var(--k-color-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.sale-item-unit { font-size: var(--k-font-size-caption); color: var(--k-text-dim); }
.sale-item-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.sale-item-subtotal {
  font-family: var(--k-font-display); font-size: var(--k-font-size-body-large);
  color: var(--k-color-text);
}
.sale-item-remove {
  background: transparent; border: none; cursor: pointer;
  font-size: var(--k-font-size-body-main); color: var(--k-text-faint);
  line-height: 1; padding: 0;
  transition: var(--k-transition-ui);
}
.sale-item-remove:hover { color: var(--k-state-error-text); }

.sale-total-row {
  display: flex; align-items: baseline; justify-content: space-between;
  padding-top: 16px; border-top: var(--k-border-width) solid var(--k-shade-6);
}
.sale-total-label {
  font-size: var(--k-font-size-caption); color: var(--k-color-primary);
  text-transform: uppercase; letter-spacing: var(--k-tracking-caps);
}
.sale-total-value {
  font-family: var(--k-font-display); font-size: var(--k-font-size-display-2);
  color: var(--k-color-text); line-height: 1;
}

.sale-error { font-size: var(--k-font-size-caption-lg); color: var(--k-state-error-text); }

.sale-submit {
  width: 100%; background: var(--k-color-primary); color: var(--k-form-btn-text);
  border: none; cursor: pointer;
  padding: 14px 16px; font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg); font-weight: var(--k-font-weight-semibold);
  letter-spacing: var(--k-tracking-caps); text-transform: uppercase;
  min-height: var(--k-target-min-size);
  transition: var(--k-transition-ui);
}
.sale-submit:hover:not(:disabled) { filter: brightness(var(--k-state-hover-brightness)); }
.sale-submit:disabled { opacity: 0.55; cursor: not-allowed; }

.sale-cancel {
  width: 100%; background: transparent; color: var(--k-text-muted);
  border: var(--k-border-width) solid var(--k-shade-6); cursor: pointer;
  padding: 10px 16px; font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption); font-weight: var(--k-font-weight-medium);
  letter-spacing: 0.06em; text-transform: uppercase;
  transition: var(--k-transition-ui);
}
.sale-cancel:hover:not(:disabled) { color: var(--k-color-text); border-color: var(--k-shade-7); }
.sale-cancel:disabled { opacity: 0.55; cursor: not-allowed; }
</style>
