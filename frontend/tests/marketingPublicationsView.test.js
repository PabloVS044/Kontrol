import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import es from '@/locales/es.json'
import en from '@/locales/en.json'

// Node 25 expone un localStorage propio que tapa el de happy-dom y no
// implementa getItem/clear. Con Node 22 (.nvmrc) el shim es inofensivo.
const almacen = new Map()
globalThis.localStorage = {
  getItem: (clave) => almacen.get(clave) ?? null,
  setItem: (clave, valor) => almacen.set(clave, String(valor)),
  removeItem: (clave) => almacen.delete(clave),
  clear: () => almacen.clear(),
}

vi.mock('@/services/marketing.js', () => ({
  listPublications: vi.fn(),
  listProjectsForPublications: vi.fn(),
  createPublication: vi.fn(),
  updatePublication: vi.fn(),
  deletePublication: vi.fn(),
}))

import MarketingPublicationsView from '@/views/MarketingPublicationsView.vue'
import {
  listPublications,
  listProjectsForPublications,
  updatePublication,
} from '@/services/marketing.js'

const publicacion = (overrides = {}) => ({
  id: 1,
  title: 'Lanzamiento de temporada',
  caption: 'Contenido de la publicacion',
  assetUrl: '',
  platform: 'INSTAGRAM',
  format: 'POST',
  status: 'DRAFT',
  projectId: 10,
  projectName: 'Proyecto A',
  scheduledFor: null,
  publishedAt: null,
  notes: '',
  ...overrides,
})

const montar = ({ data = [publicacion()], canManageMarketing = true, locale = 'es' } = {}) => {
  listPublications.mockResolvedValue({ data, capabilities: { canManageMarketing } })
  listProjectsForPublications.mockResolvedValue([{ id_proyecto: 10, nombre: 'Proyecto A' }])

  return mount(MarketingPublicationsView, {
    global: {
      plugins: [createI18n({ legacy: false, locale, fallbackLocale: 'en', messages: { es, en } })],
      stubs: { AppNavbar: true, BaseModal: true, Button: true },
    },
  })
}

const esperarTarjetas = async (wrapper, cantidad) =>
  vi.waitFor(() => expect(wrapper.findAll('.mkt-card')).toHaveLength(cantidad))

beforeEach(() => {
  vi.clearAllMocks()
  almacen.clear()
  setActivePinia(createPinia())
})

// HU-28 · Pantalla de administración de publicaciones.

describe('Listado', () => {
  it('muestra las publicaciones que devuelve el backend', async () => {
    const wrapper = montar({ data: [publicacion(), publicacion({ id: 2, title: 'Segunda' })] })
    await esperarTarjetas(wrapper, 2)

    expect(wrapper.text()).toContain('Lanzamiento de temporada')
    expect(wrapper.text()).toContain('Segunda')
  })

  it('avisa cuando no hay ninguna publicación todavía', async () => {
    const wrapper = montar({ data: [] })
    await vi.waitFor(() => expect(wrapper.text()).toContain(es.marketing.empty))
  })

  it('distingue el mensaje de vacío cuando hay filtros aplicados', async () => {
    const wrapper = montar({ data: [] })
    await vi.waitFor(() => expect(wrapper.text()).toContain(es.marketing.empty))

    await wrapper.findAll('.mkt-select')[0].setValue('SCHEDULED')
    await vi.waitFor(() => expect(wrapper.text()).toContain(es.marketing.emptyFiltered))
  })

  it('informa al usuario si la carga falla', async () => {
    listPublications.mockRejectedValue(new Error('Servidor caído'))
    listProjectsForPublications.mockResolvedValue([])

    const wrapper = mount(MarketingPublicationsView, {
      global: {
        plugins: [createI18n({ legacy: false, locale: 'es', fallbackLocale: 'en', messages: { es, en } })],
        stubs: { AppNavbar: true, BaseModal: true, Button: true },
      },
    })

    await vi.waitFor(() => expect(wrapper.find('.mkt-error').text()).toBe('Servidor caído'))
  })
})

describe('Filtros por estado, canal y proyecto', () => {
  it('el filtro de estado se delega al backend', async () => {
    const wrapper = montar()
    await esperarTarjetas(wrapper, 1)
    listPublications.mockClear()

    await wrapper.findAll('.mkt-select')[0].setValue('SCHEDULED')
    await vi.waitFor(() => expect(listPublications).toHaveBeenCalled())

    expect(listPublications.mock.calls.at(-1)[2]).toMatchObject({ status: 'SCHEDULED' })
  })

  it('el filtro de canal se delega al backend', async () => {
    const wrapper = montar()
    await esperarTarjetas(wrapper, 1)
    listPublications.mockClear()

    await wrapper.findAll('.mkt-select')[1].setValue('TIKTOK')
    await vi.waitFor(() => expect(listPublications).toHaveBeenCalled())

    expect(listPublications.mock.calls.at(-1)[2]).toMatchObject({ platform: 'TIKTOK' })
  })

  it('el filtro de proyecto se delega al backend', async () => {
    const wrapper = montar()
    await esperarTarjetas(wrapper, 1)
    // Los proyectos cargan en paralelo: sin su <option> el select no toma el valor.
    await vi.waitFor(() =>
      expect(wrapper.findAll('.mkt-select')[2].findAll('option').length).toBeGreaterThan(1)
    )
    listPublications.mockClear()

    // Un <select> real entrega texto; el v-model lo resuelve al número del option.
    await wrapper.findAll('.mkt-select')[2].setValue('10')
    await vi.waitFor(() => expect(listPublications).toHaveBeenCalled())

    expect(listPublications.mock.calls.at(-1)[2]).toMatchObject({ projectId: 10 })
  })

  it('limpiar filtros vuelve a pedir el listado completo', async () => {
    const wrapper = montar()
    await esperarTarjetas(wrapper, 1)

    await wrapper.findAll('.mkt-select')[0].setValue('SCHEDULED')
    await vi.waitFor(() => expect(wrapper.find('.mkt-clear').exists()).toBe(true))

    await wrapper.find('.mkt-clear').trigger('click')
    await vi.waitFor(() =>
      expect(listPublications.mock.calls.at(-1)[2]).toMatchObject({ status: '', platform: '', projectId: '' })
    )
  })
})

describe('Acciones de ciclo de vida', () => {
  it('un borrador ofrece programar y publicar', async () => {
    const wrapper = montar()
    await esperarTarjetas(wrapper, 1)

    const acciones = wrapper.findAll('.mkt-action--primary').map((boton) => boton.text())
    expect(acciones).toEqual([es.marketing.actions.SCHEDULED, es.marketing.actions.PUBLISHED])
  })

  it('una publicada no ofrece ninguna acción de estado', async () => {
    const wrapper = montar({
      data: [publicacion({ status: 'PUBLISHED', publishedAt: '2026-08-01T09:00:00Z' })],
    })
    await esperarTarjetas(wrapper, 1)

    expect(wrapper.findAll('.mkt-action--primary')).toHaveLength(0)
  })

  it('publicar un borrador manda el cambio de estado al backend', async () => {
    const wrapper = montar()
    await esperarTarjetas(wrapper, 1)

    const publicar = wrapper.findAll('.mkt-action--primary')[1]
    await publicar.trigger('click')

    await vi.waitFor(() => expect(updatePublication).toHaveBeenCalled())
    expect(updatePublication.mock.calls.at(-1).at(-1)).toEqual({ status: 'PUBLISHED' })
  })

  it('programar sin fecha pide la fecha en vez de mandar una petición condenada al 400', async () => {
    const wrapper = montar()
    await esperarTarjetas(wrapper, 1)

    await wrapper.findAll('.mkt-action--primary')[0].trigger('click')

    expect(updatePublication).not.toHaveBeenCalled()
    expect(wrapper.vm.showScheduleModal).toBe(true)
  })

  it('programar una que ya trae fecha va directo al backend', async () => {
    const wrapper = montar({
      data: [publicacion({ scheduledFor: '2026-09-01T10:00:00Z' })],
    })
    await esperarTarjetas(wrapper, 1)

    await wrapper.findAll('.mkt-action--primary')[0].trigger('click')

    await vi.waitFor(() => expect(updatePublication).toHaveBeenCalled())
    expect(updatePublication.mock.calls.at(-1).at(-1)).toEqual({ status: 'SCHEDULED' })
  })

  it('un error de transición se muestra en la propia tarjeta', async () => {
    updatePublication.mockRejectedValue(new Error('A publication cannot move from PUBLISHED to DRAFT.'))
    const wrapper = montar()
    await esperarTarjetas(wrapper, 1)

    await wrapper.findAll('.mkt-action--primary')[1].trigger('click')

    await vi.waitFor(() =>
      expect(wrapper.find('.mkt-row-error').text()).toContain('cannot move from PUBLISHED')
    )
  })
})

describe('Permisos por rol', () => {
  it('quien no gestiona marketing no ve acciones de escritura', async () => {
    const wrapper = montar({ canManageMarketing: false })
    await esperarTarjetas(wrapper, 1)

    expect(wrapper.find('.mkt-actions').exists()).toBe(false)
  })

  it('quien sí gestiona ve editar y eliminar', async () => {
    const wrapper = montar({ canManageMarketing: true })
    await esperarTarjetas(wrapper, 1)

    const acciones = wrapper.find('.mkt-actions').findAll('.mkt-action').map((boton) => boton.text())
    expect(acciones).toContain(es.marketing.actions.edit)
    expect(acciones).toContain(es.marketing.actions.delete)
  })
})

describe('Idioma', () => {
  it('la pantalla se traduce al inglés sin dejar claves crudas a la vista', async () => {
    const wrapper = montar({ locale: 'en' })
    await esperarTarjetas(wrapper, 1)

    expect(wrapper.text()).toContain(en.marketing.title)
    expect(wrapper.text()).toContain(en.marketing.status.DRAFT)
    expect(wrapper.text()).not.toContain('marketing.')
  })
})
