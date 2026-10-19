import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import es from '@/locales/es.json'
import en from '@/locales/en.json'
import TaskModal from '@/components/projects/TaskModal.vue'

describe('TaskModal.vue (detalle de proyecto)', () => {
  it('monta los campos y acciones, y emite submit con el formulario', async () => {
    const wrapper = mount(TaskModal, {
      props: {
        modelValue: true,
        members: [{ id_usuario: 7, nombre: 'Ana', apellido: 'López' }],
      },
      global: {
        plugins: [createI18n({ legacy: false, locale: 'es', fallbackLocale: 'en', messages: { es, en } })],
        stubs: { teleport: true },
      },
    })

    expect(wrapper.findAll('input')).toHaveLength(2)
    expect(wrapper.findAll('select')).toHaveLength(3)
    expect(wrapper.find('textarea').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)

    await wrapper.find('input[type="text"]').setValue('Diseñar portada')
    await wrapper.findAll('select')[2].findAll('option')[1].setSelected()
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')[0][0]).toMatchObject({
      nombre: 'Diseñar portada',
      prioridad: 'MEDIA',
      estado: 'PENDIENTE',
      id_asignado: 7,
    })

    await wrapper.find('.btn-cancel').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })
})
