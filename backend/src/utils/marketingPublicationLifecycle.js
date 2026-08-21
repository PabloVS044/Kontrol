/**
 * HU-28 · Ciclo de vida de una publicación de marketing.
 *
 * borrador (DRAFT) → programada (SCHEDULED) → publicada (PUBLISHED)
 *
 * Lógica pura: no toca la base ni el request. El controller la consulta antes
 * de escribir, y la base repite el invariante como red de seguridad mediante
 * marketing_publication_transicion_check.
 */

// PUBLISHED es terminal: el contenido se sigue editando, el estado ya no.
// DRAFT → PUBLISHED existe como atajo de "publicar ahora".
export const PUBLICATION_STATUS_TRANSITIONS = {
  DRAFT: ['SCHEDULED', 'PUBLISHED'],
  SCHEDULED: ['DRAFT', 'PUBLISHED'],
  PUBLISHED: [],
}

/**
 * Marca para que el UPDATE escriba CURRENT_TIMESTAMP en vez de un parámetro:
 * la fecha de publicación la pone Postgres, no el reloj del proceso de Node.
 */
export const NOW = Symbol('CURRENT_TIMESTAMP')

export const isPublicationTransitionAllowed = (current, next) =>
  current === next || (PUBLICATION_STATUS_TRANSITIONS[current] ?? []).includes(next)

/**
 * Estado inicial de una publicación recién creada.
 * @returns {{ status: string } | { error: { status: number, message: string } }}
 */
export const resolvePublicationLifecycleForCreate = ({ status, scheduledFor }) => {
  const nextStatus = status ?? 'DRAFT'

  if (nextStatus === 'SCHEDULED' && !scheduledFor) {
    return { error: { status: 400, message: 'A scheduled publication requires a scheduled date.' } }
  }

  return { status: nextStatus }
}

/**
 * Estado resultante de una edición y qué hacer con published_at.
 *
 * `publishedAt: undefined` significa "no tocar la columna", lo que evita
 * reenviar a Postgres una fecha que ya viajó de ida y vuelta por Node y podría
 * desplazarse de huso horario.
 *
 * @returns {{ status: string, publishedAt: * } | { error: { status: number, message: string } }}
 */
export const resolvePublicationLifecycleForUpdate = ({ existing, body }) => {
  const currentStatus = existing.status
  const nextStatus = body.status ?? currentStatus

  if (!isPublicationTransitionAllowed(currentStatus, nextStatus)) {
    return {
      error: {
        status: 409,
        message: `A publication cannot move from ${currentStatus} to ${nextStatus}.`,
      },
    }
  }

  const scheduledFor = body.scheduledFor !== undefined ? body.scheduledFor : existing.scheduled_for
  if (nextStatus === 'SCHEDULED' && !scheduledFor) {
    return { error: { status: 400, message: 'A scheduled publication requires a scheduled date.' } }
  }

  let publishedAt

  if (nextStatus === 'PUBLISHED') {
    if (body.publishedAt) publishedAt = body.publishedAt
    else if (!existing.published_at) publishedAt = NOW
  } else if (existing.published_at) {
    // Al dejar de estar publicada se limpia la marca de publicación.
    publishedAt = null
  }

  return { status: nextStatus, publishedAt }
}
