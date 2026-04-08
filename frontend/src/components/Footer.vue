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
  background: color-mix(in srgb, var(--Tertiary) 85%, var(--Background));
  border-top: 1px solid var(--Border);
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
  gap: 16px;
}

.footer-logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.footer-logo img {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.footer-logo span {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--Text);
}

.footer-tagline {
  font-size: 0.88rem;
  color: color-mix(in srgb, var(--Text) 60%, transparent);
  line-height: 1.6;
  margin: 0;
}

.footer-socials {
  display: flex;
  gap: 12px;
}

.footer-socials a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--Text) 8%, transparent);
  border: 1px solid var(--Border);
  color: color-mix(in srgb, var(--Text) 70%, transparent);
  transition: background 0.2s, color 0.2s;
  text-decoration: none;
}

.footer-socials a:hover {
  background: var(--Primary);
  color: var(--Text);
  border-color: var(--Primary);
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
  gap: 12px;
}

.footer-col h4 {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--Primary2);
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
  font-size: 0.9rem;
  color: color-mix(in srgb, var(--Text) 65%, transparent);
  text-decoration: none;
  transition: color 0.2s;
}

.footer-col ul li a:hover {
  color: var(--Text);
}

/* ─── Bottom bar ─────────────────────────────────────────────────────────── */
.footer-bottom {
  max-width: 1200px;
  margin: 40px auto 0;
  padding: 20px 40px;
  border-top: 1px solid var(--Border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.82rem;
  color: color-mix(in srgb, var(--Text) 45%, transparent);
  flex-wrap: wrap;
  gap: 8px;
}

/* ─── Responsive ─────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .footer-inner {
    flex-direction: column;
    gap: 40px;
    padding: 0 24px;
  }

  .footer-brand {
    flex: none;
  }

  .footer-links {
    gap: 32px;
  }

  .footer-bottom {
    padding: 20px 24px;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}

@media (max-width: 480px) {
  .footer {
    padding-top: 40px;
  }

  .footer-inner {
    padding: 0 16px;
  }

  .footer-links {
    flex-direction: column;
    gap: 28px;
  }

  .footer-bottom {
    padding: 16px;
  }
}
</style>
