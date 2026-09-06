<template>
  <BaseModal v-model="show" :title="$t('inventory.modal.title')" max-width="480px">
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
        <FormField :label="$t('inventory.modal.minStock')">
          <input v-model.number="form.stock_minimo" type="number" min="0" placeholder="0" />
        </FormField>
      </div>

      <!-- Costo y stock inicial: por unidad o por caja -->
      <FormField :label="$t('inventory.modal.costAndStock')">
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
      </FormField>

      <template v-if="form.modo === 'unidad'">
        <div class="form-row">
          <FormField :label="$t('inventory.modal.initialStock')">
            <input v-model.number="form.stock_inicial" type="number" min="0" placeholder="0" />
          </FormField>
          <FormField :label="$t('inventory.modal.costPrice')" :required="true" :error="costError">
            <input v-model.number="form.precio_costo" type="number" min="0" step="0.01" placeholder="0.00" />
          </FormField>
        </div>
      </template>

      <template v-else>
        <div class="form-row">
          <FormField :label="$t('inventory.modal.boxes')">
            <input v-model.number="form.cajas" type="number" min="0" placeholder="0" />
          </FormField>
          <FormField :label="$t('inventory.modal.unitsPerBox')" :required="true">
            <input v-model.number="form.unidades_por_caja" type="number" min="1" placeholder="0" />
          </FormField>
        </div>
        <FormField :label="$t('inventory.modal.boxPrice')" :required="true" :error="costError">
          <input v-model.number="form.precio_caja" type="number" min="0" step="0.01" placeholder="0.00" />
        </FormField>
        <p v-if="resolved.cantidad" class="box-preview">
          {{ $t('inventory.modal.boxPreview', { units: resolved.cantidad, cost: resolved.costoUnitario.toFixed(2) }) }}
        </p>
      </template>

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
          :label="submitting ? $t('inventory.modal.saving') : $t('inventory.modal.save')"
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
import { resolveStockEntry } from '@/utils/boxPricing'

const { t } = useI18n()

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

/**
 * Costo por unidad, venga escrito directamente o resuelto desde el precio por
 * caja. Es el valor que se guarda y contra el que se compara el precio de
 * venta, así que el modo "por caja" queda cubierto por la misma regla.
 */
const unitCost = computed(() =>
  form.value.modo === 'caja' ? resolved.value.costoUnitario : form.value.precio_costo
)

// Un producto que cuesta más de lo que se vende nace con margen negativo: cada
// venta se registraría como pérdida. El backend lo rechaza igualmente; aquí se
// avisa antes de enviar y sobre el campo que hay que corregir.
const costExceedsPrice = computed(() => {
  const costo = Number(unitCost.value)
  const venta = Number(form.value.precio_venta)
  if (!Number.isFinite(costo) || !Number.isFinite(venta)) return false
  return costo > venta
})

const costError = computed(() =>
  costExceedsPrice.value ? t('inventory.modal.errors.costOverPrice') : ''
)

const canSubmit = computed(() => {
  if (!form.value.nombre || form.value.precio_venta == null) return false
  if (costExceedsPrice.value) return false
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
/**
 * Identidad visual v2 (SCRUM-19): etiquetas y errores los aporta `FormField`
 * (SCRUM-14); aquí solo queda el estilo de los controles, ya sobre tokens.
 */

.modal-form { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.form-row    { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.modal-form input,
.modal-form textarea,
.modal-form select {
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

.modal-error   { font-size: var(--k-font-size-caption-lg); color: var(--k-state-error-text); font-family: var(--k-font-sans); }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }

/* Unit / box mode toggle */
.mode-toggle { display: flex; border: var(--k-border-width) solid var(--k-shade-6); }
.mode-btn {
  flex: 1; padding: 9px 12px; background: var(--k-shade-1); border: none; cursor: pointer;
  font-family: var(--k-font-sans); font-size: var(--k-font-size-caption-lg);
  font-weight: var(--k-font-weight-semibold); color: var(--k-text-muted);
  transition: var(--k-transition-ui);
}
.mode-btn + .mode-btn { border-left: var(--k-border-width) solid var(--k-shade-6); }
.mode-btn.active { background: var(--k-color-primary); color: var(--k-form-btn-text); }

.box-preview {
  font-size: var(--k-font-size-caption-lg); color: var(--k-alert-watching-text);
  font-family: var(--k-font-sans);
  background: var(--k-alert-watching-bg);
  border: var(--k-border-width) solid var(--k-alert-watching-border);
  padding: 8px 12px;
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

/* El color de fondo se pasa por props (`back-color`/`hover-back`) para no
   pelear con el hover del componente. Aquí solo queda lo que el POS impone:
   esquina viva —igual que el resto de pantallas ya migradas— y tipografía. */
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
