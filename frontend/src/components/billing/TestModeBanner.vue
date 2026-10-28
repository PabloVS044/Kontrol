<template>
  <!-- PAY-1 — Siempre visible donde se habla de pagos: nadie debe confundir la
       demostración con un cobro real. -->
  <aside class="test-mode" role="note" :aria-label="$t('billing.testMode.title')">
    <p class="tm-title">{{ $t('billing.testMode.title') }}</p>
    <p class="tm-body">{{ $t('billing.testMode.body') }}</p>
  </aside>
</template>

<style scoped>
.test-mode {
  padding: var(--k-space-4) var(--k-space-5);
  background: var(--k-alert-warning-bg);
  border: var(--k-border-width) solid var(--k-alert-warning-border);
}
.tm-title {
  margin: 0 0 var(--k-space-1);
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-body-main);
  font-weight: 600;
  color: var(--k-alert-warning-text);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.tm-body {
  margin: 0;
  font-family: var(--k-font-sans);
  font-size: var(--k-font-size-caption-lg);
  color: var(--k-color-text);
}
</style>
