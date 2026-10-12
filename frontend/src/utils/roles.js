/**
 * Roles de empresa en la interfaz.
 *
 * El rol llega de la base de datos en inglés y en minúsculas —`owner`,
 * `admin`, `manager`, `collaborator`, `super_user`—, porque es un valor del
 * esquema: hay consultas, permisos y seeds que dependen de esa cadena. En las
 * pruebas 9 y 10 eso salía a la pantalla tal cual, así que el perfil decía
 * "COLLABORATOR" con la app en español.
 *
 * Aquí se traduce solo lo que se muestra; el valor que viaja al backend sigue
 * siendo el de la base de datos. Un rol que no esté en el diccionario se
 * muestra como viene en vez de desaparecer: una empresa puede tener roles
 * propios y es mejor leerlos en inglés que no leerlos.
 */

/** Roles del esquema → clave del diccionario. */
const ROLE_KEYS = {
  owner: 'roles.owner',
  admin: 'roles.admin',
  manager: 'roles.manager',
  collaborator: 'roles.collaborator',
  member: 'roles.member',
  super_user: 'roles.superUser',
}

/**
 * @param {string|null|undefined} rol  valor tal como viene de la base de datos
 * @param {{ t: Function, te?: Function }} i18n  de `useI18n()`
 */
export function translateRole(rol, { t, te } = {}) {
  if (!rol) return ''
  const key = ROLE_KEYS[String(rol).trim().toLowerCase()]
  if (!key || typeof t !== 'function') return rol
  // `te` evita que un diccionario incompleto pinte la clave cruda en pantalla.
  if (typeof te === 'function' && !te(key)) return rol
  return t(key)
}

export { ROLE_KEYS }
