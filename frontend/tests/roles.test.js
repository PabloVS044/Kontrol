import { describe, it, expect } from 'vitest'
import { createI18n } from 'vue-i18n'
import es from '@/locales/es.json'
import en from '@/locales/en.json'
import { translateRole } from '@/utils/roles.js'

/**
 * Roles en la interfaz (pruebas 9 y 10).
 *
 * El rol llega de la base de datos en inglés porque es un valor del esquema:
 * hay consultas y permisos que dependen de esa cadena. Salía a pantalla tal
 * cual, así que el perfil decía "COLLABORATOR" con la app en español.
 */
describe('translateRole', () => {
  const i18nDe = (locale) => {
    const { global } = createI18n({ legacy: false, locale, fallbackLocale: 'en', messages: { es, en } })
    return { t: global.t, te: global.te }
  }

  it('traduce los roles del esquema al idioma de la interfaz', () => {
    const es = i18nDe('es')
    expect(translateRole('collaborator', es)).toBe('Colaborador')
    expect(translateRole('owner', es)).toBe('Propietario')
    expect(translateRole('admin', es)).toBe('Administrador')
    expect(translateRole('manager', es)).toBe('Gerente')
    expect(translateRole('super_user', es)).toBe('Superusuario')
  })

  it('en inglés mantiene los nombres en inglés, con mayúscula de etiqueta', () => {
    expect(translateRole('collaborator', i18nDe('en'))).toBe('Collaborator')
  })

  it('acepta el rol como venga: mayúsculas o espacios de sobra', () => {
    // La fuente es la base de datos, no un formulario: mejor tolerar.
    expect(translateRole(' COLLABORATOR ', i18nDe('es'))).toBe('Colaborador')
  })

  it('un rol propio de la empresa se muestra como viene, no desaparece', () => {
    // Mejor leerlo en inglés que no leerlo.
    expect(translateRole('auditor_externo', i18nDe('es'))).toBe('auditor_externo')
  })

  it('sin rol no inventa texto', () => {
    expect(translateRole(null, i18nDe('es'))).toBe('')
    expect(translateRole('', i18nDe('es'))).toBe('')
  })
})

/**
 * Los dos diccionarios tienen que cubrir las mismas claves: una clave que
 * existe solo en inglés deja la pantalla en inglés sin que nadie se entere,
 * que es exactamente lo que encontraron los cinco participantes.
 */
describe('diccionarios en y es', () => {
  const planas = (obj, prefijo = '') =>
    Object.entries(obj).flatMap(([clave, valor]) =>
      valor !== null && typeof valor === 'object'
        ? planas(valor, `${prefijo}${clave}.`)
        : [`${prefijo}${clave}`],
    )

  it('cubren exactamente las mismas claves', () => {
    const enKeys = planas(en).sort()
    const esKeys = planas(es).sort()

    expect(esKeys.filter((k) => !enKeys.includes(k))).toEqual([])
    expect(enKeys.filter((k) => !esKeys.includes(k))).toEqual([])
  })

  it('el menú no usa un término en inglés como si fuera español', () => {
    // "Dashboard" era el término del diccionario español y el ejemplo que
    // anotaron los participantes.
    expect(es.navbar.dashboard).not.toBe(en.navbar.dashboard)
    expect(es.navbar.suppliers).toBe('Proveedores')
  })
})
