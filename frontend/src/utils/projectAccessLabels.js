/**
 * Permisos de proyecto en la interfaz.
 *
 * El nombre del permiso es un valor del esquema (`ver_inventario`,
 * `gestionar_tareas`…): se compara en el backend y viaja en los formularios.
 * Las etiquetas estaban escritas aquí en inglés, así que la lista de permisos
 * se quedaba en inglés aunque la app estuviera en español.
 *
 * Un permiso que no esté en el diccionario se muestra con su nombre crudo: es
 * más útil leer `aprobar_compras` que no ver nada.
 */

/** @param {{ t: Function, te?: Function }} i18n  de `useI18n()` */
export function projectPermissionLabel(name, { t, te } = {}) {
  if (!name) return ''
  if (typeof t !== 'function') return name
  const key = `projects.permissions.${name}`
  if (typeof te === 'function' && !te(key)) return name
  const label = t(key)
  // Sin `te` disponible, vue-i18n devuelve la clave cuando no existe.
  return label === key ? name : label
}

export function projectPermissionListLabel(names = [], i18n = {}) {
  if (!Array.isArray(names) || names.length === 0) return ''
  return names.map((name) => projectPermissionLabel(name, i18n)).join(', ')
}
