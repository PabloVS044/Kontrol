import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import es from '@/locales/es.json'
import en from '@/locales/en.json'
import MarketingCalendar from '@/components/Marketing/MarketingCalendar.vue'

// HU-32 · Vista de calendario de publicaciones programadas.

const pad = (n) => String(n).padStart(2, '0')
const dayKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const asLocalTimestamp = (date) => `${dayKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`

const publicacion = (overrides = {}) => ({
  id: 1,
  title: 'Lanzamiento',
  status: 'DRAFT',
  scheduledFor: null,
  publishedAt: null,
  ...overrides,
})

const montar = (props = {}, locale = 'es') =>
  mount(MarketingCalendar, {
    props: { publications: [], canManage: true, ...props },
    global: {
      plugins: [createI18n({ legacy: false, locale, fallbackLocale: 'en', messages: { es, en } })],
    },
  })

describe('Grilla del mes', () => {
  it('muestra los 7 nombres de día de la semana', () => {
    const wrapper = montar()
    expect(wrapper.findAll('.mkt-cal-weekday')).toHaveLength(7)
  })

  it('pinta siempre 42 celdas (6 semanas), sin importar el mes', () => {
    const wrapper = montar()
    expect(wrapper.findAll('.mkt-cal-day')).toHaveLength(42)
  })
})

describe('Ubicación de publicaciones en la grilla', () => {
  it('una programada se ubica en su scheduledFor', () => {
    const now = new Date()
    const dia = new Date(now.getFullYear(), now.getMonth(), 15, 10, 0, 0)

    const wrapper = montar({
      publications: [publicacion({ status: 'SCHEDULED', scheduledFor: asLocalTimestamp(dia) })],
    })

    const celda = wrapper.find(`[data-key="${dayKey(dia)}"]`)
    expect(celda.exists()).toBe(true)
    expect(celda.text()).toContain('Lanzamiento')
  })

  it('una publicada se ubica en su publishedAt, no en scheduledFor', () => {
    const now = new Date()
    const dia = new Date(now.getFullYear(), now.getMonth(), 20, 9, 0, 0)

    const wrapper = montar({
      publications: [
        publicacion({ status: 'PUBLISHED', scheduledFor: null, publishedAt: asLocalTimestamp(dia) }),
      ],
    })

    const celda = wrapper.find(`[data-key="${dayKey(dia)}"]`)
    expect(celda.text()).toContain('Lanzamiento')
  })

  it('sin fecha no aparece en ninguna celda y se cuenta aparte', () => {
    const wrapper = montar({
      publications: [publicacion({ id: 1 }), publicacion({ id: 2 })],
    })

    expect(wrapper.find('.mkt-cal-event').exists()).toBe(false)
    expect(wrapper.find('.mkt-cal-undated').text()).toContain('2')
  })

  it('una fecha inválida se trata igual que sin fecha, no rompe la grilla', () => {
    const wrapper = montar({
      publications: [publicacion({ status: 'SCHEDULED', scheduledFor: 'no-es-una-fecha' })],
    })

    expect(wrapper.find('.mkt-cal-event').exists()).toBe(false)
    expect(wrapper.find('.mkt-cal-undated').text()).toContain('1')
  })
})

describe('Interacción', () => {
  it('quien gestiona puede crear una publicación desde un día', async () => {
    const wrapper = montar({ canManage: true })
    await wrapper.find('.mkt-cal-day-add').trigger('click')

    expect(wrapper.emitted('create-on-day')).toBeTruthy()
    expect(wrapper.emitted('create-on-day')[0][0]).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('quien no gestiona no ve el botón de crear en los días', () => {
    const wrapper = montar({ canManage: false })
    expect(wrapper.find('.mkt-cal-day-add').exists()).toBe(false)
  })

  it('hacer clic en una publicación emite select-publication y no dispara la creación', async () => {
    const now = new Date()
    const dia = new Date(now.getFullYear(), now.getMonth(), 15, 10, 0, 0)
    const publicacionProgramada = publicacion({ status: 'SCHEDULED', scheduledFor: asLocalTimestamp(dia) })

    const wrapper = montar({ publications: [publicacionProgramada] })
    await wrapper.find('.mkt-cal-event').trigger('click')

    expect(wrapper.emitted('select-publication')[0][0]).toEqual(publicacionProgramada)
    expect(wrapper.emitted('create-on-day')).toBeFalsy()
  })
})

describe('Navegación entre meses', () => {
  it('mes siguiente y mes anterior cambian el label y vuelven al mismo', async () => {
    const wrapper = montar()
    const labelInicial = wrapper.find('.mkt-cal-month').text()

    await wrapper.find(`[aria-label="${es.marketing.calendar.nextMonth}"]`).trigger('click')
    expect(wrapper.find('.mkt-cal-month').text()).not.toBe(labelInicial)

    await wrapper.find(`[aria-label="${es.marketing.calendar.prevMonth}"]`).trigger('click')
    expect(wrapper.find('.mkt-cal-month').text()).toBe(labelInicial)
  })

  it('"Hoy" vuelve al mes actual tras haber navegado', async () => {
    const wrapper = montar()
    const labelInicial = wrapper.find('.mkt-cal-month').text()

    await wrapper.find(`[aria-label="${es.marketing.calendar.nextMonth}"]`).trigger('click')
    await wrapper.find(`[aria-label="${es.marketing.calendar.nextMonth}"]`).trigger('click')
    await wrapper.find('.mkt-cal-today').trigger('click')

    expect(wrapper.find('.mkt-cal-month').text()).toBe(labelInicial)
  })
})

describe('Colores de estado', () => {
  it('usa tokens --k-* de SCRUM-12, no colores sueltos', () => {
    const now = new Date()
    const dia = new Date(now.getFullYear(), now.getMonth(), 15, 10, 0, 0)

    const wrapper = montar({
      publications: [publicacion({ status: 'SCHEDULED', scheduledFor: asLocalTimestamp(dia) })],
    })

    const evento = wrapper.find('.mkt-cal-event')
    expect(evento.attributes('style')).toMatch(/var\(--k-/)
  })
})

describe('Idioma', () => {
  it('se traduce al inglés sin dejar claves crudas a la vista', () => {
    const wrapper = montar({}, 'en')
    expect(wrapper.text()).toContain(en.marketing.calendar.today)
    expect(wrapper.text()).not.toContain('marketing.')
  })
})
