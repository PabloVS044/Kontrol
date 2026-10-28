/**
 * Datos públicos de los documentos legales (L-6).
 *
 * Cada documento tiene su página en `/legal/<slug>`, su versión y fecha de
 * vigencia y su historial de cambios. Es el mismo catálogo que
 * `backend/src/services/legalDocuments.js`, que decide qué hay que aceptar:
 * la prueba `backend/tests/legalAcceptance.test.js` falla si se separan.
 *
 * Al cambiar un texto: añade una entrada al principio de `history` y su
 * resumen en `legal.<id>.history` de los diccionarios. Con `substantial: true`
 * se vuelve a pedir la aceptación a todos los que aceptaron una versión
 * anterior (solo en los documentos con `requiresAcceptance`).
 *
 * `languages` lista los idiomas en que existe el texto. Si la interfaz está
 * en otro, la página lo muestra en el primero de la lista y lo avisa, en
 * lugar de ofrecer una traducción que no existe.
 *
 * Un documento con `history` vacío no está publicado: su página muestra el
 * marcador de pendiente con la estructura completa y ningún texto inventado.
 */
export const LEGAL_DOCUMENTS = [
  {
    id: 'terms',
    slug: 'terms',
    requiresAcceptance: true,
    languages: ['es', 'en'],
    history: [{ version: '1.0', date: '2026-10-17', substantial: true }],
  },
  {
    id: 'privacy',
    slug: 'privacy',
    requiresAcceptance: true,
    languages: ['es', 'en'],
    history: [
      { version: '1.2', date: '2026-10-27', substantial: true },
      { version: '1.1', date: '2026-10-22', substantial: false },
      { version: '1.0', date: '2026-10-17', substantial: true },
    ],
  },
  {
    id: 'cookies',
    slug: 'cookies',
    requiresAcceptance: false,
    languages: ['es', 'en'],
    history: [
      { version: '1.1', date: '2026-10-27', substantial: false },
      { version: '1.0', date: '2026-10-23', substantial: true },
    ],
  },
  {
    id: 'dataProcessing',
    slug: 'data-processing',
    requiresAcceptance: false,
    languages: ['es'],
    // Borrador 0.1 no vigente (L-4, docs/legal/adenda-tratamiento-datos.md).
    history: [],
  },
  {
    id: 'ai',
    slug: 'ai-assistant',
    requiresAcceptance: false,
    languages: ['es', 'en'],
    history: [{ version: '1.0', date: '2026-10-26', substantial: true }],
  },
]

export const findLegalDocument = (slug) => LEGAL_DOCUMENTS.find((doc) => doc.slug === slug) ?? null

export const legalDocumentPath = (id) => {
  const doc = LEGAL_DOCUMENTS.find((d) => d.id === id)
  return doc ? `/legal/${doc.slug}` : '/legal'
}

export const isPublished = (doc) => doc.history.length > 0

/** Idioma en que se muestra el texto: el de la interfaz si existe, si no el original. */
export const documentLanguage = (doc, locale) =>
  doc.languages.includes(locale) ? locale : doc.languages[0]

/** «27 de octubre de 2026». Al mediodía para que ningún huso cambie el día. */
export const formatLegalDate = (date, locale) =>
  new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(`${date}T12:00:00`))

/** Clave del resumen de una versión en `legal.<id>.history`: '1.2' → 'v1_2'. */
export const historyKey = (version) => `v${version.replace(/\./g, '_')}`

/** Versiones que se muestran y se envían al aceptar: `{ terms: '1.0', … }`. */
export const acceptanceVersions = () =>
  Object.fromEntries(
    LEGAL_DOCUMENTS.filter((doc) => doc.requiresAcceptance && isPublished(doc)).map((doc) => [
      doc.slug,
      doc.history[0].version,
    ]),
  )

// Va fuera del diccionario: vue-i18n interpreta la `@` como mensaje enlazado.
export const SUPPORT_EMAIL = 'support@kontrol.it.com'
