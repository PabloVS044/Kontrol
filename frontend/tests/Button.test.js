import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Button from '@/components/UI/Button/Button.vue'

describe('Button.vue (componente UI)', () => {
  it('renderiza la etiqueta recibida por props', () => {
    const wrapper = mount(Button, { props: { label: 'Guardar' } })
    expect(wrapper.text()).toBe('Guardar')
  })

  it('usa los valores por defecto: label "Button" y type "button"', () => {
    const wrapper = mount(Button)
    expect(wrapper.text()).toBe('Button')
    expect(wrapper.attributes('type')).toBe('button')
  })

  it('aplica el atributo type recibido (submit)', () => {
    const wrapper = mount(Button, { props: { type: 'submit' } })
    expect(wrapper.attributes('type')).toBe('submit')
  })

  it('emite el evento click exactamente una vez al hacer clic', async () => {
    const wrapper = mount(Button, { props: { label: 'Enviar' } })
    await wrapper.trigger('click')
    // Regresión del bug encontrado: sin `emits: ['click']` declarado,
    // Vue duplicaba el evento (click nativo + $emit manual)
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('respeta la prop disabled en el DOM', () => {
    const wrapper = mount(Button, { props: { disabled: true } })
    expect(wrapper.attributes('disabled')).toBeDefined()
  })

  it('inyecta los colores como variables CSS', () => {
    const wrapper = mount(Button, {
      props: { backColor: '#ff0000', hoverBack: '#00ff00' },
    })
    const style = wrapper.attributes('style')
    expect(style).toContain('--background: #ff0000')
    expect(style).toContain('--hoverBack: #00ff00')
  })
})
