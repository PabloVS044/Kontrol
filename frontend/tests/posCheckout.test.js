import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import es from '@/locales/es.json'
import en from '@/locales/en.json'
import SaleCartPanel from '@/components/inventory/SaleCartPanel.vue'
import SaleCheckoutModal from '@/components/inventory/SaleCheckoutModal.vue'

/**
 * Flujo de cobro del POS (SCRUM-19).
 *
 * La migración visual introdujo un paso intermedio: el carrito ya no vende,
 * abre el modal de cobro y es la confirmación la que dispara el movimiento.
 * Estas pruebas fijan ese contrato —quién emite qué y con qué cifras— para que
 * un retoque de estilos no vuelva a dejar el POS vendiendo de un solo clic ni
 * mostrando un total distinto del que se registra.
 */

const i18n = () =>
  createI18n({ legacy: false, locale: 'es', fallbackLocale: 'en', messages: { es, en } })

const producto = (over = {}) => ({
  id_producto: 1,
  nombre: 'Café molido 500g',
  precio_venta: '25.50',
  stock_actual: 10,
  ...over,
})

const items = [
  { product: producto(), cantidad: 2 },
  { product: producto({ id_producto: 2, nombre: 'Azúcar 1kg', precio_venta: '10' }), cantidad: 3 },
]

// 25.50 × 2 + 10 × 3 = 81
const TOTAL = 81

let mounted = []
const montar = (componente, props) => {
  const wrapper = mount(componente, {
    attachTo: document.body,
    props,
    global: { plugins: [i18n()] },
  })
  mounted.push(wrapper)
  return wrapper
}

afterEach(() => {
  mounted.forEach((w) => w.unmount())
  mounted = []
  document.body.innerHTML = ''
})

describe('SaleCartPanel — carrito de venta', () => {
  it('muestra el subtotal de cada línea y el total recibido', () => {
    const wrapper = montar(SaleCartPanel, { items, total: TOTAL })

    const subtotales = wrapper.findAll('.sale-item-subtotal').map((n) => n.text())
    expect(subtotales).toEqual(['$51.00', '$30.00'])
    expect(wrapper.find('.sale-total-value').text()).toBe('$81.00')
  })

  it('el botón de venta emite submit (abrir cobro), no vende por sí mismo', async () => {
    const wrapper = montar(SaleCartPanel, { items, total: TOTAL })

    await wrapper.find('.sale-submit').trigger('click')

    expect(wrapper.emitted('submit')).toHaveLength(1)
  })

  it('deshabilita la venta mientras hay una en curso y con el carrito vacío', () => {
    const enCurso = montar(SaleCartPanel, { items, total: TOTAL, submitting: true })
    expect(enCurso.find('.sale-submit').attributes('disabled')).toBeDefined()

    const vacio = montar(SaleCartPanel, { items: [], total: 0 })
    expect(vacio.find('.sale-submit').attributes('disabled')).toBeDefined()
  })

  it('quitar un artículo emite remove con el producto', async () => {
    const wrapper = montar(SaleCartPanel, { items, total: TOTAL })

    await wrapper.findAll('.sale-item-remove')[1].trigger('click')

    expect(wrapper.emitted('remove')[0][0].id_producto).toBe(2)
  })

  it('pinta el error de venta con el color semántico de error', () => {
    const wrapper = montar(SaleCartPanel, { items, total: TOTAL, error: 'Sin stock' })
    expect(wrapper.find('.sale-error').text()).toBe('Sin stock')
  })
})

describe('SaleCheckoutModal — modal de cobro', () => {
  const abrir = (over = {}) =>
    montar(SaleCheckoutModal, { modelValue: true, items, total: TOTAL, ...over })

  it('no renderiza nada mientras está cerrado', () => {
    montar(SaleCheckoutModal, { modelValue: false, items, total: TOTAL })
    expect(document.querySelector('.checkout-body')).toBeNull()
  })

  it('lista los artículos y repite el mismo total que el carrito', () => {
    abrir()

    const lineas = [...document.querySelectorAll('.checkout-line')]
    expect(lineas).toHaveLength(2)
    expect(lineas[0].querySelector('.cl-qty').textContent).toBe('2×')
    expect(lineas[0].querySelector('.cl-name').textContent).toBe('Café molido 500g')
    expect(lineas[0].querySelector('.cl-amount').textContent).toBe('$51.00')
    expect(document.querySelector('.ct-value').textContent).toBe('$81.00')
  })

  it('confirmar emite confirm una sola vez', async () => {
    const wrapper = abrir()

    await document.querySelector('.btn-confirm').click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  it('volver cierra el diálogo', async () => {
    const wrapper = abrir()

    await document.querySelector('.btn-cancel').click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('con la venta en vuelo no se puede confirmar ni cerrar', async () => {
    const wrapper = abrir({ submitting: true })

    expect(document.querySelector('.btn-confirm').disabled).toBe(true)

    // El aspa de BaseModal sigue ahí, pero el setter del v-model ignora el
    // cierre: perder el diálogo a medio registrar dejaría al cajero sin saber
    // si el movimiento llegó a guardarse.
    await document.querySelector('.modal-close').click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('no deja confirmar un carrito vacío', () => {
    abrir({ items: [], total: 0 })
    expect(document.querySelector('.btn-confirm').disabled).toBe(true)
  })

  it('muestra el error de red dentro del diálogo', () => {
    abrir({ error: 'Error de red, intenta de nuevo.' })
    expect(document.querySelector('.checkout-error').textContent).toBe('Error de red, intenta de nuevo.')
  })
})
