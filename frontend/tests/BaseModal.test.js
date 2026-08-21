import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseModal from '@/components/UI/Modal/BaseModal.vue'

describe('BaseModal.vue (componente UI)', () => {
  it('no renderiza nada cuando modelValue es false', () => {
    const wrapper = mount(BaseModal, { props: { modelValue: false } })
    expect(document.querySelector('.modal-overlay')).toBeNull()
    wrapper.unmount()
  })

  it('renderiza el overlay y el título cuando modelValue es true', () => {
    const wrapper = mount(BaseModal, { props: { modelValue: true, title: 'Editar' } })
    expect(document.querySelector('.modal-overlay')).not.toBeNull()
    expect(document.querySelector('.modal-title').textContent).toBe('Editar')
    wrapper.unmount()
  })

  it('aplica maxWidth como estilo inline del modal', () => {
    const wrapper = mount(BaseModal, { props: { modelValue: true, maxWidth: '600px' } })
    expect(document.querySelector('.modal').style.maxWidth).toBe('600px')
    wrapper.unmount()
  })

  it('el botón de cerrar emite update:modelValue en false', async () => {
    const wrapper = mount(BaseModal, { props: { modelValue: true } })
    await document.querySelector('.modal-close').click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    wrapper.unmount()
  })

  it('hacer click en el overlay (fuera del modal) cierra', async () => {
    const wrapper = mount(BaseModal, { props: { modelValue: true } })
    await document.querySelector('.modal-overlay').click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    wrapper.unmount()
  })

  it('hacer click dentro del contenido del modal no lo cierra', async () => {
    const wrapper = mount(BaseModal, { props: { modelValue: true } })
    await document.querySelector('.modal').click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    wrapper.unmount()
  })

  it('renderiza los slots header-prefix, header-title, header-actions y default', () => {
    const wrapper = mount(BaseModal, {
      props: { modelValue: true },
      slots: {
        'header-prefix': '<span class="prefix">P</span>',
        'header-title': '<span class="custom-title">Custom</span>',
        'header-actions': '<button class="extra-action">X</button>',
        default: '<p class="body-content">Contenido</p>',
      },
    })
    expect(document.querySelector('.prefix')).not.toBeNull()
    expect(document.querySelector('.custom-title').textContent).toBe('Custom')
    expect(document.querySelector('.extra-action')).not.toBeNull()
    expect(document.querySelector('.body-content').textContent).toBe('Contenido')
    wrapper.unmount()
  })
})
