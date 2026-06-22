<template>
  <BaseModal v-model="show" :title="$t('inventory.restock.title')" max-width="480px">
    <form class="modal-form" @submit.prevent="handleSubmit">
      <div v-if="product" class="restock-product">
        <span class="rp-name">{{ product.nombre }}</span>
        <span class="rp-meta">
          {{ $t('inventory.restock.currentStock', { count: product.stock_actual }) }}
          · {{ $t('inventory.restock.avgCost', { cost: Number(product.costo_promedio_ponderado ?? product.precio_costo ?? 0).toFixed(2) }) }}
        </span>
      </div>

      <div class="form-field">
        <label>{{ $t('inventory.restock.entryMode') }}</label>
        <div class="mode-toggle">
          <button
            type="button"
            class="mode-btn"
            :class="{ active: form.modo === 'unidad' }"
            @click="form.modo = 'unidad'"
          >{{ $t('inventory.modal.stockMode.unit') }}</button>
          <button
            type="button"
            class="mode-btn"
            :class="{ active: form.modo === 'caja' }"
            @click="form.modo = 'caja'"
          >{{ $t('inventory.modal.stockMode.box') }}</button>
        </div>
      </div>

      <template v-if="form.modo === 'unidad'">
        <div class="form-row">
          <div class="form-field">
            <label>{{ $t('inventory.restock.units') }} <span class="req">*</span></label>
            <input v-model.number="form.unidades" type="number" min="1" placeholder="0" />
          </div>
          <div class="form-field">
            <label>{{ $t('inventory.restock.unitCost') }} <span class="req">*</span></label>
            <input v-model.number="form.precio_unitario" type="number" min="0" step="0.01" placeholder="0.00" />
          </div>
        </div>
      </template>

      <template v-else>
        <div class="form-row">
          <div class="form-field">
            <label>{{ $t('inventory.modal.boxes') }} <span class="req">*</span></label>
            <input v-model.number="form.cajas" type="number" min="1" placeholder="0" />
          </div>
          <div class="form-field">
            <label>{{ $t('inventory.modal.unitsPerBox') }} <span class="req">*</span></label>
            <input v-model.number="form.unidades_por_caja" type="number" min="1" placeholder="0" />
          </div>
        </div>
        <div class="form-field">
          <label>{{ $t('inventory.modal.boxPrice') }} <span class="req">*</span></label>
          <input v-model.number="form.precio_caja" type="number" min="0" step="0.01" placeholder="0.00" />
        </div>
        <p v-if="resolved.cantidad" class="box-preview">
          {{ $t('inventory.modal.boxPreview', { units: resolved.cantidad, cost: resolved.costoUnitario.toFixed(2) }) }}
        </p>
      </template>

      <div class="form-field">
        <label>{{ $t('inventory.restock.reason') }}</label>
        <input v-model="form.motivo" type="text" :placeholder="$t('inventory.restock.reasonPlaceholder')" />
      </div>

      <p v-if="error" class="modal-error">{{ error }}</p>

      <div class="modal-actions">
        <button type="button" class="btn-secondary" @click="show = false">{{ $t('inventory.modal.cancel') }}</button>
        <button type="submit" class="btn-primary" :disabled="submitting || !canSubmit">
          {{ submitting ? $t('inventory.restock.saving') : $t('inventory.restock.save') }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import BaseModal from '@/components/UI/Modal/BaseModal.vue'
import { resolveStockEntry } from '@/utils/boxPricing'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  product:    { type: Object, default: null },
  submitting: { type: Boolean, default: false },
  error:      { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'submit'])

const show = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

function emptyForm() {
  return {
    modo: 'unidad',
    unidades: null, precio_unitario: null,
    cajas: null, unidades_por_caja: null, precio_caja: null,
    motivo: '',
  }
}

const form = ref(emptyForm())

watch(() => props.modelValue, (open) => {
  if (open) form.value = emptyForm()
})

const resolved = computed(() =>
  resolveStockEntry({
    modo: form.value.modo,
    unidades: form.value.unidades,
    precioUnitario: form.value.precio_unitario,
    cajas: form.value.cajas,
    unidadesPorCaja: form.value.unidades_por_caja,
    precioCaja: form.value.precio_caja,
  })
)

const canSubmit = computed(() =>
  resolved.value.cantidad != null && resolved.value.costoUnitario != null
)

function handleSubmit() {
  if (!canSubmit.value) return
  emit('submit', {
    cantidad: resolved.value.cantidad,
    precio_unitario: resolved.value.costoUnitario,
    motivo: form.value.motivo?.trim() || undefined,
  })
}
</script>

<style scoped>
.modal-form { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.form-field  { display: flex; flex-direction: column; gap: 6px; }
.form-row    { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-field label { font-size: 11px; color: #888; letter-spacing: 0.05em; font-family: 'Manrope', sans-serif; }
.form-field input {
  background: #0a0a0a; border: 1px solid #1f1f1f;
  color: #faf8f5; font-family: 'Manrope', sans-serif; font-size: 13px;
  padding: 10px 12px; outline: none;
  transition: border-color 0.15s;
}
.form-field input:focus { border-color: #c9a962; }
.req { color: #c9a962; }

.restock-product {
  display: flex; flex-direction: column; gap: 3px;
  border: 1px solid #1f1f1f; background: rgba(15,15,15,0.7); padding: 12px 14px;
}
.rp-name { font-family: 'Playfair Display', serif; font-size: 15px; color: #faf8f5; }
.rp-meta { font-size: 11px; color: #888; font-family: 'Manrope', sans-serif; }

.mode-toggle { display: flex; border: 1px solid #1f1f1f; }
.mode-btn {
  flex: 1; padding: 9px 12px; background: #0a0a0a; border: none; cursor: pointer;
  font-family: 'Manrope', sans-serif; font-size: 12px; font-weight: 600; color: #888;
  transition: background 0.15s, color 0.15s;
}
.mode-btn + .mode-btn { border-left: 1px solid #1f1f1f; }
.mode-btn.active { background: #c9a962; color: #0a0a0a; }

.box-preview {
  font-size: 12px; color: #c9a962; font-family: 'Manrope', sans-serif;
  background: rgba(201,169,98,0.08); border: 1px solid rgba(201,169,98,0.2);
  padding: 8px 12px;
}

.modal-error   { font-size: 12px; color: #fb7185; font-family: 'Manrope', sans-serif; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }

.btn-primary {
  background: #c9a962; border: none; padding: 10px 18px; cursor: pointer;
  font-family: 'Manrope', sans-serif; font-size: 12px; font-weight: 600;
  color: #0a0a0a; transition: filter 0.15s;
}
.btn-primary:hover    { filter: brightness(1.1); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary {
  background: #111111; border: 1px solid #1f1f1f; color: #faf8f5;
  font-family: 'Manrope', sans-serif; font-size: 12px; padding: 10px 18px;
  cursor: pointer; transition: border-color 0.15s;
}
.btn-secondary:hover { border-color: #333; }
</style>
