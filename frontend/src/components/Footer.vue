<template>
  <footer class="footer">
    <div class="footer-inner">

      <!-- Brand -->
      <div class="footer-brand">
        <div class="footer-logo">
          <img :src="logo" alt="Kontrol logo" />
          <span>Kontrol</span>
        </div>
        <p class="footer-tagline">
          The all-in-one command center for ambitious businesses.
        </p>
        <div class="footer-socials">
          <a href="#" aria-label="Twitter"><Twitter :size="18" /></a>
          <a href="#" aria-label="LinkedIn"><Linkedin :size="18" /></a>
          <a href="#" aria-label="Instagram"><Instagram :size="18" /></a>
          <a href="#" aria-label="GitHub"><Github :size="18" /></a>
        </div>
      </div>

      <!-- Links -->
      <div class="footer-links">
        <div class="footer-col">
          <h4>Product</h4>
          <ul>
            <li><a href="#features">Features</a></li>
            <li><a href="#solution">Command Center</a></li>
            <li><a href="#steps">How it works</a></li>
            <li><a href="#pricing">Pricing</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Company</h4>
          <ul>
            <li><a href="#about">About</a></li>
            <li><a href="#blog">Blog</a></li>
            <li><a href="#careers">Careers</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Legal</h4>
          <ul>
            <li><a href="#privacy">Privacy Policy</a></li>
            <li><a href="#terms">Terms of Service</a></li>
            <li><a href="#cookies">Cookie Policy</a></li>
          </ul>
        </div>
      </div>

    </div>

    <!-- Bottom bar -->
    <div class="footer-bottom">
      <span>© {{ year }} Kontrol. All rights reserved.</span>
      <span class="footer-bottom-right">Built for the ambitious.</span>
    </div>
  </footer>
</template>

<script setup>
import logo from "../assets/img/kontrol.png";
import { Twitter, Linkedin, Instagram, Github } from "lucide-vue-next";

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

.footer-socials {
  display: flex;
  gap: var(--k-space-3);
}

.footer-socials a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--k-target-min-size);
  height: var(--k-target-min-size);
  border-radius: var(--k-radius-md);
  background: rgba(var(--k-color-white-rgb), 0.08);
  border: 1px solid var(--k-color-border);
  color: var(--k-text-soft);
  transition: background 0.2s, color 0.2s;
  text-decoration: none;
}

.footer-socials a:hover {
  background: var(--k-color-primary);
  color: var(--k-form-btn-text);
  border-color: var(--k-color-primary);
}

.footer-socials a:focus-visible {
  outline: var(--k-focus-ring);
  outline-offset: var(--k-focus-ring-offset);
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
