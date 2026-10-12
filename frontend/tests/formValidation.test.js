import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createI18n } from 'vue-i18n'
import es from '@/locales/es.json'
import en from '@/locales/en.json'
import { installLocalizedValidation } from '@/utils/formValidation.js'

/**
 * Avisos de los campos obligatorios (pruebas 9 y 10).
 *
 * El globo que muestra el navegador ("Please fill out this field.") está en el
 * idioma del navegador, no en el de la aplicación, así que aparecía en inglés
 * dentro de pantallas en español sin que el diccionario pudiera intervenir.
 */
describe('installLocalizedValidation', () => {
  let desinstalar
  let i18n

  const montar = (html, locale = 'es') => {
    document.body.innerHTML = html
    i18n = createI18n({ legacy: false, locale, fallbackLocale: 'en', messages: { es, en } })
    desinstalar = installLocalizedValidation(i18n.global.t)
    return document.querySelector('form')
  }

  /** Envía el formulario y devuelve el mensaje que vería quien lo usa. */
  const enviar = (form) => {
    const reportado = []
    form.querySelectorAll('input, select, textarea').forEach((el) => {
      el.reportValidity = vi.fn(() => reportado.push(el.validationMessage))
    })
    const evento = new Event('submit', { bubbles: true, cancelable: true })
    form.dispatchEvent(evento)
    return { evento, mensaje: reportado[0] }
  }

  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    desinstalar?.()
    document.body.innerHTML = ''
  })

  it('marca los formularios con novalidate para quedarse con el aviso', () => {
    // Sin esto el navegador bloquea el envío antes y pinta su propio globo.
    const form = montar('<form><input required /></form>')
    expect(form.hasAttribute('novalidate')).toBe(true)
  })

  it('un campo vacío avisa en el idioma de la aplicación', async () => {
    const form = montar('<form><input name="a" required /></form>', 'es')
    expect(enviar(form).mensaje).toBe('Completa este campo.')

    i18n.global.locale.value = 'en'
    expect(enviar(form).mensaje).toBe('Please fill out this field.')
  })

  it('un desplegable se elige, no se rellena', () => {
    const form = montar(
      '<form><select required><option value="">—</option><option value="1">1</option></select></form>',
    )
    expect(enviar(form).mensaje).toBe('Elige una opción.')
  })

  it('un correo mal escrito dice qué se espera', () => {
    const form = montar('<form><input type="email" value="hola" /></form>')
    expect(enviar(form).mensaje).toBe('Escribe un correo, como nombre@empresa.com.')
  })

  it('un número fuera de rango nombra el límite', () => {
    const form = montar('<form><input type="number" min="5" value="2" /></form>')
    expect(enviar(form).mensaje).toBe('Escribe 5 o más.')
  })

  it('un campo inválido detiene el envío', () => {
    // El formulario no debe llegar a su propio @submit con datos incompletos.
    const form = montar('<form><input required /></form>')
    expect(enviar(form).evento.defaultPrevented).toBe(true)
  })

  it('un formulario completo pasa sin tocar nada', () => {
    const form = montar('<form><input required value="algo" /></form>')
    const { evento, mensaje } = enviar(form)

    expect(evento.defaultPrevented).toBe(false)
    expect(mensaje).toBeUndefined()
  })

  it('al escribir se limpia el aviso, para que el campo pueda volver a ser válido', () => {
    // Un customValidity no vacío deja el campo inválido para siempre.
    const form = montar('<form><input required /></form>')
    enviar(form)

    const input = form.querySelector('input')
    expect(input.validationMessage).not.toBe('')

    input.value = 'algo'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    expect(input.checkValidity()).toBe(true)
  })

  it('cubre los formularios que se montan después, como los modales', async () => {
    montar('<form id="primero"><input required /></form>')

    const modal = document.createElement('div')
    modal.innerHTML = '<form id="segundo"><input required /></form>'
    document.body.appendChild(modal)
    // El MutationObserver entrega sus avisos en una microtarea.
    await Promise.resolve()

    expect(document.querySelector('#segundo').hasAttribute('novalidate')).toBe(true)
  })
})
