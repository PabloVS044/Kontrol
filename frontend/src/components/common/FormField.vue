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
  gap: var(--k-space-2);
}

.field-label {
  font-size: var(--k-font-size-caption);
  font-family: var(--k-font-sans);
  font-weight: var(--k-font-weight-semibold);
  color: var(--k-text-muted);
  text-transform: uppercase;
  letter-spacing: var(--k-tracking-caps);
}
.req {
  color: var(--k-color-primary);
  margin-left: 2px;
}

input,
textarea,
select {
  background: var(--k-form-input-bg);
  border: var(--k-border-width) solid var(--k-color-border);
  color: var(--k-color-text);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-small);
  padding: var(--k-space-2) var(--k-space-3);
  outline: none;
  border-radius: var(--k-radius-sm);
  transition: var(--k-transition-ui);
}

input::placeholder,
textarea::placeholder {
  color: var(--k-text-placeholder);
}

input:focus,
textarea:focus,
select:focus {
  border-color: var(--k-color-primary);
  background: var(--k-form-input-focus-bg);
  box-shadow: 0 0 0 var(--k-focus-ring-width) rgba(var(--k-color-primary-rgb), 0.12);
}

.field-error {
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-state-error-text);
  font-weight: var(--k-font-weight-medium);
  margin-top: var(--k-space-1);
}

.form-field:has(.field-error) input,
.form-field:has(.field-error) textarea {
  border-color: var(--k-state-error-text);
}

</style>