/**
 * Datos públicos de la sección legal (/legal y el aviso de aceptación).
 *
 * Al cambiar el texto de los Términos o del Aviso de Privacidad, sube
 * LEGAL_VERSION y la fecha de `legal.updated` en los diccionarios: el aviso
 * vuelve a aparecer y todos tienen que aceptar la versión nueva.
 */
// 1.1 (PAY-1): cláusula 5, planes y pagos en modo de prueba con Stripe.
export const LEGAL_VERSION = '1.1'

// Va fuera del diccionario: vue-i18n interpreta la `@` como mensaje enlazado.
export const SUPPORT_EMAIL = 'support@kontrol.it.com'
