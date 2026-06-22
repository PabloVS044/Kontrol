<template>
  <div class="form-field">
    <label v-if="label" class="field-label">
      {{ label }}
      <span v-if="required" class="req">*</span>
    </label>
    <slot />
    <p v-if="error" class="field-error">{{ error }}</p>
  </div>
</template>

<script setup>
defineProps({
  label: String,
  required: Boolean,
  error: String
})
</script>

<style scoped>
.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-size: 11px;
  color: #888;
  letter-spacing: 0.05em;
  font-family: 'Manrope', sans-serif;
}
.req {
  color: #caa860;
}
input,
textarea,
select {
  background: #0a0a0a;
  border: 1px solid #1f1f1f;
  color: #faf8f5;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  padding: 10px 12px;
  outline: none;
  border-radius: 2px;
  transition: border-color 0.15s;
}
input:focus,
textarea:focus,
select:focus {
  border-color: #caa860;
  box-shadow: 0 0 0 2px rgba(202,168,96,0.1);
}
.field-error {
  font-size: 12px;
  color: #fb7185;
  margin: 4px 0 0;
}
</style>

