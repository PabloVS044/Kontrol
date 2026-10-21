#!/usr/bin/env node
// licenses-report.mjs — Inventario de licencias de terceros y atribuciones.
// Lee los SBOM CycloneDX que genera `npm run licenses:sbom` y escribe:
//   docs/legal/licencias/inventario.md        tabla completa por paquete
//   frontend/public/THIRD-PARTY-NOTICES.txt   avisos de las dependencias de
//                                             producción, servido con la app
//
// Uso: npm run licenses   (regenera los SBOM y después este reporte)
//
// El texto de cada licencia sale del archivo LICENSE/COPYING del paquete en
// node_modules, así que hay que correrlo con las dependencias instaladas.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SBOM_DIR = join(ROOT, 'docs', 'legal', 'licencias')
const INVENTORY_PATH = join(SBOM_DIR, 'inventario.md')
const NOTICES_PATH = join(ROOT, 'frontend', 'public', 'THIRD-PARTY-NOTICES.txt')

// Declaran la licencia con el campo antiguo `licenses` de npm, que el SBOM no
// recoge. Verificadas a mano contra el archivo LICENSE del paquete.
const MANUAL_LICENSES = { 'xmlhttprequest-ssl': 'MIT' }

const PERMISSIVE = new Set([
  '0BSD', 'Apache-2.0', 'BlueOak-1.0.0', 'BSD-2-Clause', 'BSD-3-Clause', 'CC-BY-3.0',
  'CC-BY-4.0', 'CC0-1.0', 'ISC', 'MIT', 'MIT-0', 'Python-2.0', 'Unlicense', 'Zlib',
])
const WEAK_COPYLEFT = /^(LGPL|MPL|EPL|CDDL|EUPL)-/
const STRONG_COPYLEFT = /^(GPL|AGPL|SSPL)-/
const CATEGORY_ORDER = [
  'Copyleft fuerte', 'Copyleft débil', 'Licencia propia', 'Sin declarar',
  'Permisiva por elección', 'Permisiva',
]

const readJson = (...path) => JSON.parse(readFileSync(join(ROOT, ...path), 'utf8'))
const all = readJson('docs', 'legal', 'licencias', 'sbom.cdx.json')
const production = readJson('docs', 'legal', 'licencias', 'sbom-produccion.cdx.json')

// Los workspaces propios aparecen en el SBOM como enlaces bajo node_modules:
// se reconocen por nombre, no por ruta.
const WORKSPACES = new Set(readJson('package.json').workspaces.map((w) => readJson(w, 'package.json').name))

const fullName = (c) => (c.group ? `${c.group}/` : '') + c.name
const property = (c, name) => c.properties?.find((p) => p.name === name)?.value
const isWorkspace = (c) => WORKSPACES.has(fullName(c))
const dependsOn = (ref) => all.dependencies.find((d) => d.ref === ref)?.dependsOn ?? []

function licenseOf(c) {
  const declared = (c.licenses ?? [])
    .map((l) => l.expression ?? l.license?.id ?? l.license?.name)
    .filter(Boolean)
  if (declared.length) return declared.join(' AND ')
  return MANUAL_LICENSES[fullName(c)] ?? null
}

const idsOf = (expr) =>
  expr.replace(/[()]/g, ' ').split(/\s+/).filter((t) => t && !['AND', 'OR', 'WITH'].includes(t))
const isKnown = (id) => PERMISSIVE.has(id) || WEAK_COPYLEFT.test(id) || STRONG_COPYLEFT.test(id)

/** Primera alternativa de una expresión «A OR B» que es toda permisiva. */
function permissiveChoice(expr) {
  if (!/\sOR\s/.test(expr)) return null
  return expr.replace(/[()]/g, '').split(/\s+OR\s+/).find((alt) => idsOf(alt).every((id) => PERMISSIVE.has(id))) ?? null
}

function categoryOf(expr) {
  if (!expr) return 'Sin declarar'
  const ids = idsOf(expr)
  if (!ids.every(isKnown)) return 'Licencia propia'
  if (permissiveChoice(expr)) return 'Permisiva por elección'
  if (ids.some((id) => STRONG_COPYLEFT.test(id))) return 'Copyleft fuerte'
  if (ids.some((id) => WEAK_COPYLEFT.test(id))) return 'Copyleft débil'
  return 'Permisiva'
}

const workspaceRefs = all.components.filter(isWorkspace).map((c) => c['bom-ref'])
const directRefs = new Set(
  [all.metadata.component['bom-ref'], ...workspaceRefs].flatMap(dependsOn),
)
const productionRefs = new Set(production.components.map((c) => c['bom-ref']))

const packages = all.components
  .filter((c) => !isWorkspace(c))
  .map((c) => {
    const license = licenseOf(c)
    return {
      component: c,
      name: fullName(c),
      version: c.version,
      license,
      usedUnder: license ? permissiveChoice(license) : null,
      manual: !(c.licenses ?? []).length && license !== null,
      category: categoryOf(license),
      scope: productionRefs.has(c['bom-ref']) ? 'Producción' : 'Desarrollo',
      relation: directRefs.has(c['bom-ref']) ? 'Directa' : 'Transitiva',
    }
  })
  .sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version))

// ─── Inventario ─────────────────────────────────────────────────────────────
const tools = all.metadata.tools.components.map((t) => `${t.name} ${t.version}`).join(', ')
const count = (filter) => packages.filter(filter).length

const summaryRows = CATEGORY_ORDER.map((category) => {
  const prod = count((p) => p.category === category && p.scope === 'Producción')
  const dev = count((p) => p.category === category && p.scope === 'Desarrollo')
  return `| ${category} | ${prod} | ${dev} | ${prod + dev} |`
})

const licenseCell = (p) => {
  if (!p.license) return '—'
  if (p.usedUnder) return `${p.license} → se usa bajo **${p.usedUnder}**`
  return p.manual ? `${p.license} (verificada a mano)` : p.license
}
const table = (scope) => [
  '| Paquete | Versión | Relación | Licencia | Categoría |',
  '| --- | --- | --- | --- | --- |',
  ...packages
    .filter((p) => p.scope === scope)
    .map((p) => `| \`${p.name}\` | ${p.version} | ${p.relation} | ${licenseCell(p)} | ${p.category} |`),
]

const inventory = [
  '# Inventario de licencias de terceros',
  '',
  '> Generado por `scripts/licenses-report.mjs` a partir de los SBOM de esta carpeta. No se edita a mano: `npm run licenses` lo regenera.',
  '',
  `Herramienta: ${tools}. Especificación CycloneDX ${all.specVersion}, construida desde \`package-lock.json\` (\`--package-lock-only\`), así que incluye los binarios opcionales de todas las plataformas aunque no estén instalados.`,
  '',
  '- [`sbom.cdx.json`](sbom.cdx.json): árbol completo, producción y desarrollo.',
  '- [`sbom-produccion.cdx.json`](sbom-produccion.cdx.json): mismo árbol con `--omit dev`. Un paquete es de **producción** si aparece aquí; si no, es solo de **desarrollo**.',
  '- **Directa**: declarada en el `package.json` de la raíz, `frontend` o `backend`. **Transitiva**: la trae otra dependencia.',
  '',
  'Las obligaciones de cada licencia, su veredicto y el plan de acción están en [la auditoría](README.md); la licencia del propio Kontrol, en [la decisión de licencia](../licencia.md).',
  '',
  '## Resumen',
  '',
  `${packages.length} paquetes de terceros: ${count((p) => p.scope === 'Producción')} de producción y ${count((p) => p.scope === 'Desarrollo')} de desarrollo; ${count((p) => p.relation === 'Directa')} directos y ${count((p) => p.relation === 'Transitiva')} transitivos. No se cuentan los workspaces propios (\`@control/frontend\`, \`@control/backend\`).`,
  '',
  '| Categoría | Producción | Desarrollo | Total |',
  '| --- | --- | --- | --- |',
  ...summaryRows,
  '',
  '## Producción',
  '',
  ...table('Producción'),
  '',
  '## Desarrollo',
  '',
  ...table('Desarrollo'),
  '',
].join('\n')

// ─── Atribuciones ───────────────────────────────────────────────────────────
function licenseTexts(c) {
  const path = property(c, 'cdx:npm:package:path')
  const dir = path ? join(ROOT, path) : null
  if (!dir || !existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => /^(licen[cs]e|copying|notice)/i.test(f) && statSync(join(dir, f)).isFile())
    .sort()
    .map((f) => readFileSync(join(dir, f), 'utf8').trim())
}

const SEPARATOR = '='.repeat(78)
const notices = [
  'AVISOS DE COMPONENTES DE TERCEROS — THIRD-PARTY NOTICES',
  '',
  'Kontrol es software propietario: todos los derechos reservados por los',
  'integrantes de su equipo de desarrollo. Incluye los componentes de terceros',
  'que siguen, cada uno distribuido bajo su propia licencia.',
  '',
  'Kontrol is proprietary software, all rights reserved. It includes the',
  'following third-party components, each under its own license.',
  '',
  'Generado por scripts/licenses-report.mjs a partir de',
  'docs/legal/licencias/sbom-produccion.cdx.json (dependencias de producción).',
  '',
  ...packages
    .filter((p) => p.scope === 'Producción')
    .flatMap((p) => {
      const texts = licenseTexts(p.component)
      const author = p.component.author ? `Autor: ${p.component.author}` : null
      return [
        SEPARATOR,
        `${p.name}@${p.version}`,
        `Licencia: ${p.license ?? 'no declarada'}${p.usedUnder ? ` (se usa bajo ${p.usedUnder})` : ''}`,
        ...(author ? [author] : []),
        '',
        ...(texts.length
          ? texts
          : ['El paquete no incluye archivo de licencia; rige la licencia declarada arriba.']),
        '',
      ]
    }),
].join('\n')

writeFileSync(INVENTORY_PATH, inventory)
writeFileSync(NOTICES_PATH, notices)
console.log(`Inventario: ${packages.length} paquetes → ${INVENTORY_PATH}`)
console.log(`Atribuciones: ${count((p) => p.scope === 'Producción')} paquetes de producción → ${NOTICES_PATH}`)

const flagged = packages.filter((p) => !['Permisiva', 'Permisiva por elección'].includes(p.category))
for (const p of flagged) console.log(`Revisar: ${p.name}@${p.version} (${p.scope}) — ${p.license ?? 'sin licencia'} [${p.category}]`)
