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
defineProps({
  items:      { type: Array, default: () => [] },
  total:      { type: Number, default: 0 },
  subtitle:   { type: String, default: '' },
  error:      { type: String, default: null },
  submitting: { type: Boolean, default: false },
})

defineEmits(['remove', 'submit', 'cancel'])

function subtotal(item) {
  return Number(item.product.precio_venta) * Number(item.cantidad)
}
</script>

<style scoped>
.sale-cart-panel { display: flex; flex-direction: column; gap: 20px; }
/* Visual styling for .sale-* classes is provided globally by InventoryPage.css. */
</style>
