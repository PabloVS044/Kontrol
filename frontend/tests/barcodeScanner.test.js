import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import es from '@/locales/es.json'
import en from '@/locales/en.json'
import BarcodeScanner from '@/components/inventory/BarcodeScanner.vue'

/**
 * ZXing mockeado: lo que se verifica aquí es el arranque de la cámara y el
 * antirrebote del componente, no la decodificación, que es de la librería.
 * `decodeFromConstraints` guarda el callback para poder simular lecturas.
 */
let decodeImpl = null
let ultimoCallback = null

vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: class {
    async decodeFromConstraints(_constraints, _video, callback) {
      ultimoCallback = callback
      if (decodeImpl) return decodeImpl()
      return { stop() {} }
    }
  },
}))

vi.mock('@zxing/library', () => ({
  DecodeHintType: { TRY_HARDER: 'TRY_HARDER', POSSIBLE_FORMATS: 'POSSIBLE_FORMATS' },
  // Cualquier formato que pida el componente resuelve a su propio nombre.
  BarcodeFormat: new Proxy({}, { get: (_t, k) => String(k) }),
}))

/** Simula que la cámara ha leído un código. */
const emitirLectura = (text) => ultimoCallback?.({ getText: () => text })

// El antirrebote se mide con Date.now(), así que el reloj se controla en vez de
// esperar 1,5 s reales en cada prueba.
let ahora = 1_000_000
const avanzarAntirrebote = () => { ahora += 2000 }

const setMediaDevices = (value) =>
  Object.defineProperty(navigator, 'mediaDevices', { value, configurable: true, writable: true })

const setSecureContext = (value) =>
  Object.defineProperty(window, 'isSecureContext', { value, configurable: true, writable: true })

/** `start()` encadena nextTick + dos imports dinámicos antes de resolver. */
const flush = async () => {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve()
    await new Promise((r) => setTimeout(r, 0))
  }
}

/**
 * Panel de confirmación del escáner (SCRUM-19).
 *
 * Escanear ya no mete nada en el carrito: muestra el producto leído con un
 * selector de cantidad y espera un "Agregar" explícito. Estas pruebas fijan ese
 * contrato —qué se emite, cuándo, y con qué cantidad— y sobre todo los topes,
 * que son lo que evita comprometer más unidades de las que hay en stock.
 *
 * El componente solo enciende la cámara cuando `modelValue` pasa de false a
 * true, así que montarlo ya abierto renderiza el panel sin tocar getUserMedia.
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

let mounted = []
const montar = (props = {}) => {
  const wrapper = mount(BarcodeScanner, {
    attachTo: document.body,
    props: { modelValue: true, ...props },
    global: { plugins: [i18n()] },
  })
  mounted.push(wrapper)
  return wrapper
}

const pendiente = (over = {}) => ({ product: producto(), max: 10, inCart: 0, ...over })

beforeEach(() => {
  decodeImpl = null
  ultimoCallback = null
  ahora = 1_000_000
  vi.spyOn(Date, 'now').mockImplementation(() => ahora)
})

afterEach(() => {
  mounted.forEach((w) => w.unmount())
  mounted = []
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('BarcodeScanner — panel de confirmación', () => {
  it('sin lectura pendiente no muestra el panel', () => {
    const wrapper = montar()
    expect(wrapper.find('.scan-confirm').exists()).toBe(false)
  })

  it('muestra el nombre, el precio y lo disponible del producto leído', () => {
    const wrapper = montar({ pending: pendiente() })

    expect(wrapper.find('.sc-name').text()).toBe('Café molido 500g')
    const meta = wrapper.find('.sc-meta').text()
    expect(meta).toContain('$25.50')
    expect(meta).toContain('Disponible: 10')
  })

  it('avisa de lo que ya está en la venta sin tratarlo como error', () => {
    const wrapper = montar({ pending: pendiente({ inCart: 3, max: 7 }) })

    const meta = wrapper.find('.sc-meta').text()
    expect(meta).toContain('ya en la venta: 3')
    expect(meta).toContain('Disponible: 7')
    // El duplicado se informa en el panel, no como banner rojo.
    expect(wrapper.find('.scanner-msg.err').exists()).toBe(false)
  })

  it('arranca en una unidad y los pasos la suben y la bajan', async () => {
    const wrapper = montar({ pending: pendiente() })
    const input = wrapper.find('.sc-qty-input')
    const [menos, mas] = wrapper.findAll('.sc-step')

    expect(input.element.value).toBe('1')
    await mas.trigger('click')
    await mas.trigger('click')
    expect(input.element.value).toBe('3')
    await menos.trigger('click')
    expect(input.element.value).toBe('2')
  })

  it('no deja bajar de una unidad ni pasar del stock disponible', async () => {
    const wrapper = montar({ pending: pendiente({ max: 2 }) })
    const [menos, mas] = wrapper.findAll('.sc-step')

    expect(menos.attributes('disabled')).toBeDefined()

    await mas.trigger('click')
    expect(wrapper.find('.sc-qty-input').element.value).toBe('2')
    expect(mas.attributes('disabled')).toBeDefined()
  })

  it('recorta una cantidad escrita a mano por encima del stock', async () => {
    const wrapper = montar({ pending: pendiente({ max: 4 }) })
    const input = wrapper.find('.sc-qty-input')

    await input.setValue('99')
    expect(wrapper.find('.sc-qty-input').element.value).toBe('4')

    await input.setValue('0')
    expect(wrapper.find('.sc-qty-input').element.value).toBe('1')
  })

  it('agregar emite confirm con la cantidad elegida', async () => {
    const wrapper = montar({ pending: pendiente() })

    await wrapper.findAll('.sc-step')[1].trigger('click')
    await wrapper.find('.sc-add').trigger('click')

    expect(wrapper.emitted('confirm')).toEqual([[2]])
  })

  it('descartar emite cancel y no confirma nada', async () => {
    const wrapper = montar({ pending: pendiente() })

    await wrapper.find('.sc-discard').trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })

  it('una lectura nueva reinicia la cantidad', async () => {
    const wrapper = montar({ pending: pendiente() })
    await wrapper.findAll('.sc-step')[1].trigger('click')
    expect(wrapper.find('.sc-qty-input').element.value).toBe('2')

    await wrapper.setProps({
      pending: pendiente({ product: producto({ id_producto: 2, nombre: 'Azúcar 1kg' }) }),
    })

    expect(wrapper.find('.sc-qty-input').element.value).toBe('1')
    expect(wrapper.find('.sc-name').text()).toBe('Azúcar 1kg')
  })

  it('el permiso de cámara denegado manda sobre el feedback del padre', () => {
    // Sin panel pendiente, el banner sigue siendo el canal de los errores.
    const wrapper = montar({ feedback: { type: 'err', msg: 'Sin producto para el código 123.' } })
    expect(wrapper.find('.scanner-msg').classes()).toContain('err')
    expect(wrapper.find('.scanner-msg').text()).toBe('Sin producto para el código 123.')
  })
})

/* ── Arranque de la cámara ──────────────────────────────────────────────────
 *
 * Se monta cerrado y se abre con `setProps`, que es lo que dispara `start()`.
 * ZXing está mockeado arriba, así que estas pruebas no tocan hardware ni
 * dependen de permisos reales del navegador.
 */
describe('BarcodeScanner — arranque de la cámara', () => {
  const abrir = async (props = {}) => {
    const wrapper = montar({ modelValue: false, ...props })
    await wrapper.setProps({ modelValue: true })
    await flush()
    return wrapper
  }

  it('sin getUserMedia en contexto seguro informa de que no hay cámara', async () => {
    setMediaDevices(undefined)
    setSecureContext(true)

    const wrapper = await abrir()

    expect(wrapper.find('.scanner-msg').classes()).toContain('err')
    expect(wrapper.find('.scanner-msg').text()).toBe(es.inventory.scanner.noCamera)
  })

  it('sin getUserMedia fuera de contexto seguro señala el HTTPS', async () => {
    // Abrir la app por IP de LAN en http deja el objeto sin definir igual que si
    // no hubiera cámara; distinguirlo es lo que evita perseguir un fallo falso.
    setMediaDevices(undefined)
    setSecureContext(false)

    const wrapper = await abrir()

    expect(wrapper.find('.scanner-msg').text()).toBe(es.inventory.scanner.insecureContext)
  })

  it('permiso denegado se reporta como tal, no como avería', async () => {
    setMediaDevices({ getUserMedia: () => Promise.resolve({}) })
    setSecureContext(true)
    decodeImpl = () => { throw Object.assign(new Error('denied'), { name: 'NotAllowedError' }) }

    const wrapper = await abrir()

    expect(wrapper.find('.scanner-msg').classes()).toContain('err')
    expect(wrapper.find('.scanner-msg').text()).toBe(es.inventory.scanner.permissionError)
  })

  it('cualquier otro fallo de la cámara cae en el mensaje genérico', async () => {
    setMediaDevices({ getUserMedia: () => Promise.resolve({}) })
    setSecureContext(true)
    decodeImpl = () => { throw new Error('device busy') }

    const wrapper = await abrir()

    expect(wrapper.find('.scanner-msg').text()).toBe(es.inventory.scanner.noCamera)
  })

  it('una lectura emite detected una sola vez mientras el código sigue en cuadro', async () => {
    setMediaDevices({ getUserMedia: () => Promise.resolve({}) })
    setSecureContext(true)

    const wrapper = await abrir()

    emitirLectura('7501234567890')
    emitirLectura('7501234567890')

    expect(wrapper.emitted('detected')).toEqual([['7501234567890']])
  })

  it('con una lectura pendiente el mismo código no vuelve a dispararse', async () => {
    setMediaDevices({ getUserMedia: () => Promise.resolve({}) })
    setSecureContext(true)

    const wrapper = await abrir({ pending: null })
    emitirLectura('7501234567890')
    expect(wrapper.emitted('detected')).toHaveLength(1)

    // El producto sigue delante de la cámara mientras se ajusta la cantidad:
    // pasado el antirrebote, sin esta guarda la tarjeta se reiniciaría sola.
    await wrapper.setProps({ pending: pendiente() })
    avanzarAntirrebote()
    emitirLectura('7501234567890')

    expect(wrapper.emitted('detected')).toHaveLength(1)
  })

  it('un código distinto sí sustituye la lectura pendiente', async () => {
    setMediaDevices({ getUserMedia: () => Promise.resolve({}) })
    setSecureContext(true)

    const wrapper = await abrir({ pending: pendiente() })
    emitirLectura('111')
    emitirLectura('222')

    expect(wrapper.emitted('detected')).toEqual([['111'], ['222']])
  })
})
