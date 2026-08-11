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
  gap: var(--space-2);
}

.field-label {
  font-size: var(--text-2xs);
  font-family: var(--font-sans);
  font-weight: 600;
  color: var(--TextMuted);
  text-transform: uppercase;
  letter-spacing: var(--tracking-caps);
}
.req {
  color: var(--Primary);
  margin-left: 2px;
}

input,
textarea,
select {
  background: var(--InputBg);
  border: var(--border-width) solid var(--Border);
  color: var(--Text);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  padding: var(--space-2) var(--space-3);
  outline: none;
  border-radius: var(--radius-xs);
  transition: var(--transition-ui);
}

input::placeholder,
textarea::placeholder {
  color: var(--TextPlaceholder);
}

input:focus,
textarea:focus,
select:focus {
  border-color: var(--Primary);
  background: var(--InputFocusBg);
  box-shadow: 0 0 0 2px rgba(202,168,96,0.1);
}

.field-error {
  font-size: var(--text-xs);
  color: var(--ErrorText);
  font-weight: 500;
  margin-top: var(--space-1);
}

.form-field:has(.field-error) input,
.form-field:has(.field-error) textarea {
  border-color: var(--ErrorText);
}

</style>