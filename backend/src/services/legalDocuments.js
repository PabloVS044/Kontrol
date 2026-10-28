/**
 * Catálogo de documentos legales publicados (L-6).
 *
 * Es el mismo catálogo que `frontend/src/utils/legal.js`: allí se pinta la
 * versión y el historial, aquí se decide qué hay que aceptar. La prueba
 * `legalDocuments.test.js` falla si los dos se separan.
 *
 * `history` va del más reciente al más antiguo. Una entrada `substantial`
 * obliga a volver a aceptar: quien solo aceptó versiones anteriores a ella
 * tiene el documento pendiente. Un cambio menor sube la versión sin pedir
 * nada a quien ya aceptó.
 */
export const LEGAL_DOCUMENTS = [
  {
    id: 'terms',
    requiresAcceptance: true,
    history: [
      { version: '1.1', date: '2026-10-24', substantial: true },
      { version: '1.0', date: '2026-10-17', substantial: true },
    ],
  },
  {
    id: 'privacy',
    requiresAcceptance: true,
    history: [
      { version: '1.2', date: '2026-10-27', substantial: true },
      { version: '1.1', date: '2026-10-22', substantial: false },
      { version: '1.0', date: '2026-10-17', substantial: true },
    ],
  },
  {
    id: 'cookies',
    requiresAcceptance: false,
    history: [
      { version: '1.1', date: '2026-10-27', substantial: false },
      { version: '1.0', date: '2026-10-23', substantial: true },
    ],
  },
  {
    id: 'data-processing',
    requiresAcceptance: false,
    // Borrador 0.1 no vigente (L-4): la página muestra el marcador de pendiente.
    history: [],
  },
  {
    id: 'ai-assistant',
    requiresAcceptance: false,
    history: [{ version: '1.0', date: '2026-10-26', substantial: true }],
  },
]

export const currentVersion = (doc) => doc.history[0]?.version ?? null

/**
 * Versiones que siguen valiendo como aceptación: la vigente y las anteriores
 * hasta el último cambio sustancial, incluido.
 */
export function acceptedVersionsStillValid(doc) {
  const lastSubstantial = doc.history.findIndex((entry) => entry.substantial)
  const end = lastSubstantial === -1 ? doc.history.length : lastSubstantial + 1
  return doc.history.slice(0, end).map((entry) => entry.version)
}

/** Documentos que hay que aceptar, con la versión vigente de cada uno. */
export const requiredDocuments = () =>
  LEGAL_DOCUMENTS.filter((doc) => doc.requiresAcceptance && doc.history.length).map((doc) => ({
    document: doc.id,
    version: currentVersion(doc),
  }))

/**
 * Documentos que el usuario todavía debe aceptar, dadas sus aceptaciones
 * registradas (`[{ documento, version }]`).
 */
export function pendingDocuments(acceptances) {
  return requiredDocuments().filter(({ document }) => {
    const doc = LEGAL_DOCUMENTS.find((d) => d.id === document)
    const valid = acceptedVersionsStillValid(doc)
    return !acceptances.some((a) => a.documento === document && valid.includes(a.version))
  })
}

/**
 * Compara las versiones que el cliente dice haber mostrado con las vigentes.
 * Si no coinciden, el usuario aceptó un texto que ya no es el publicado y la
 * aceptación no se registra.
 */
export const matchesCurrentVersions = (documents, shown) =>
  documents.every(({ document, version }) => shown?.[document] === version)

/**
 * Inserta una fila por documento. Va dentro de la transacción del llamador:
 * si falla, no queda ni la cuenta sin aceptación ni la aceptación sin cuenta.
 */
export async function recordAcceptances(client, { id_usuario, documents, ip, origen }) {
  for (const { document, version } of documents) {
    await client.query(
      `INSERT INTO public.aceptacion_legal (id_usuario, documento, version, ip, origen)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id_usuario, documento, version) DO NOTHING`,
      [id_usuario, document, version, ip ?? null, origen]
    )
  }
}

export async function listAcceptances(client, id_usuario) {
  const { rows } = await client.query(
    `SELECT documento, version, aceptado_en
     FROM public.aceptacion_legal
     WHERE id_usuario = $1
     ORDER BY aceptado_en DESC`,
    [id_usuario]
  )
  return rows
}
