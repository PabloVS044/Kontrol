<template>
  <div class="legal-page">
    <Navbar />

    <main class="legal-main">
      <header class="legal-header">
        <div class="legal-badge">
          <span class="legal-badge-dot"></span>
          <span>{{ t('legal.badge') }}</span>
        </div>
        <h1 class="legal-title">{{ t('legal.title') }}</h1>
        <p class="legal-subtitle">{{ t('legal.subtitle') }}</p>

        <nav class="legal-quick-nav" :aria-label="t('legal.nav.ariaLabel')">
          <a href="#terms" class="legal-nav-pill">
            <FileText :size="16" />
            <span>{{ t('legal.nav.terms') }}</span>
          </a>
          <a href="#privacy" class="legal-nav-pill">
            <ShieldCheck :size="16" />
            <span>{{ t('legal.nav.privacy') }}</span>
          </a>
          <a href="#cookies" class="legal-nav-pill">
            <Cookie :size="16" />
            <span>{{ t('legal.nav.cookies') }}</span>
          </a>
        </nav>
      </header>

      <div class="legal-content">
        <!-- Términos del Servicio -->
        <section id="terms" class="legal-section">
          <div class="legal-section-header">
            <div class="legal-section-meta">
              <span class="legal-section-badge">{{ t('legal.terms.badge') }}</span>
              <span class="legal-section-date">{{ t('legal.terms.lastUpdate') }}</span>
            </div>
            <h2 class="legal-section-title">{{ t('legal.terms.title') }}</h2>
          </div>
          <div class="legal-section-body">
            <p>{{ t('legal.terms.p1') }}</p>
            <p>{{ t('legal.terms.p2') }}</p>
            <p>{{ t('legal.terms.p3') }}</p>
            <p>{{ t('legal.terms.p4') }}</p>
            <p>{{ t('legal.terms.p5') }}</p>
          </div>
        </section>

        <!-- Aviso de Privacidad -->
        <section id="privacy" class="legal-section">
          <div class="legal-section-header">
            <div class="legal-section-meta">
              <span class="legal-section-badge">{{ t('legal.privacy.badge') }}</span>
              <span class="legal-section-date">{{ t('legal.privacy.lastUpdate') }}</span>
            </div>
            <h2 class="legal-section-title">{{ t('legal.privacy.title') }}</h2>
          </div>
          <div class="legal-section-body">
            <p>{{ t('legal.privacy.p1') }}</p>
            <p>{{ t('legal.privacy.p2') }}</p>
            <p>{{ t('legal.privacy.p3') }}</p>
            <p>{{ t('legal.privacy.p4') }}</p>
          </div>
        </section>

        <!-- Política de Cookies y Almacenamiento -->
        <section id="cookies" class="legal-section">
          <div class="legal-section-header">
            <div class="legal-section-meta">
              <span class="legal-section-badge">{{ t('legal.cookies.badge') }}</span>
              <span class="legal-section-date">{{ t('legal.cookies.lastUpdate') }}</span>
            </div>
            <h2 class="legal-section-title">{{ t('legal.cookies.title') }}</h2>
          </div>
          <div class="legal-section-body">
            <p>{{ t('legal.cookies.p1') }}</p>
            <p>{{ t('legal.cookies.p2') }}</p>
            <p>{{ t('legal.cookies.p3') }}</p>
          </div>
        </section>
      </div>
    </main>

    <Footer />
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { FileText, ShieldCheck, Cookie } from 'lucide-vue-next'
import Navbar from '../components/Navbar.vue'
import Footer from '../components/Footer.vue'
import './LegalView.css'

const { t } = useI18n()
</script>
