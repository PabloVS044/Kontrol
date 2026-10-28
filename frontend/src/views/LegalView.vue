<template>
  <div class="legal-page">
    <Navbar />

    <main class="legal-main">
      <header class="legal-header">
        <h1 class="legal-title">{{ t('legal.title') }}</h1>
        <p class="legal-subtitle">{{ t('legal.subtitle') }}</p>
      </header>

      <!-- Un documento por página, con URL estable (L-6). -->
      <ul class="legal-index" :aria-label="t('legal.index.ariaLabel')">
        <li v-for="doc in documents" :key="doc.id">
          <RouterLink :to="doc.path" class="legal-card" :data-document="doc.id">
            <span class="legal-card-icon" aria-hidden="true">
              <component :is="doc.icon" :size="20" />
            </span>
            <span class="legal-card-body">
              <span class="legal-section-badge">{{ t(`legal.${doc.id}.badge`) }}</span>
              <span class="legal-card-title">{{ t(`legal.${doc.id}.title`) }}</span>
              <span class="legal-card-summary">{{ t(`legal.${doc.id}.summary`) }}</span>
              <span class="legal-section-date">{{ doc.status }}</span>
            </span>
            <ChevronRight class="legal-card-arrow" :size="18" aria-hidden="true" />
          </RouterLink>
        </li>
      </ul>

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
    </main>

    <Footer />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Bot, ChevronRight, Cookie, FileSignature, FileText, ShieldCheck } from 'lucide-vue-next'
import Navbar from '../components/Navbar.vue'
import Footer from '../components/Footer.vue'
import {
  LEGAL_DOCUMENTS,
  SUPPORT_EMAIL,
  formatLegalDate,
  isPublished,
  legalDocumentPath,
} from '../utils/legal.js'
import './LegalView.css'

const { t, locale } = useI18n()

const ICONS = { terms: FileText, privacy: ShieldCheck, cookies: Cookie, dataProcessing: FileSignature, ai: Bot }

const documents = computed(() =>
  LEGAL_DOCUMENTS.map((doc) => ({
    id: doc.id,
    path: legalDocumentPath(doc.id),
    icon: ICONS[doc.id],
    status: isPublished(doc)
      ? `${t('legal.document.version', { version: doc.history[0].version })} · ${t('legal.document.effective', {
        date: formatLegalDate(doc.history[0].date, locale.value),
      })}`
      : t('legal.index.pending'),
  })),
)
</script>
