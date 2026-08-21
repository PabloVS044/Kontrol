import { describe, it, expect } from 'vitest'
import {
  NOW,
  PUBLICATION_STATUS_TRANSITIONS,
  isPublicationTransitionAllowed,
  resolvePublicationLifecycleForCreate,
  resolvePublicationLifecycleForUpdate,
} from '../src/utils/marketingPublicationLifecycle.js'
import { MARKETING_PUBLICATION_STATUSES } from '../src/schemas/marketingSchemas.js'

// HU-28 · Ciclo de vida de la publicación: borrador → programada → publicada.

const publicacion = (overrides = {}) => ({
  status: 'DRAFT',
  scheduled_for: null,
  published_at: null,
  ...overrides,
})

describe('Caso 1 · Los estados del ciclo son exactamente los tres de la historia', () => {
  it('el esquema de validación acepta borrador, programada y publicada', () => {
    expect(MARKETING_PUBLICATION_STATUSES).toEqual(['DRAFT', 'SCHEDULED', 'PUBLISHED'])
  })

  it('la máquina de estados cubre esos mismos tres estados, sin sobrantes', () => {
    expect(Object.keys(PUBLICATION_STATUS_TRANSITIONS).sort())
      .toEqual([...MARKETING_PUBLICATION_STATUSES].sort())
  })

  it('ninguna transición apunta a un estado que el esquema rechazaría', () => {
    const destinos = Object.values(PUBLICATION_STATUS_TRANSITIONS).flat()
    for (const destino of destinos) {
      expect(MARKETING_PUBLICATION_STATUSES).toContain(destino)
    }
  })
})

describe('Caso 2 · Transiciones permitidas', () => {
  it('borrador → programada', () => {
    expect(isPublicationTransitionAllowed('DRAFT', 'SCHEDULED')).toBe(true)
  })

  it('programada → publicada', () => {
    expect(isPublicationTransitionAllowed('SCHEDULED', 'PUBLISHED')).toBe(true)
  })

  it('borrador → publicada, como atajo de "publicar ahora"', () => {
    expect(isPublicationTransitionAllowed('DRAFT', 'PUBLISHED')).toBe(true)
  })

  it('programada → borrador, para desprogramar', () => {
    expect(isPublicationTransitionAllowed('SCHEDULED', 'DRAFT')).toBe(true)
  })

  it('quedarse en el mismo estado siempre vale, porque editar contenido no lo cambia', () => {
    for (const estado of MARKETING_PUBLICATION_STATUSES) {
      expect(isPublicationTransitionAllowed(estado, estado)).toBe(true)
    }
  })
})

describe('Caso 3 · Publicada es un estado terminal', () => {
  it('publicada no vuelve a borrador', () => {
    expect(isPublicationTransitionAllowed('PUBLISHED', 'DRAFT')).toBe(false)
  })

  it('publicada no vuelve a programada', () => {
    expect(isPublicationTransitionAllowed('PUBLISHED', 'SCHEDULED')).toBe(false)
  })

  it('el intento de revertir responde 409, no un 500', () => {
    const resultado = resolvePublicationLifecycleForUpdate({
      existing: publicacion({ status: 'PUBLISHED', published_at: '2026-08-01 09:00:00' }),
      body: { status: 'DRAFT' },
    })

    expect(resultado.error?.status).toBe(409)
    expect(resultado.error?.message).toContain('PUBLISHED')
  })

  it('editar el contenido de una publicada la deja publicada', () => {
    const resultado = resolvePublicationLifecycleForUpdate({
      existing: publicacion({ status: 'PUBLISHED', published_at: '2026-08-01 09:00:00' }),
      body: { caption: 'Texto corregido' },
    })

    expect(resultado.error).toBeUndefined()
    expect(resultado.status).toBe('PUBLISHED')
    // No se reescribe la fecha original de publicación.
    expect(resultado.publishedAt).toBeUndefined()
  })
})

describe('Caso 4 · Programar exige fecha programada', () => {
  it('al crear en programada sin fecha responde 400', () => {
    const resultado = resolvePublicationLifecycleForCreate({ status: 'SCHEDULED' })

    expect(resultado.error?.status).toBe(400)
  })

  it('al crear en programada con fecha pasa', () => {
    const resultado = resolvePublicationLifecycleForCreate({
      status: 'SCHEDULED',
      scheduledFor: '2026-09-01 10:00:00',
    })

    expect(resultado.error).toBeUndefined()
    expect(resultado.status).toBe('SCHEDULED')
  })

  it('al programar una publicación que no traía fecha responde 400', () => {
    const resultado = resolvePublicationLifecycleForUpdate({
      existing: publicacion(),
      body: { status: 'SCHEDULED' },
    })

    expect(resultado.error?.status).toBe(400)
  })

  it('al programar aprovecha la fecha que ya tenía guardada', () => {
    const resultado = resolvePublicationLifecycleForUpdate({
      existing: publicacion({ scheduled_for: '2026-09-01 10:00:00' }),
      body: { status: 'SCHEDULED' },
    })

    expect(resultado.error).toBeUndefined()
    expect(resultado.status).toBe('SCHEDULED')
  })

  it('borrar la fecha de una publicación programada responde 400', () => {
    const resultado = resolvePublicationLifecycleForUpdate({
      existing: publicacion({ status: 'SCHEDULED', scheduled_for: '2026-09-01 10:00:00' }),
      body: { scheduledFor: null },
    })

    expect(resultado.error?.status).toBe(400)
  })
})

describe('Caso 5 · La fecha de publicación la fija la base', () => {
  it('al publicar sin fecha explícita delega en CURRENT_TIMESTAMP', () => {
    const resultado = resolvePublicationLifecycleForUpdate({
      existing: publicacion({ status: 'SCHEDULED', scheduled_for: '2026-09-01 10:00:00' }),
      body: { status: 'PUBLISHED' },
    })

    expect(resultado.publishedAt).toBe(NOW)
  })

  it('al publicar con fecha explícita respeta la que envía el usuario', () => {
    const resultado = resolvePublicationLifecycleForUpdate({
      existing: publicacion(),
      body: { status: 'PUBLISHED', publishedAt: '2026-07-15 08:30:00' },
    })

    expect(resultado.publishedAt).toBe('2026-07-15 08:30:00')
  })

  it('no reescribe la fecha de una publicación que ya estaba publicada', () => {
    const resultado = resolvePublicationLifecycleForUpdate({
      existing: publicacion({ status: 'PUBLISHED', published_at: '2026-08-01 09:00:00' }),
      body: { status: 'PUBLISHED' },
    })

    expect(resultado.publishedAt).toBeUndefined()
  })

  it('crear en borrador no genera fecha de publicación', () => {
    const resultado = resolvePublicationLifecycleForCreate({})

    expect(resultado.status).toBe('DRAFT')
  })
})

describe('Caso 6 · Estado por defecto', () => {
  it('una publicación nace en borrador', () => {
    expect(resolvePublicationLifecycleForCreate({}).status).toBe('DRAFT')
  })

  it('sin cambio de estado conserva el que ya tenía', () => {
    const resultado = resolvePublicationLifecycleForUpdate({
      existing: publicacion({ status: 'SCHEDULED', scheduled_for: '2026-09-01 10:00:00' }),
      body: { title: 'Otro titulo' },
    })

    expect(resultado.status).toBe('SCHEDULED')
  })
})
