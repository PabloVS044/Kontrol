import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import es from '@/locales/es.json'
import en from '@/locales/en.json'
import ProductModal from '@/components/inventory/ProductModal.vue'

const tienda = { id_proyecto: 1, nombre: 'Tienda' }
const bodega = { id_proyecto: 4, nombre: 'Bodega' }

let wrapper

const montar = (props) => {
  wrapper = mount(ProductModal, {
    props: { modelValue: false, ...props },
    global: {
      plugins: [createI18n({ legacy: false, locale: 'es', fallbackLocale: 'en', messages: { es, en } })],
      stubs: { Teleport: true, BarcodeScanner: true },
    },
  })
  return wrapper
}

const proyectoElegido = () => wrapper.find('.modal-form select').element.value

beforeEach(() => {
  setActivePinia(createPinia())
})

afterEach(() => {
  wrapper?.unmount()
})

describe('ProductModal.vue — proyecto de destino', () => {
  it('con un solo proyecto, abre con ese proyecto elegido', async () => {
    montar({ projects: [tienda] })
    await wrapper.setProps({ modelValue: true })
    expect(proyectoElegido()).toBe('1')
  })

  it('prefiere el proyecto del filtro del catálogo si se puede escribir en él', async () => {
    montar({ projects: [tienda, bodega], defaultProjectId: 4 })
    await wrapper.setProps({ modelValue: true })
    expect(proyectoElegido()).toBe('4')
  })

  it('si la lista llega con el modal abierto, elige uno en vez de quedarse vacío', async () => {
    montar({ projects: [] })
    await wrapper.setProps({ modelValue: true })
    await wrapper.setProps({ projects: [bodega] })
    expect(proyectoElegido()).toBe('4')
  })

  it('el proyecto elegido viaja en el submit', async () => {
    montar({ projects: [tienda] })
    await wrapper.setProps({ modelValue: true })
    const campos = wrapper.findAll('.modal-form input')
    await campos[0].setValue('Clavos 3"')
    // Orden del formulario: precio de venta, stock mínimo, stock inicial, costo.
    const numericos = wrapper.findAll('.modal-form input[type="number"]')
    await numericos[0].setValue('10')
    await numericos[3].setValue('6')
    await wrapper.find('.modal-form').trigger('submit')

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({ id_proyecto: 1, nombre: 'Clavos 3"' })
  })
})
