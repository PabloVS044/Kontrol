<template>
  <div class="legal-page">
    <Navbar />

    <main v-if="doc" class="legal-main">
      <RouterLink to="/legal" class="legal-back">
        <ArrowLeft :size="16" aria-hidden="true" />
        <span>{{ t('legal.document.back') }}</span>
      </RouterLink>

      <article :id="doc.id" class="legal-section legal-document" :lang="docLang">
        <header class="legal-section-header">
          <div class="legal-section-meta">
            <span class="legal-section-badge">{{ docText('badge') }}</span>
            <span class="legal-section-date" :lang="locale">{{ status }}</span>
          </div>
          <h1 class="legal-section-title">{{ docText('title') }}</h1>
          <p v-if="languageNotice" class="legal-note" :lang="locale">{{ languageNotice }}</p>
          <p v-if="current && doc.requiresAcceptance" class="legal-note" :lang="locale">
            {{ t('legal.document.acceptanceNote') }}
          </p>
        </header>

        <!-- Sin versión vigente: la estructura completa y un marcador, nunca un texto inventado. -->
        <div v-if="!current" class="legal-pending" role="status" :lang="locale">
          <h2 class="legal-clause-title">{{ t('legal.document.pendingTitle') }}</h2>
          <p>{{ t('legal.document.pendingBody') }}</p>
        </div>

        <div v-else class="legal-section-body">
          <section v-for="(clause, index) in clauses" :key="index" class="legal-clause">
            <h2 class="legal-clause-title">{{ clause.title }}</h2>
            <p>{{ clause.body }}</p>
          </section>
          <!-- Aquí se cambia la decisión del aviso, también sin sesión (L-3). -->
          <section v-if="doc.id === 'cookies'" class="legal-storage-choice" :lang="locale">
            <h2 class="legal-clause-title">{{ t('storageConsent.manageTitle') }}</h2>
            <StorageConsentControls />
          </section>
        </div>

        <section v-if="history.length" class="legal-history" :lang="locale">
          <h2 class="legal-clause-title">{{ t('legal.document.historyTitle') }}</h2>
          <ol class="legal-history-list">
            <li v-for="entry in history" :key="entry.version" class="legal-history-item">
              <div class="legal-history-meta">
                <span class="legal-history-version">{{ t('legal.document.version', { version: entry.version }) }}</span>
                <span>{{ entry.date }}</span>
                <span class="legal-history-kind" :data-substantial="entry.substantial">{{ entry.kind }}</span>
              </div>
              <p>{{ entry.summary }}</p>
            </li>
          </ol>
        </section>

        <p class="legal-document-contact" :lang="locale">
          {{ t('legal.document.contact') }}
          <a class="legal-contact-email" :href="`mailto:${SUPPORT_EMAIL}`">{{ SUPPORT_EMAIL }}</a>
        </p>
      </article>
    </main>

    <Footer />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import Navbar from '../components/Navbar.vue'
import Footer from '../components/Footer.vue'
import StorageConsentControls from '../components/StorageConsentControls.vue'
import {
  SUPPORT_EMAIL,
  documentLanguage,
  findLegalDocument,
  formatLegalDate,
  historyKey,
} from '../utils/legal.js'
import './LegalView.css'

/**
 * Página pública de un documento legal (L-6): `/legal/<slug>`, sin sesión.
 *
 * El texto se muestra en el idioma de la interfaz si existe; si no, en el
 * original con un aviso, para no ofrecer una traducción que no existe. La
 * versión, la fecha y el historial salen del catálogo de `utils/legal.js`.
 */

const { t, locale, getLocaleMessage, rt } = useI18n()
const route = useRoute()

const doc = computed(() => findLegalDocument(route.params.document))
const current = computed(() => doc.value?.history[0] ?? null)
const docLang = computed(() => documentLanguage(doc.value, locale.value))

// Textos del documento en su idioma, que puede no ser el de la interfaz.
const messages = computed(() => getLocaleMessage(docLang.value).legal[doc.value.id])
const docText = (key) => rt(messages.value[key])

const clauses = computed(() =>
  (messages.value.clauses ?? []).map((clause) => ({
    title: rt(clause.title),
    // El correo se interpola aquí: la `@` no puede ir dentro de un mensaje.
    body: rt(clause.body, { email: SUPPORT_EMAIL }),
  })),
)

const languageNotice = computed(() =>
  docLang.value === locale.value
    ? ''
    : t('legal.document.languageOnly', { language: t(`legal.document.languageNames.${docLang.value}`) }),
)

const status = computed(() =>
  current.value
    ? `${t('legal.document.version', { version: current.value.version })} · ${t('legal.document.effective', {
      date: formatLegalDate(current.value.date, locale.value),
    })}`
    : t('legal.document.pendingVersion'),
)

const history = computed(() =>
  doc.value.history.map((entry) => ({
    ...entry,
    date: formatLegalDate(entry.date, locale.value),
    kind: t(entry.substantial ? 'legal.document.substantial' : 'legal.document.minor'),
    summary: t(`legal.${doc.value.id}.history.${historyKey(entry.version)}`),
  })),
)
</script>
