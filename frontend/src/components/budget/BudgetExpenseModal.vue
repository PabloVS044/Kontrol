<template>
  <Teleport to="body">
    <div v-if="model" class="modal-overlay" @click.self="model = false">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">Register expense</span>
          <button class="modal-close" @click="model = false">x</button>
        </div>
        <form class="modal-form" @submit.prevent="$emit('submit')">
          <div class="form-field">
            <label>Activity name <span class="req">*</span></label>
            <input
              v-model="form.nombre_actividad"
              type="text"
              minlength="3"
              required
              placeholder="Existing activity or new one"
            />
            <p class="hint">If it exists, the amount is accumulated. Otherwise a new activity is created (planned = 0).</p>
          </div>
          <div class="form-field">
            <label>Amount <span class="req">*</span></label>
            <input v-model.number="form.monto_gasto" type="number" min="0" step="0.01" required />
          </div>
          <p v-if="error" class="modal-error">{{ error }}</p>
          <div class="modal-actions">
            <Button label="Cancel" type="button" @click="model = false" />
            <Button :label="loading ? 'Saving...' : 'Register'" type="submit" :disabled="loading" />
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import Button from '../UI/Button/Button.vue'

const model = defineModel({ type: Boolean, required: true })
const form = defineModel('form', { type: Object, required: true })

defineProps({
  loading: Boolean,
  error: String,
})

defineEmits(['submit'])
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: #000000;
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: #0f0f0f;
  border: 1px solid #1f1f1f;
  width: 100%;
  max-width: 460px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 22px;
  border-bottom: 1px solid #1a1a1a;
}

.modal-title {
  font-family: 'Playfair Display', serif;
  font-size: 19px;
  color: #faf8f5;
}

.modal-close {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
  padding: 0 6px;
}

.modal-form {
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-field label {
  font-size: 11px;
  letter-spacing: 0.05em;
  color: #c0c0c0;
}

.form-field input {
  background: #0a0a0a;
  border: 1px solid #1f1f1f;
  color: #faf8f5;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  padding: 10px 12px;
  outline: none;
}

.form-field input:focus { border-color: #caa860; }
.req { color: #caa860; }
.hint { font-size: 11px; color: #a8a8a8; line-height: 1.4; margin: 0; }
.modal-error { font-size: 12px; color: #fb7185; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
.modal-actions :deep(.btn) {
  border-radius: 0;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 600;
  padding: 10px 18px;
}
.modal-actions :deep(.btn:first-child) {
  background: #111111;
  border: 1px solid #1f1f1f;
  color: #faf8f5;
}
.modal-actions :deep(.btn:last-child) { background: #caa860; color: #0a0a0a; }
.modal-actions :deep(.btn:last-child:disabled) { opacity: 0.6; }
</style>
