/**
 * HU-28 · Ciclo de vida de una publicación de marketing en la interfaz.
 *
 * borrador (DRAFT) → programada (SCHEDULED) → publicada (PUBLISHED)
 *
 * Espejo de src/utils/marketingPublicationLifecycle.js del backend: aquí solo
 * decide qué acciones se le ofrecen al usuario. Quien manda es el backend, que
 * revalida cada transición antes de escribir.
 *
 * El módulo no contiene texto visible: las etiquetas se resuelven por i18n
 * con las claves marketing.status.*, marketing.actions.*, marketing.platform.*
 * y marketing.format.*.
 */

export const PUBLICATION_STATUSES = ['DRAFT', 'SCHEDULED', 'PUBLISHED']

export const PUBLICATION_STATUS_TRANSITIONS = {
  DRAFT: ['SCHEDULED', 'PUBLISHED'],
  SCHEDULED: ['DRAFT', 'PUBLISHED'],
  PUBLISHED: [],
}

export const PUBLICATION_PLATFORMS = [
  'FACEBOOK',
  'INSTAGRAM',
  'LINKEDIN',
  'TIKTOK',
  'X',
  'YOUTUBE',
  'WHATSAPP',
  'OTHER',
]

export const PUBLICATION_FORMATS = [
  'POST',
  'STORY',
  'REEL',
  'VIDEO',
  'CAROUSEL',
  'SHORT',
  'AD',
  'OTHER',
]

/**
 * HU-32 · Colores tokenizados (SCRUM-12) de los indicadores de estado.
 *
 * borrador: neutro, no es una alerta ni un logro. programada: reutiliza la
 * superficie "watching" (algo pendiente que requiere atención). publicada:
 * reutiliza la superficie "ok" (resultado exitoso). Ninguna introduce un
 * color nuevo: las tres ya existen en theme.css para exactamente este tipo
 * de indicador de estado.
 */
const PUBLICATION_STATUS_TOKEN = {
  DRAFT: { color: 'var(--k-text-muted)', bg: 'var(--k-color-bg-3)' },
  SCHEDULED: { color: 'var(--k-alert-watching-text)', bg: 'var(--k-alert-watching-bg)' },
  PUBLISHED: { color: 'var(--k-alert-ok-text)', bg: 'var(--k-alert-ok-bg)' },
}

const DEFAULT_PUBLICATION_STATUS_TOKEN = { color: 'var(--k-text-muted)', bg: 'var(--k-color-bg-3)' }

export function publicationStatusColors(status) {
  return PUBLICATION_STATUS_TOKEN[status] ?? DEFAULT_PUBLICATION_STATUS_TOKEN
}

export function isTransitionAllowed(current, next) {
  return current === next || (PUBLICATION_STATUS_TRANSITIONS[current] ?? []).includes(next)
}

/**
 * Acciones de cambio de estado que tienen sentido ofrecer para una publicación.
 * Una publicada no devuelve ninguna: su estado es terminal.
 */
export function availableTransitions(status) {
  return (PUBLICATION_STATUS_TRANSITIONS[status] ?? []).map((target) => ({
    status: target,
    // Programar sin fecha lo rechaza el backend, así que la pedimos antes.
    requiresScheduledDate: target === 'SCHEDULED',
  }))
}
