#!/usr/bin/env node
// coverage-by-module.mjs — Cobertura de líneas por módulo funcional (TEST-2).
// Agrupa los `coverage-summary.json` de los dos workspaces según los módulos
// M01–M19 de docs/evidencia-pruebas.md §2. No cambia el denominador: cada
// archivo del reporte cae en un módulo o en «UI compartida», y la suma de
// todas las filas es igual al total global de cada workspace.
//
// Uso: npm run test:coverage -w backend && npm run test:coverage -w frontend
//      node scripts/coverage-by-module.mjs
import { readFileSync } from 'node:fs'
import { dirname, join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

// Primera regla que casa gana. Las rutas son relativas a `<workspace>/src/`.
const RULES = {
  backend: [
    ['M01', /^(controllers\/authController|routes\/authRoutes|schemas\/authSchemas|middleware\/(requireAuth|rateLimit))\.js$/],
    ['M02', /^(controllers|routes|schemas)\/user/],
    ['M03', /^((controllers|routes|schemas)\/company|services\/companyInvitationService|middleware\/(requireCompany|requireRole))/],
    ['M04', /^(controllers|routes|schemas)\/team/],
    ['M05', /^((controllers|routes|schemas)\/project|services\/project|middleware\/requireProject)/],
    ['M06', /^((controllers|routes|schemas)\/task|controllers\/evidencia)/],
    ['M07', /^((controllers|routes|schemas)\/budget|services\/budget|utils\/budget)/],
    ['M08', /^(controllers|routes|schemas)\/product/],
    ['M09', /^(controllers|routes|schemas)\/supplier/],
    ['M10', /^((controllers|routes|schemas)\/inventoryMovement|services\/saleCalculation)/],
    ['M11', /^(controllers|routes|schemas)\/reports/],
    ['M13', /^((controllers|routes)\/chat|socket\/|utils\/chat)/],
    ['M14', /^((controllers|routes|schemas)\/agent|services\/(agent|aiAgent))/],
    ['M15', /^((controllers|routes|schemas)\/integration|services\/(integration|notification|sendgrid|slack|teams|telegram|twilio|webhook|whatsapp|ssrf)|utils\/fetchWithTimeout)/],
    ['M16', /^((controllers|routes|schemas)\/marketing|services\/marketing|utils\/marketing)/],
    ['M17', /^((controllers|routes)\/(admin|global)|middleware\/requireSuperUser)/],
    ['M19', /^(middleware\/|router\.js|utils\/(logger|frontendUrl))/],
  ],
  frontend: [
    ['M01', /^(views\/(LoginView|RegisterView|AuthCallback)|services\/(auth|domains\/auth)|stores\/auth|utils\/(authFlow|formValidation))/],
    ['M02', /^(views\/SettingsView|stores\/preferences|composables\/useTheme)/],
    ['M03', /^(views\/(OnboardingView|InviteView)|services\/domains\/companies|utils\/(invitation|roles))/],
    ['M04', /^(views\/TeamsView|components\/projects\/Team|services\/domains\/teams)/],
    ['M05', /^(views\/Project|components\/(projects\/Project|DetailProject\/)|services\/domains\/projects|utils\/(projectAccessLabels|projectConstants|statusHelpers))/],
    ['M06', /^(components\/projects\/Task|utils\/taskIndicatorColors|services\/domains\/uploadthing)/],
    ['M07', /^(views\/BudgetView|components\/budget\/|services\/domains\/budgets)/],
    ['M08', /^(views\/(InventoryPage|ProductDetailView)|components\/inventory\/(InventorySummaryPanel|Product|RestockModal)|services\/domains\/products)/],
    ['M09', /^(views\/SuppliersView|services\/domains\/suppliers)/],
    ['M10', /^(views\/SalesView|components\/inventory\/(BarcodeScanner|SaleCartPanel|SaleCheckoutModal)|stores\/saleConfig|utils\/(sales|boxPricing|currency)|services\/domains\/inventory-movements)/],
    ['M11', /^(views\/Report|components\/reports\/|services\/domains\/reports|utils\/(reportExport|csvExport|download|pdf\/))/],
    ['M12', /^(views\/(DashboardView|HomeView)|components\/dashboard\/)/],
    ['M13', /^(views\/ChatView|components\/chat\/|stores\/chat|utils\/chat|services\/domains\/chat)/],
    ['M14', /^(views\/AgentView|services\/(agent|domains\/agent)|utils\/markdown)/],
    ['M15', /^(views\/IntegrationsView|services\/(integrations|domains\/integrations)|components\/UI\/ConnectionSuccessAnimation\/)/],
    ['M16', /^(views\/MarketingPublicationsView|components\/Marketing\/|services\/(marketing|domains\/marketing)|utils\/publicationStatus)/],
    ['M17', /^(views\/admin\/|components\/admin\/|services\/domains\/(admin|global))/],
    ['M18', /^(views\/(LandingPage|LegalView|NotFoundView)|components\/(LegalConsentModal|AppNavbar|Navbar|Footer)|components\/UI\/(AnimatedComponents|KontrolLogo3D|TextEffects)\/|composables\/(useLegalConsent|useVisibleOnce)|utils\/legal)/],
    ['M19', /^(services\/(http|api|domains\/createDomainService)|composables\/useLocale|components\/common\/LanguageSelector|utils\/logger|stores\/index)/],
  ],
}

const NAMES = {
  M01: 'Autenticación', M02: 'Usuarios y ajustes', M03: 'Empresas', M04: 'Equipos',
  M05: 'Proyectos', M06: 'Tareas', M07: 'Presupuesto', M08: 'Inventario',
  M09: 'Proveedores', M10: 'Punto de venta', M11: 'Reportes', M12: 'Dashboard',
  M13: 'Chat', M14: 'Agente de IA', M15: 'Integraciones', M16: 'Marketing',
  M17: 'Administración global', M18: 'Sitio público y legal', M19: 'Plataforma',
  UI: 'UI compartida (sin módulo)',
}

const rows = new Map()
const totals = {}
for (const ws of ['backend', 'frontend']) {
  const summary = JSON.parse(readFileSync(join(ROOT, ws, 'coverage', 'coverage-summary.json'), 'utf8'))
  totals[ws] = summary.total.lines
  for (const [file, data] of Object.entries(summary)) {
    if (file === 'total') continue
    const rel = file.split(`${sep}src${sep}`).pop().split(sep).join('/')
    const module = RULES[ws].find(([, re]) => re.test(rel))?.[0] ?? 'UI'
    const row = rows.get(module) ?? { files: 0, zero: 0, covered: 0, total: 0, ws: new Set() }
    row.files += 1
    row.covered += data.lines.covered
    row.total += data.lines.total
    if (data.lines.total > 0 && data.lines.covered === 0) row.zero += 1
    row.ws.add(ws)
    rows.set(module, row)
  }
}

const pct = (c, t) => (t ? ((c / t) * 100).toFixed(2) : '—')
console.log('| Módulo | Archivos | Archivos al 0 % | Líneas cubiertas | Cobertura de líneas |')
console.log('|---|---|---|---|---|')
let covered = 0
let total = 0
for (const id of Object.keys(NAMES)) {
  const r = rows.get(id)
  if (!r) {
    console.log(`| ${id} ${NAMES[id]} | 0 | — | — | sin código medible |`)
    continue
  }
  covered += r.covered
  total += r.total
  console.log(`| ${id} ${NAMES[id]} | ${r.files} | ${r.zero} | ${r.covered} / ${r.total} | ${pct(r.covered, r.total)} % |`)
}
console.log(`| **Total** | | | **${covered} / ${total}** | **${pct(covered, total)} %** |`)

// Control: la suma por módulo tiene que reproducir el total de Vitest.
const expected = totals.backend.covered + totals.frontend.covered
const expectedTotal = totals.backend.total + totals.frontend.total
for (const ws of ['backend', 'frontend'])
  console.log(`\n${ws}: ${totals[ws].covered} / ${totals[ws].total} líneas (${totals[ws].pct} %)`)
if (covered !== expected || total !== expectedTotal) {
  console.error('La suma por módulo no coincide con el total de Vitest.')
  process.exit(1)
}
