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

      <FormField :label="$t('inventory.restock.entryMode')">
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
          <FormField :label="$t('inventory.restock.units')" :required="true">
            <input v-model.number="form.unidades" type="number" min="1" placeholder="0" />
          </FormField>
          <FormField :label="$t('inventory.restock.unitCost')" :required="true">
            <input v-model.number="form.precio_unitario" type="number" min="0" step="0.01" placeholder="0.00" />
          </FormField>
        </div>
      </template>

      <template v-else>
        <div class="form-row">
          <FormField :label="$t('inventory.modal.boxes')" :required="true">
            <input v-model.number="form.cajas" type="number" min="1" placeholder="0" />
          </FormField>
          <FormField :label="$t('inventory.modal.unitsPerBox')" :required="true">
            <input v-model.number="form.unidades_por_caja" type="number" min="1" placeholder="0" />
          </FormField>
        </div>
        <FormField :label="$t('inventory.modal.boxPrice')" :required="true">
          <input v-model.number="form.precio_caja" type="number" min="0" step="0.01" placeholder="0.00" />
        </FormField>
        <p v-if="resolved.cantidad" class="box-preview">
          {{ $t('inventory.modal.boxPreview', { units: resolved.cantidad, cost: resolved.costoUnitario.toFixed(2) }) }}
        </p>
      </template>

      <FormField :label="$t('inventory.restock.reason')">
        <input v-model="form.motivo" type="text" :placeholder="$t('inventory.restock.reasonPlaceholder')" />
      </FormField>

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
          :label="submitting ? $t('inventory.restock.saving') : $t('inventory.restock.save')"
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
import BaseModal from '@/components/UI/Modal/BaseModal.vue'
import Button from '@/components/UI/Button/Button.vue'
import FormField from '@/components/common/FormField.vue'
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
/**
 * Identidad visual v2 (SCRUM-19): etiquetas y errores los aporta `FormField`
 * (SCRUM-14); aquí solo queda el estilo de los controles, ya sobre tokens.
 */

.modal-form { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.form-row    { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.modal-form input {
  background: var(--k-shade-1);
  border: var(--k-border-width) solid var(--k-shade-6);
  color: var(--k-color-text);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-small);
  padding: 10px 12px;
  outline: none;
  transition: var(--k-transition-ui);
  width: 100%;
}
.modal-form input:focus {
  border-color: var(--k-color-primary);
  background: var(--k-form-input-focus-bg);
}
.modal-form input::placeholder { color: var(--k-text-placeholder); }

.restock-product {
  display: flex; flex-direction: column; gap: 3px;
  border: var(--k-border-width) solid var(--k-shade-6);
  background: rgba(var(--k-color-black-rgb), 0.7); padding: 12px 14px;
}
.rp-name { font-family: var(--k-font-display); font-size: var(--k-font-size-body-large); color: var(--k-color-text); }
.rp-meta { font-size: var(--k-font-size-caption); color: var(--k-text-muted); font-family: var(--k-font-sans); }

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

.modal-error   { font-size: var(--k-font-size-caption-lg); color: var(--k-state-error-text); font-family: var(--k-font-sans); }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }

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
