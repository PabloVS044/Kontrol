/**
 * Mensajes de validación del navegador en el idioma de la aplicación.
 *
 * Los campos con `required`, `type="email"`, `min`, `maxlength`… los valida el
 * navegador, y el globo que muestra ("Please fill out this field.", "Completa
 * este campo") está en el idioma del NAVEGADOR, no en el de la aplicación. En
 * las pruebas 9 y 10 eso dejaba avisos en inglés dentro de pantallas en
 * español y al revés, sin que el diccionario pudiera hacer nada.
 *
 * La solución es tomar la validación en nuestras manos sin reescribir veinte
 * formularios:
 *
 *  1. Cada `<form>` recibe `novalidate`. El navegador deja de bloquear el
 *     envío por su cuenta —y de mostrar su propio globo—, pero sigue
 *     calculando el estado de validez de cada campo, que es lo que nos sirve.
 *  2. Un único escuchador en fase de captura intercepta el envío, busca el
 *     primer campo inválido, le pone nuestro mensaje con `setCustomValidity`
 *     y llama a `reportValidity()`: el globo es el del navegador, el texto es
 *     el nuestro.
 *  3. Al escribir se limpia el mensaje, porque un `customValidity` no vacío
 *     mantiene el campo inválido para siempre.
 *
 * Vive aquí y no en cada formulario a propósito: los modales se montan y se
 * destruyen todo el tiempo, y un `MutationObserver` cubre también los que
 * aparecen después del arranque.
 */

/** Campos que no se validan (botones, deshabilitados, `type="hidden"`…). */
function esValidable(el) {
  return typeof el?.checkValidity === 'function' && el.willValidate
}

/** Mensaje para el primer motivo de invalidez que encontremos. */
function mensajePara(el, t) {
  const v = el.validity

  if (v.valueMissing) {
    // Un desplegable o un grupo de opciones no se "rellena": se elige.
    const esSeleccion =
      el.tagName === 'SELECT' || el.type === 'radio' || el.type === 'checkbox'
    return esSeleccion ? t('validation.selectOption') : t('validation.required')
  }

  if (v.typeMismatch) {
    if (el.type === 'email') return t('validation.email')
    if (el.type === 'url') return t('validation.url')
    return t('validation.invalid')
  }

  if (v.tooShort) return t('validation.tooShort', { min: el.minLength })
  if (v.tooLong) return t('validation.tooLong', { max: el.maxLength })
  if (v.rangeUnderflow) return t('validation.min', { min: el.min })
  if (v.rangeOverflow) return t('validation.max', { max: el.max })
  if (v.stepMismatch) return t('validation.step', { step: el.step || 1 })
  if (v.badInput) return t('validation.number')
  if (v.patternMismatch) return t('validation.pattern')

  return t('validation.invalid')
}

/** Deja el campo libre de nuestro mensaje para que se revalide de cero. */
function limpiar(el) {
  if (typeof el?.setCustomValidity !== 'function') return
  // Comprobar antes evita invalidar la caché de validez en cada tecla.
  if (el.validationMessage) el.setCustomValidity('')
}

/**
 * @param {Function} t  el `t` global de vue-i18n. Se consulta en el momento de
 *   mostrar el aviso, así que cambiar de idioma no deja mensajes viejos.
 */
export function installLocalizedValidation(t) {
  if (typeof document === 'undefined') return () => {}

  const marcarFormulario = (form) => form.setAttribute('novalidate', '')
  const marcarTodos = (raiz) => {
    if (raiz instanceof HTMLFormElement) marcarFormulario(raiz)
    raiz.querySelectorAll?.('form:not([novalidate])').forEach(marcarFormulario)
  }

  marcarTodos(document)

  const observer = new MutationObserver((mutaciones) => {
    for (const mutacion of mutaciones) {
      for (const nodo of mutacion.addedNodes) {
        if (nodo.nodeType === 1) marcarTodos(nodo)
      }
    }
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })

  function onSubmit(event) {
    const form = event.target
    if (!(form instanceof HTMLFormElement)) return

    const invalido = [...form.elements].find(
      (el) => esValidable(el) && !el.checkValidity()
    )
    if (!invalido) return

    // En captura y antes de que corra el `@submit` del componente: el envío no
    // debe seguir adelante con un campo inválido.
    event.preventDefault()
    event.stopPropagation()

    invalido.setCustomValidity(mensajePara(invalido, t))
    invalido.reportValidity()
    invalido.focus?.()
  }

  function onInput(event) {
    limpiar(event.target)
  }

  document.addEventListener('submit', onSubmit, true)
  document.addEventListener('input', onInput, true)
  document.addEventListener('change', onInput, true)

  /** Para los tests, que montan y desmontan el entorno. */
  return function uninstall() {
    observer.disconnect()
    document.removeEventListener('submit', onSubmit, true)
    document.removeEventListener('input', onInput, true)
    document.removeEventListener('change', onInput, true)
  }
}
