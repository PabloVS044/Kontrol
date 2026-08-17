import { describe, it, expect } from 'vitest'
import {
  PUBLICATION_FORMATS,
  PUBLICATION_PLATFORMS,
  PUBLICATION_STATUSES,
  PUBLICATION_STATUS_TRANSITIONS,
  availableTransitions,
  isTransitionAllowed,
  publicationStatusColors,
} from '@/utils/publicationStatus.js'
import es from '@/locales/es.json'
import en from '@/locales/en.json'

// HU-28 · Ciclo de vida de la publicación en la interfaz.

describe('Estados del ciclo', () => {
  it('son los tres de la historia: borrador, programada y publicada', () => {
    expect(PUBLICATION_STATUSES).toEqual(['DRAFT', 'SCHEDULED', 'PUBLISHED'])
  })

  it('la máquina de estados cubre exactamente esos tres', () => {
    expect(Object.keys(PUBLICATION_STATUS_TRANSITIONS).sort())
      .toEqual([...PUBLICATION_STATUSES].sort())
  })

  it('cada estado tiene un color propio para distinguirse de un vistazo', () => {
    const colores = PUBLICATION_STATUSES.map((estado) => publicationStatusColors(estado).color)
    expect(new Set(colores).size).toBe(PUBLICATION_STATUSES.length)
  })
})

describe('Transiciones ofrecidas al usuario', () => {
  it('un borrador se puede programar o publicar', () => {
    expect(availableTransitions('DRAFT').map((tr) => tr.status)).toEqual(['SCHEDULED', 'PUBLISHED'])
  })

  it('una programada se puede publicar o devolver a borrador', () => {
    expect(availableTransitions('SCHEDULED').map((tr) => tr.status)).toEqual(['DRAFT', 'PUBLISHED'])
  })

  it('una publicada no ofrece ninguna: su estado es terminal', () => {
    expect(availableTransitions('PUBLISHED')).toEqual([])
  })

  it('programar se marca como acción que exige fecha', () => {
    const programar = availableTransitions('DRAFT').find((tr) => tr.status === 'SCHEDULED')
    const publicar = availableTransitions('DRAFT').find((tr) => tr.status === 'PUBLISHED')

    expect(programar.requiresScheduledDate).toBe(true)
    expect(publicar.requiresScheduledDate).toBe(false)
  })

  it('un estado desconocido no ofrece acciones en vez de reventar', () => {
    expect(availableTransitions('PLANNED')).toEqual([])
  })
})

describe('Coherencia con el backend', () => {
  // Espejo de src/utils/marketingPublicationLifecycle.js del backend.
  it('publicada no vuelve atrás', () => {
    expect(isTransitionAllowed('PUBLISHED', 'DRAFT')).toBe(false)
    expect(isTransitionAllowed('PUBLISHED', 'SCHEDULED')).toBe(false)
  })

  it('quedarse en el mismo estado siempre vale: editar contenido no lo cambia', () => {
    for (const estado of PUBLICATION_STATUSES) {
      expect(isTransitionAllowed(estado, estado)).toBe(true)
    }
  })
})

describe('Cobertura de traducciones', () => {
  // Si falta una clave, la interfaz muestra la ruta cruda al usuario.
  const locales = { es, en }

  for (const [nombre, mensajes] of Object.entries(locales)) {
    it(`${nombre} traduce los tres estados y sus acciones`, () => {
      for (const estado of PUBLICATION_STATUSES) {
        expect(mensajes.marketing.status[estado]).toBeTruthy()
        expect(mensajes.marketing.actions[estado]).toBeTruthy()
      }
    })

    it(`${nombre} traduce todos los canales y formatos`, () => {
      for (const canal of PUBLICATION_PLATFORMS) {
        expect(mensajes.marketing.platform[canal]).toBeTruthy()
      }
      for (const formato of PUBLICATION_FORMATS) {
        expect(mensajes.marketing.format[formato]).toBeTruthy()
      }
    })

    it(`${nombre} tiene la entrada del navbar`, () => {
      expect(mensajes.navbar.marketing).toBeTruthy()
    })
  }

  it('ambos idiomas exponen exactamente las mismas claves de marketing', () => {
    const rutas = (objeto, prefijo = '') => Object.entries(objeto).flatMap(([clave, valor]) =>
      typeof valor === 'object' && valor !== null
        ? rutas(valor, `${prefijo}${clave}.`)
        : [`${prefijo}${clave}`]
    )

    expect(rutas(es.marketing).sort()).toEqual(rutas(en.marketing).sort())
  })
})
