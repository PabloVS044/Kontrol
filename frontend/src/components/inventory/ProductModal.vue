<template>
  <BaseModal v-model="show" :title="$t('inventory.modal.title')" max-width="480px">
    <form class="modal-form" @submit.prevent="handleSubmit">
      <div class="form-field">
        <label>{{ $t('inventory.modal.name') }} <span class="req">*</span></label>
        <input v-model="form.nombre" type="text" :placeholder="$t('inventory.modal.namePlaceholder')" required />
      </div>

      <div class="form-field">
        <label>{{ $t('inventory.modal.description') }}</label>
        <textarea v-model="form.descripcion" :placeholder="$t('inventory.modal.descriptionPlaceholder')" rows="2"></textarea>
      </div>

      <div class="form-field">
        <label>{{ $t('inventory.modal.barcode') }}</label>
        <div class="barcode-row">
          <input v-model="form.codigo_barras" type="text" :placeholder="$t('inventory.modal.barcodePlaceholder')" />
          <button type="button" class="barcode-scan" :title="$t('inventory.scanner.scan')" @click="showScanner = true">
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M2 5V3a1 1 0 0 1 1-1h2M16 5V3a1 1 0 0 0-1-1h-2M2 13v2a1 1 0 0 0 1 1h2M16 13v2a1 1 0 0 1-1 1h-2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
              <path d="M4.5 6v6M7 6v6M9.5 6v6M12 6v6M13.5 6v6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      <BarcodeScanner v-model="showScanner" @detected="onBarcodeDetected" />

      <div class="form-row">
        <div class="form-field">
          <label>{{ $t('inventory.modal.salePrice') }} <span class="req">*</span></label>
          <input v-model.number="form.precio_venta" type="number" min="0" step="0.01" placeholder="0.00" required />
        </div>
        <div class="form-field">
          <label>{{ $t('inventory.modal.minStock') }}</label>
          <input v-model.number="form.stock_minimo" type="number" min="0" placeholder="0" />
        </div>
      </div>

      <!-- Costo y stock inicial: por unidad o por caja -->
      <div class="form-field">
        <label>{{ $t('inventory.modal.costAndStock') }}</label>
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
            <label>{{ $t('inventory.modal.initialStock') }}</label>
            <input v-model.number="form.stock_inicial" type="number" min="0" placeholder="0" />
          </div>
          <div class="form-field">
            <label>{{ $t('inventory.modal.costPrice') }} <span class="req">*</span></label>
            <input v-model.number="form.precio_costo" type="number" min="0" step="0.01" placeholder="0.00" />
          </div>
        </div>
      </template>

      <template v-else>
        <div class="form-row">
          <div class="form-field">
            <label>{{ $t('inventory.modal.boxes') }}</label>
            <input v-model.number="form.cajas" type="number" min="0" placeholder="0" />
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

      <p v-if="error" class="modal-error">{{ error }}</p>

      <div class="modal-actions">
        <button type="button" class="btn-secondary" @click="show = false">{{ $t('inventory.modal.cancel') }}</button>
        <button type="submit" class="btn-primary" :disabled="submitting || !canSubmit">
          {{ submitting ? $t('inventory.modal.saving') : $t('inventory.modal.save') }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import BaseModal from '@/components/UI/Modal/BaseModal.vue'
import BarcodeScanner from '@/components/inventory/BarcodeScanner.vue'
import { resolveStockEntry } from '@/utils/boxPricing'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
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
    nombre: '', descripcion: '', codigo_barras: '',
    precio_venta: null, precio_costo: null,
    stock_minimo: 0, stock_inicial: 0,
    modo: 'unidad',
    cajas: null, unidades_por_caja: null, precio_caja: null,
  }
}

const form = ref(emptyForm())
const showScanner = ref(false)

function onBarcodeDetected(code) {
  form.value.codigo_barras = code
  showScanner.value = false
}

watch(() => props.modelValue, (open) => {
  if (open) form.value = emptyForm()
})

// Live resolution of units + per-unit cost from the box inputs.
const resolved = computed(() =>
  resolveStockEntry({
    modo: form.value.modo,
    unidades: form.value.stock_inicial,
    precioUnitario: form.value.precio_costo,
    cajas: form.value.cajas,
    unidadesPorCaja: form.value.unidades_por_caja,
    precioCaja: form.value.precio_caja,
  })
)

const canSubmit = computed(() => {
  if (!form.value.nombre || form.value.precio_venta == null) return false
  if (form.value.modo === 'caja') {
    return resolved.value.cantidad != null && resolved.value.costoUnitario != null
  }
  return form.value.precio_costo != null && form.value.precio_costo >= 0
})

function handleSubmit() {
  if (!canSubmit.value) return
  const isBox = form.value.modo === 'caja'
  emit('submit', {
    nombre: form.value.nombre,
    descripcion: form.value.descripcion,
    precio_venta: form.value.precio_venta,
    precio_costo: isBox ? resolved.value.costoUnitario : form.value.precio_costo,
    stock_minimo: form.value.stock_minimo ?? 0,
    stock_inicial: isBox ? resolved.value.cantidad : (form.value.stock_inicial ?? 0),
    codigo_barras: form.value.codigo_barras?.trim() || undefined,
  })
}
</script>

<style scoped>
.modal-form { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.form-field  { display: flex; flex-direction: column; gap: 6px; }
.form-row    { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-field label { font-size: 11px; color: var(--TextMuted); letter-spacing: 0.05em; font-family: 'Manrope', sans-serif; }
.form-field input,
.form-field textarea,
.form-field select {
  background: #0a0a0a; border: 1px solid #1f1f1f;
  color: var(--Text); font-family: 'Manrope', sans-serif; font-size: 13px;
  padding: 10px 12px; outline: none; resize: vertical;
  transition: border-color 0.15s;
}
.form-field input:focus,
.form-field textarea:focus { border-color: #caa860; }
.req { color: var(--Primary); }
.modal-error   { font-size: 12px; color: #fb7185; font-family: 'Manrope', sans-serif; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }

/* Unit / box mode toggle */
.mode-toggle { display: flex; border: 1px solid #1f1f1f; }
.mode-btn {
  flex: 1; padding: 9px 12px; background: #0a0a0a; border: none; cursor: pointer;
  font-family: 'Manrope', sans-serif; font-size: 12px; font-weight: 600; color: var(--TextMuted);
  transition: background 0.15s, color 0.15s;
}
.mode-btn + .mode-btn { border-left: 1px solid #1f1f1f; }
.mode-btn.active { background: #caa860; color: var(--BtnText); }
.box-preview {
  font-size: 12px; color: var(--Primary); font-family: 'Manrope', sans-serif;
  background: rgba(202,168,96,0.08); border: 1px solid rgba(202,168,96,0.2);
  padding: 8px 12px;
}

.barcode-row { display: flex; gap: 8px; }
.barcode-row input { flex: 1; }
.barcode-scan {
  flex: 0 0 auto; width: 42px; background: #0a0a0a; border: 1px solid #1f1f1f;
  color: var(--TextMuted); cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: border-color .15s, color .15s;
}
.barcode-scan:hover { border-color: #caa860; color: var(--Primary); }

.btn-primary {
  background: #caa860; border: none; padding: 10px 18px; cursor: pointer;
  font-family: 'Manrope', sans-serif; font-size: 12px; font-weight: 600;
  color: var(--BtnText); transition: filter 0.15s;
}
.btn-primary:hover    { filter: brightness(1.1); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary {
  background: #111111; border: 1px solid #1f1f1f; color: var(--Text);
  font-family: 'Manrope', sans-serif; font-size: 12px; padding: 10px 18px;
  cursor: pointer; transition: border-color 0.15s;
}
.btn-secondary:hover { border-color: #333; }
</style>
