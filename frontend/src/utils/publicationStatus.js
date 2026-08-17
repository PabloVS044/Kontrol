/**
 * HU-28 · Ciclo de vida de una publicación de marketing en la interfaz.
 *
 * borrador (DRAFT) → programada (SCHEDULED) → publicada (PUBLISHED)
 *
 * Espejo de src/utils/marketingPublicationLifecycle.js del backend: aquí solo
 * decide qué acciones se le ofrecen al usuario. Quien manda es el backend, que
 * revalida cada transición antes de escribir.
 */

export const PUBLICATION_STATUSES = ['DRAFT', 'SCHEDULED', 'PUBLISHED']

export const PUBLICATION_STATUS_TRANSITIONS = {
  DRAFT: ['SCHEDULED', 'PUBLISHED'],
  SCHEDULED: ['DRAFT', 'PUBLISHED'],
  PUBLISHED: [],
}

export const PUBLICATION_STATUS_LABEL = {
  DRAFT: 'Borrador',
  SCHEDULED: 'Programada',
  PUBLISHED: 'Publicada',
}

const PUBLICATION_STATUS_COLOR = {
  DRAFT: '#8b8b8b',
  SCHEDULED: '#60a5fa',
  PUBLISHED: '#34d399',
}

// Etiqueta de la acción que lleva a cada estado, no del estado en sí.
const TRANSITION_LABEL = {
  DRAFT: 'Volver a borrador',
  SCHEDULED: 'Programar',
  PUBLISHED: 'Publicar',
}

export const PUBLICATION_PLATFORMS = [
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'X', label: 'X' },
  { value: 'YOUTUBE', label: 'YouTube' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'OTHER', label: 'Otro' },
]

export const PUBLICATION_FORMATS = [
  { value: 'POST', label: 'Post' },
  { value: 'STORY', label: 'Historia' },
  { value: 'REEL', label: 'Reel' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'CAROUSEL', label: 'Carrusel' },
  { value: 'SHORT', label: 'Short' },
  { value: 'AD', label: 'Anuncio' },
  { value: 'OTHER', label: 'Otro' },
]

export function publicationStatusLabel(status) {
  return PUBLICATION_STATUS_LABEL[status] ?? status
}

export function publicationStatusPill(status) {
  const color = PUBLICATION_STATUS_COLOR[status] ?? '#888'
  return { label: publicationStatusLabel(status), color, bg: `${color}1a` }
}

export function platformLabel(platform) {
  return PUBLICATION_PLATFORMS.find((p) => p.value === platform)?.label ?? platform
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
    label: TRANSITION_LABEL[target] ?? target,
    // Programar sin fecha lo rechaza el backend, así que la pedimos antes.
    requiresScheduledDate: target === 'SCHEDULED',
  }))
}
