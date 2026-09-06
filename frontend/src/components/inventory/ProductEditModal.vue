<template>
  <BaseModal v-model="show" :title="$t('inventory.edit.title')" max-width="480px">
    <form class="modal-form" @submit.prevent="handleSubmit">
      <FormField :label="$t('inventory.modal.name')" :required="true">
        <input v-model="form.nombre" type="text" :placeholder="$t('inventory.modal.namePlaceholder')" required />
      </FormField>

      <FormField :label="$t('inventory.modal.description')">
        <textarea v-model="form.descripcion" :placeholder="$t('inventory.modal.descriptionPlaceholder')" rows="2"></textarea>
      </FormField>

      <FormField :label="$t('inventory.modal.barcode')">
        <div class="barcode-row">
          <input v-model="form.codigo_barras" type="text" :placeholder="$t('inventory.modal.barcodePlaceholder')" />
          <button type="button" class="barcode-scan" :title="$t('inventory.scanner.scan')" @click="showScanner = true">
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M2 5V3a1 1 0 0 1 1-1h2M16 5V3a1 1 0 0 0-1-1h-2M2 13v2a1 1 0 0 0 1 1h2M16 13v2a1 1 0 0 1-1 1h-2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
              <path d="M4.5 6v6M7 6v6M9.5 6v6M12 6v6M13.5 6v6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </FormField>

      <BarcodeScanner v-model="showScanner" @detected="onBarcodeDetected" />

      <div class="form-row">
        <FormField :label="$t('inventory.modal.salePrice')" :required="true">
          <input v-model.number="form.precio_venta" type="number" min="0" step="0.01" placeholder="0.00" required />
        </FormField>
        <FormField :label="$t('inventory.modal.costPrice')" :required="true" :error="costError">
          <input v-model.number="form.precio_costo" type="number" min="0" step="0.01" placeholder="0.00" required />
        </FormField>
      </div>

      <FormField :label="$t('inventory.modal.minStock')">
        <input v-model.number="form.stock_minimo" type="number" min="0" placeholder="0" />
      </FormField>

      <!-- El stock actual no se edita aquí: se mueve con ENTRADA/SALIDA para que
           el historial de movimientos siga cuadrando con la existencia. -->
      <p class="edit-note">{{ $t('inventory.edit.stockNote') }}</p>

      <p v-if="error" class="modal-error">{{ error }}</p>

      <div class="modal-actions">
        <Button
          class="btn-cancel"
          :label="$t('inventory.modal.cancel')"
          back-color="var(--k-shade-3)"
          hover-back="var(--k-shade-4)"
          @click="show = false"
        />
        <Button
          class="btn-save"
          type="submit"
          :label="submitting ? $t('inventory.edit.saving') : $t('inventory.edit.save')"
          :disabled="submitting || !canSubmit"
          back-color="var(--k-color-primary)"
          hover-back="var(--k-color-primary-2)"
        />
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseModal from '@/components/UI/Modal/BaseModal.vue'
import Button from '@/components/UI/Button/Button.vue'
import FormField from '@/components/common/FormField.vue'
import BarcodeScanner from '@/components/inventory/BarcodeScanner.vue'

const { t } = useI18n()

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

// Solo los campos que `updateProduct` acepta. El proyecto y el stock actual no
// están: el primero no se puede mover, el segundo se ajusta con movimientos.
function formFromProduct(p) {
  return {
    nombre:        p?.nombre ?? '',
    descripcion:   p?.descripcion ?? '',
    codigo_barras: p?.codigo_barras ?? '',
    precio_venta:  p?.precio_venta != null ? Number(p.precio_venta) : null,
    precio_costo:  p?.precio_costo != null ? Number(p.precio_costo) : null,
    stock_minimo:  p?.stock_minimo != null ? Number(p.stock_minimo) : 0,
  }
}

const form = ref(formFromProduct(null))
const showScanner = ref(false)

function onBarcodeDetected(code) {
  form.value.codigo_barras = code
  showScanner.value = false
}

// Al abrir se recarga desde el producto: si se cerró a medias, la próxima vez
// se ve lo que hay guardado y no el borrador abandonado.
watch(() => props.modelValue, (open) => {
  if (open) form.value = formFromProduct(props.product)
})

const costExceedsPrice = computed(() => {
  const costo = Number(form.value.precio_costo)
  const venta = Number(form.value.precio_venta)
  if (!Number.isFinite(costo) || !Number.isFinite(venta)) return false
  return costo > venta
})

const costError = computed(() =>
  costExceedsPrice.value ? t('inventory.modal.errors.costOverPrice') : ''
)

const canSubmit = computed(() => {
  if (!form.value.nombre?.trim()) return false
  if (form.value.precio_venta == null || form.value.precio_costo == null) return false
  return !costExceedsPrice.value
})

function handleSubmit() {
  if (!canSubmit.value) return
  emit('submit', {
    nombre: form.value.nombre.trim(),
    // Vacío se manda como null, no como "": el esquema acepta null para
    // limpiar el campo, pero rechaza una cadena vacía.
    descripcion:   form.value.descripcion?.trim() || null,
    codigo_barras: form.value.codigo_barras?.trim() || null,
    precio_venta:  form.value.precio_venta,
    precio_costo:  form.value.precio_costo,
    stock_minimo:  form.value.stock_minimo ?? 0,
  })
}
</script>

<style scoped>
.modal-form { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.form-row    { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.modal-form input,
.modal-form textarea {
  background: var(--k-shade-1);
  border: var(--k-border-width) solid var(--k-shade-6);
  color: var(--k-color-text);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-small);
  padding: 10px 12px;
  outline: none;
  resize: vertical;
  transition: var(--k-transition-ui);
  width: 100%;
}
.modal-form input:focus,
.modal-form textarea:focus {
  border-color: var(--k-color-primary);
  background: var(--k-form-input-focus-bg);
}
.modal-form input::placeholder,
.modal-form textarea::placeholder { color: var(--k-text-placeholder); }

.edit-note {
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption);
  color: var(--k-text-dim);
  margin: 0;
}

.barcode-row { display: flex; gap: 8px; }
.barcode-row input { flex: 1; }
.barcode-scan {
  flex: 0 0 auto; width: 42px; background: var(--k-shade-1);
  border: var(--k-border-width) solid var(--k-shade-6);
  color: var(--k-text-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: var(--k-transition-ui);
}
.barcode-scan:hover { border-color: var(--k-color-primary); color: var(--k-color-primary); }

.modal-error {
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
  padding: 10px 20px;
}
.modal-actions .btn-cancel {
  border: var(--k-border-width) solid var(--k-shade-6);
  color: var(--k-color-text);
}
.modal-actions .btn-save { color: var(--k-form-btn-text); }
</style>
