import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
  createPublication,
  updatePublication,
  deletePublication,
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

// Los formularios de crear/editar/programar/eliminar viven dentro de BaseModal.
// Acá SÍ se monta el BaseModal real (se teletransporta a document.body) para
// poder rellenar los campos y disparar el submit nativo.
const montarConModales = ({ data = [publicacion()], canManageMarketing = true } = {}) => {
  listPublications.mockResolvedValue({ data, capabilities: { canManageMarketing } })
  listProjectsForPublications.mockResolvedValue([{ id_proyecto: 10, nombre: 'Proyecto A' }])

  const wrapper = mount(MarketingPublicationsView, {
    attachTo: document.body,
    global: {
      plugins: [createI18n({ legacy: false, locale: 'es', fallbackLocale: 'en', messages: { es, en } })],
      stubs: { AppNavbar: true },
    },
  })
  montados.push(wrapper)
  return wrapper
}

const setValor = (elemento, valor) => {
  elemento.value = valor
  elemento.dispatchEvent(new Event('input'))
  elemento.dispatchEvent(new Event('change'))
}

const esperarTarjetas = async (wrapper, cantidad) =>
  vi.waitFor(() => expect(wrapper.findAll('.mkt-card')).toHaveLength(cantidad))

let montados = []

beforeEach(() => {
  // reset (no solo clear): un mockRejectedValue de un test no debe sobrevivir al siguiente
  vi.resetAllMocks()
  almacen.clear()
  setActivePinia(createPinia())
})

afterEach(() => {
  montados.forEach((w) => w.unmount())
  montados = []
  document.body.innerHTML = ''
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

describe('Formulario de crear/editar (modal real)', () => {
  it('crear una publicación manda el payload construido al backend', async () => {
    const wrapper = montarConModales()
    await esperarTarjetas(wrapper, 1)

    await wrapper.find('.mkt-header button').trigger('click')
    expect(wrapper.vm.showModal).toBe(true)

    const [titulo, , fecha] = document.querySelectorAll('.mkt-form input')
    const [proyecto] = [...document.querySelectorAll('.mkt-form select')].slice(2)
    setValor(titulo, '  Nueva promo  ')
    setValor(proyecto, '10')
    void fecha // queda vacía a propósito: scheduledFor es opcional al crear

    await document.querySelector('.mkt-form button[type="submit"]').click()
    await wrapper.vm.$nextTick()

    await vi.waitFor(() => expect(createPublication).toHaveBeenCalled())
    expect(createPublication.mock.calls.at(-1).at(-1)).toMatchObject({
      title: 'Nueva promo',
      platform: 'INSTAGRAM',
      format: 'POST',
      projectId: 10,
      scheduledFor: null,
    })
    await vi.waitFor(() => expect(wrapper.vm.showModal).toBe(false))
  })

  it('editar precarga el formulario con los datos de la publicación', async () => {
    const wrapper = montarConModales({
      data: [publicacion({ caption: 'Texto original', notes: 'Nota interna' })],
    })
    await esperarTarjetas(wrapper, 1)

    const botonEditar = wrapper.findAll('.mkt-action').find((b) => b.text() === es.marketing.actions.edit)
    await botonEditar.trigger('click')

    const [titulo] = document.querySelectorAll('.mkt-form input')
    const [caption, notas] = document.querySelectorAll('.mkt-form textarea')
    expect(titulo.value).toBe('Lanzamiento de temporada')
    expect(caption.value).toBe('Texto original')
    expect(notas.value).toBe('Nota interna')

    setValor(titulo, 'Título editado')
    await document.querySelector('.mkt-form button[type="submit"]').click()

    await vi.waitFor(() => expect(updatePublication).toHaveBeenCalled())
    const [, , id, payload] = updatePublication.mock.calls.at(-1)
    expect(id).toBe(1)
    expect(payload).toMatchObject({ title: 'Título editado' })
  })

  it('un error al guardar se muestra en el modal y no lo cierra', async () => {
    createPublication.mockRejectedValue(new Error('El título ya existe'))
    const wrapper = montarConModales()
    await esperarTarjetas(wrapper, 1)

    await wrapper.find('.mkt-header button').trigger('click')
    const [titulo] = document.querySelectorAll('.mkt-form input')
    const [proyecto] = [...document.querySelectorAll('.mkt-form select')].slice(2)
    setValor(titulo, 'Promo')
    setValor(proyecto, '10')

    await document.querySelector('.mkt-form button[type="submit"]').click()

    await vi.waitFor(() => expect(document.querySelector('.mkt-error').textContent).toBe('El título ya existe'))
    expect(wrapper.vm.showModal).toBe(true)
  })

  it('cancelar cierra el modal sin llamar al backend', async () => {
    const wrapper = montarConModales()
    await esperarTarjetas(wrapper, 1)

    await wrapper.find('.mkt-header button').trigger('click')
    await document.querySelector('.mkt-form button[type="button"]').click()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.showModal).toBe(false)
    expect(createPublication).not.toHaveBeenCalled()
  })
})

describe('Modal de programación (modal real)', () => {
  it('programar con fecha manda el estado SCHEDULED y el timestamp formateado', async () => {
    const wrapper = montarConModales()
    await esperarTarjetas(wrapper, 1)

    const [programar] = wrapper.findAll('.mkt-action--primary')
    await programar.trigger('click')
    await vi.waitFor(() => expect(wrapper.vm.showScheduleModal).toBe(true))

    const fecha = document.querySelector('.mkt-form input[type="datetime-local"]')
    setValor(fecha, '2026-09-01T10:00')
    await document.querySelector('.mkt-form button[type="submit"]').click()

    await vi.waitFor(() => expect(updatePublication).toHaveBeenCalled())
    expect(updatePublication.mock.calls.at(-1).at(-1)).toEqual({
      status: 'SCHEDULED',
      scheduledFor: '2026-09-01 10:00:00',
    })
    await vi.waitFor(() => expect(wrapper.vm.showScheduleModal).toBe(false))
  })

  it('un error al programar se muestra y deja el modal abierto', async () => {
    updatePublication.mockRejectedValue(new Error('La fecha debe ser futura'))
    const wrapper = montarConModales()
    await esperarTarjetas(wrapper, 1)

    await wrapper.findAll('.mkt-action--primary')[0].trigger('click')
    await vi.waitFor(() => expect(wrapper.vm.showScheduleModal).toBe(true))

    setValor(document.querySelector('.mkt-form input[type="datetime-local"]'), '2026-09-01T10:00')
    await document.querySelector('.mkt-form button[type="submit"]').click()

    await vi.waitFor(() =>
      expect(document.querySelector('.mkt-error').textContent).toBe('La fecha debe ser futura')
    )
    expect(wrapper.vm.showScheduleModal).toBe(true)
  })
})

describe('Eliminar una publicación (modal real)', () => {
  it('confirmar el borrado llama al backend y refresca el listado', async () => {
    const wrapper = montarConModales()
    await esperarTarjetas(wrapper, 1)

    const botonEliminar = wrapper.findAll('.mkt-action').find((b) => b.text() === es.marketing.actions.delete)
    await botonEliminar.trigger('click')
    await vi.waitFor(() => expect(wrapper.vm.showDeleteModal).toBe(true))
    expect(document.querySelector('.mkt-hint').textContent).toContain('Lanzamiento de temporada')

    const botones = [...document.querySelectorAll('.mkt-form-actions button')]
    await botones.at(-1).click()

    await vi.waitFor(() => expect(deletePublication).toHaveBeenCalled())
    expect(deletePublication.mock.calls.at(-1).at(-1)).toBe(1)
    await vi.waitFor(() => expect(wrapper.vm.showDeleteModal).toBe(false))
  })

  it('un error al eliminar se muestra sin cerrar el modal', async () => {
    deletePublication.mockRejectedValue(new Error('No se puede eliminar: ya fue publicada'))
    const wrapper = montarConModales()
    await esperarTarjetas(wrapper, 1)

    const botonEliminar = wrapper.findAll('.mkt-action').find((b) => b.text() === es.marketing.actions.delete)
    await botonEliminar.trigger('click')
    await vi.waitFor(() => expect(wrapper.vm.showDeleteModal).toBe(true))

    const botones = [...document.querySelectorAll('.mkt-form-actions button')]
    await botones.at(-1).click()

    await vi.waitFor(() =>
      expect(document.querySelector('.mkt-error').textContent).toBe('No se puede eliminar: ya fue publicada')
    )
    expect(wrapper.vm.showDeleteModal).toBe(true)
  })

  it('cancelar cierra el modal de borrado sin llamar al backend', async () => {
    const wrapper = montarConModales()
    await esperarTarjetas(wrapper, 1)

    const botonEliminar = wrapper.findAll('.mkt-action').find((b) => b.text() === es.marketing.actions.delete)
    await botonEliminar.trigger('click')
    await vi.waitFor(() => expect(wrapper.vm.showDeleteModal).toBe(true))

    await document.querySelector('.mkt-form-actions button[type="button"]').click()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.showDeleteModal).toBe(false)
    expect(deletePublication).not.toHaveBeenCalled()
  })
})

describe('Detalles de la tarjeta', () => {
  it('una imagen rota se oculta en vez de romper la tarjeta', async () => {
    const wrapper = montar({ data: [publicacion({ assetUrl: 'https://ejemplo.test/roto.png' })] })
    await esperarTarjetas(wrapper, 1)

    const imagen = wrapper.find('.mkt-asset')
    expect(imagen.exists()).toBe(true)
    await imagen.trigger('error')

    expect(imagen.element.style.display).toBe('none')
  })

  it('una fecha inválida se muestra como "sin fecha" en vez de "Invalid Date"', async () => {
    const wrapper = montar({
      data: [publicacion({ status: 'PUBLISHED', publishedAt: 'no-es-una-fecha' })],
    })
    await esperarTarjetas(wrapper, 1)

    expect(wrapper.text()).toContain(es.marketing.card.noDate)
  })

  it('sin catálogo de proyectos (falla la carga), el filtro sigue usable', async () => {
    listPublications.mockResolvedValue({ data: [publicacion()], capabilities: { canManageMarketing: true } })
    listProjectsForPublications.mockRejectedValue(new Error('Servidor caído'))

    const wrapper = mount(MarketingPublicationsView, {
      global: {
        plugins: [createI18n({ legacy: false, locale: 'es', fallbackLocale: 'en', messages: { es, en } })],
        stubs: { AppNavbar: true, BaseModal: true, Button: true },
      },
    })
    await esperarTarjetas(wrapper, 1)

    const selectProyecto = wrapper.findAll('.mkt-select')[2]
    expect(selectProyecto.findAll('option')).toHaveLength(1) // solo "Todos los proyectos"
  })
})
