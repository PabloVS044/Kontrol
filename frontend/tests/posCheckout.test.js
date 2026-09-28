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

/**
 * Desglose del cobro (descuento e IVA).
 *
 * El modal enseñaba una sola cifra —el subtotal— llamada "total a cobrar",
 * mientras el descuento y el IVA vivían sin usarse en `utils/sales.js`. Estas
 * pruebas fijan que el desglose se muestre, que el descuento solo exista si la
 * empresa lo permite, y que el campo respete su tope antes de llegar al servidor.
 *
 * BaseModal se teletransporta al body, así que se consulta por `document`.
 */
describe('SaleCheckoutModal — desglose de descuento e IVA', () => {
  const abrir = (over = {}) =>
    montar(SaleCheckoutModal, { modelValue: true, items, ...over })

  const sinNada = { iva_activo: false, iva_tasa: 0, descuento_activo: false, descuento_max_pct: 0 }
  const conIva  = { iva_activo: true, iva_tasa: 0.12, descuento_activo: false, descuento_max_pct: 0 }
  const conTodo = { iva_activo: true, iva_tasa: 0.12, descuento_activo: true, descuento_max_pct: 20 }

  const textos = (sel) => [...document.querySelectorAll(sel)].map((n) => n.textContent)

  it('sin IVA ni descuento el total es el subtotal y no hay líneas extra', () => {
    abrir({ config: sinNada })

    expect(document.querySelector('.ct-value').textContent).toBe('$81.00')
    expect(document.querySelector('.cb-row--minus')).toBeNull()
    expect(document.querySelector('.checkout-discount')).toBeNull()
  })

  it('con IVA activo lo muestra como línea propia y lo suma al total', () => {
    abrir({ config: conIva })

    expect(textos('.cb-label').some((l) => l.includes('IVA (12%)'))).toBe(true)
    // 81 + 12% = 90.72
    expect(document.querySelector('.ct-value').textContent).toBe('$90.72')
  })

  it('el campo de descuento solo aparece si la empresa lo permite', () => {
    abrir({ config: conIva })
    expect(document.querySelector('.checkout-discount')).toBeNull()

    document.body.innerHTML = ''
    abrir({ config: conTodo })
    expect(document.querySelector('.checkout-discount')).not.toBeNull()
  })

  it('el descuento se aplica antes del IVA', () => {
    abrir({ config: conTodo, discountPercent: 10 })

    // 81 − 8.10 = 72.90; IVA 12% de 72.90 = 8.75; total 81.65
    const valores = textos('.cb-value')
    expect(valores).toContain('−$8.10')
    expect(valores).toContain('$8.75')
    expect(document.querySelector('.ct-value').textContent).toBe('$81.65')
  })

  it('anuncia el tope de descuento de la empresa', () => {
    abrir({ config: conTodo })

    expect(document.querySelector('.cd-max').textContent).toContain('20')
    expect(document.querySelector('.cd-input').getAttribute('max')).toBe('20')
  })

  it('recorta el descuento al tope al escribirlo, no al confirmar', () => {
    // Dejar pasar un 50 y que el servidor lo rechace descubre el problema con el
    // cliente ya esperando en el mostrador.
    const wrapper = abrir({ config: conTodo })
    const input = document.querySelector('.cd-input')

    input.value = '50'
    input.dispatchEvent(new Event('input'))

    const emitido = wrapper.emitted('update:discountPercent')
    expect(emitido[emitido.length - 1]).toEqual([20])
  })

  it('un descuento negativo se trata como cero', () => {
    const wrapper = abrir({ config: conTodo })
    const input = document.querySelector('.cd-input')

    input.value = '-5'
    input.dispatchEvent(new Event('input'))

    const emitido = wrapper.emitted('update:discountPercent')
    expect(emitido[emitido.length - 1]).toEqual([0])
  })

  it('con el descuento desactivado, un porcentaje suelto no se aplica', () => {
    // Defensa por si la config cambia con el modal abierto: el servidor lo
    // rechazaría, y aquí no debe pintarse un total que no se va a cobrar.
    abrir({ config: conIva, discountPercent: 30 })

    expect(document.querySelector('.cb-row--minus')).toBeNull()
    expect(document.querySelector('.ct-value').textContent).toBe('$90.72')
  })
})
