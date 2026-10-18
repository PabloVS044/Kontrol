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
          <a href="#contact" class="legal-nav-pill">
            <Mail :size="16" />
            <span>{{ t('legal.nav.contact') }}</span>
          </a>
        </nav>
      </header>

      <div class="legal-content">
        <!-- Términos del Servicio, Aviso de Privacidad y Cookies -->
        <section
          v-for="section in sections"
          :id="section.id"
          :key="section.id"
          class="legal-section"
        >
          <div class="legal-section-header">
            <div class="legal-section-meta">
              <span class="legal-section-badge">{{ t(`legal.${section.id}.badge`) }}</span>
              <span class="legal-section-date">{{ t('legal.updated', { version: LEGAL_VERSION }) }}</span>
            </div>
            <h2 class="legal-section-title">{{ t(`legal.${section.id}.title`) }}</h2>
          </div>
          <div class="legal-section-body">
            <article v-for="(clause, index) in section.clauses" :key="index" class="legal-clause">
              <h3 class="legal-clause-title">{{ clause.title }}</h3>
              <p>{{ clause.body }}</p>
            </article>
          </div>
        </section>

        <!-- Contacto -->
        <section id="contact" class="legal-section">
          <div class="legal-section-header">
            <div class="legal-section-meta">
              <span class="legal-section-badge">{{ t('legal.contact.badge') }}</span>
            </div>
            <h2 class="legal-section-title">{{ t('legal.contact.title') }}</h2>
          </div>
          <div class="legal-section-body">
            <p>{{ t('legal.contact.copy') }}</p>
            <a class="legal-contact-email" :href="`mailto:${SUPPORT_EMAIL}`">{{ SUPPORT_EMAIL }}</a>
            <p>{{ t('legal.contact.note') }}</p>
          </div>
        </section>
      </div>
    </main>

    <Footer />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileText, ShieldCheck, Cookie, Mail } from 'lucide-vue-next'
import Navbar from '../components/Navbar.vue'
import Footer from '../components/Footer.vue'
import { LEGAL_VERSION, SUPPORT_EMAIL } from '../utils/legal.js'
import './LegalView.css'

const { t, tm, rt } = useI18n()

// Las cláusulas viven en el diccionario como arreglo; el correo se interpola
// aquí porque la `@` no puede ir dentro de un mensaje de vue-i18n.
const sections = computed(() =>
  ['terms', 'privacy', 'cookies'].map((id) => ({
    id,
    clauses: tm(`legal.${id}.clauses`).map((clause) => ({
      title: rt(clause.title),
      body: rt(clause.body, { email: SUPPORT_EMAIL }),
    })),
  })),
)
</script>
