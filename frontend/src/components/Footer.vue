<template>
  <footer class="footer">
    <div class="footer-inner">

      <!-- Brand -->
      <div class="footer-brand">
        <div class="footer-logo">
          <img :src="logo" :alt="t('footer.logoAlt')" />
          <span>Kontrol</span>
        </div>
        <p class="footer-tagline">{{ t('footer.tagline') }}</p>
      </div>

      <div class="footer-links">
        <div class="footer-col">
          <h4>{{ t('footer.product') }}</h4>
          <ul>
            <li><RouterLink to="/#features">{{ t('footer.features') }}</RouterLink></li>
            <li><RouterLink to="/#solution">{{ t('footer.commandCenter') }}</RouterLink></li>
            <li><RouterLink to="/#steps">{{ t('footer.howItWorks') }}</RouterLink></li>
            <li><RouterLink to="/#companies">{{ t('footer.businesses') }}</RouterLink></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>{{ t('footer.legal') }}</h4>
          <ul>
            <li><RouterLink to="/legal#privacy">{{ t('footer.privacy') }}</RouterLink></li>
            <li><RouterLink to="/legal#terms">{{ t('footer.terms') }}</RouterLink></li>
            <li><RouterLink to="/legal#cookies">{{ t('footer.cookies') }}</RouterLink></li>
          </ul>
        </div>
      </div>

    </div>

    <!-- Bottom bar -->
    <div class="footer-bottom">
      <span>{{ t('footer.rights', { year }) }}</span>
      <span class="footer-bottom-right">{{ t('footer.builtFor') }}</span>
    </div>
  </footer>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";
import logo from "../assets/img/kontrol.png";

const { t } = useI18n();
const year = new Date().getFullYear();
</script>

<style scoped>
.footer {
  width: 100%;
  background: color-mix(in srgb, var(--k-color-tertiary) 85%, var(--k-color-bg));
  border-top: 1px solid var(--k-color-border);
  padding: 60px 0 0;
  box-sizing: border-box;
  position: relative;
  z-index: 20;
}

.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 40px;
  display: flex;
  gap: 60px;
  align-items: flex-start;
}

/* ─── Brand column ───────────────────────────────────────────────────────── */
.footer-brand {
  flex: 0 0 260px;
  display: flex;
  flex-direction: column;
  gap: var(--k-space-4);
}

.footer-logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.footer-logo img {
  width: var(--k-space-6);
  height: var(--k-space-6);
  object-fit: contain;
}

.footer-logo span {
  font-size: var(--k-font-size-heading-1);
  font-weight: var(--k-font-weight-bold);
  color: var(--k-color-text);
}

.footer-tagline {
  font-size: var(--k-font-size-body-main);
  color: var(--k-text-muted);
  line-height: 1.6;
  margin: 0;
}

/* ─── Links columns ──────────────────────────────────────────────────────── */
.footer-links {
  flex: 1;
  display: flex;
  gap: 40px;
  flex-wrap: wrap;
}

.footer-col {
  flex: 1;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  gap: var(--k-space-3);
}

.footer-col h4 {
  font-size: var(--k-font-size-caption);
  font-weight: var(--k-font-weight-bold);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--k-color-primary-2);
  margin: 0;
}

.footer-col ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.footer-col ul li a {
  font-size: var(--k-font-size-body-main);
  color: var(--k-text-soft);
  text-decoration: none;
  transition: color 0.2s;
}

.footer-col ul li a:hover {
  color: var(--k-color-text);
}

.footer-col ul li a:focus-visible {
  outline: var(--k-focus-ring);
  outline-offset: var(--k-focus-ring-offset);
  border-radius: var(--k-radius-sm);
}

/* ─── Bottom bar ─────────────────────────────────────────────────────────── */
.footer-bottom {
  max-width: 1200px;
  margin: 40px auto 0;
  padding: 20px 40px;
  border-top: 1px solid var(--k-color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--k-font-size-caption);
  color: var(--k-text-dim);
  flex-wrap: wrap;
  gap: var(--k-space-2);
}

/* ─── Responsive ─────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .footer-inner {
    flex-direction: column;
    gap: 40px;
    padding: 0 var(--k-space-5);
  }

  .footer-brand {
    flex: none;
  }

  .footer-links {
    gap: var(--k-space-6);
  }

  .footer-bottom {
    padding: 20px var(--k-space-5);
    flex-direction: column;
    align-items: flex-start;
    gap: var(--k-space-1);
  }
}

@media (max-width: 480px) {
  .footer {
    padding-top: 40px;
  }

  .footer-inner {
    padding: 0 var(--k-space-4);
  }

  .footer-links {
    flex-direction: column;
    gap: 28px;
  }

  .footer-bottom {
    padding: var(--k-space-4);
  }
}
</style>
