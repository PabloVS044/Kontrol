/**
 * Mide la carga del resumen de presupuesto del dashboard contra el Postgres local.
 *   n1   1 + N peticiones a /api/budgets/project/:id/summary
 *   agg  1 petición a /api/budgets/summary, con comparación de cifras
 *
 * Uso (desde backend/):
 *   BENCH_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/kontrol \
 *     node scripts/bench-dashboard.js --projects=10 --modes=n1 --label=antes
 *   ... --modes=n1,agg --label=despues
 *   ... --cleanup            borra todo lo sembrado por este script
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { performance } from 'node:perf_hooks'

const HERE = dirname(fileURLToPath(import.meta.url))
const RESULTS_DIR = join(HERE, 'bench-results')

const COMPANY_EMAIL = (n) => `bench-dt10-n${n}@kontrol.local`
const OWNER_EMAIL = 'bench-dt10-owner@kontrol.local'
const BENCH_JWT_SECRET = 'bench-dt10-secret'
const FIELDS = ['presupuesto_total', 'total_gastado', 'alerta_nivel', 'porcentaje_uso']

// ── Argumentos ──────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { projects: 10, modes: ['n1'], label: 'antes', iterations: 20, warmup: 3, cleanup: false }
  for (const raw of argv) {
    const [key, value] = raw.replace(/^--/, '').split('=')
    if (key === 'projects') args.projects = Number(value)
    else if (key === 'modes') args.modes = value.split(',').map((m) => m.trim())
    else if (key === 'label') args.label = value
    else if (key === 'iterations') args.iterations = Number(value)
    else if (key === 'warmup') args.warmup = Number(value)
    else if (key === 'cleanup') args.cleanup = true
    else throw new Error(`Argumento desconocido: ${raw}`)
  }
  if (!args.cleanup && ![10, 50, 100].includes(args.projects)) {
    throw new Error('--projects debe ser 10, 50 o 100.')
  }
  for (const m of args.modes) {
    if (!['n1', 'agg'].includes(m)) throw new Error(`Modo desconocido: ${m}`)
  }
  if (!/^[a-z0-9-]+$/.test(args.label)) throw new Error('--label solo admite a-z, 0-9 y guiones.')
  return args
}

// ── Guardia: solo Postgres local ────────────────────────────────────────────
function assertLocalDatabase(url) {
  if (!url) {
    throw new Error('Falta BENCH_DATABASE_URL (no se lee DATABASE_URL a propósito).')
  }
  if (/34\.121\.51\.151|supabase/i.test(url)) {
    throw new Error('Negado: BENCH_DATABASE_URL apunta al ambiente compartido.')
  }
  const { hostname } = new URL(url)
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname)) {
    throw new Error(`Negado: el host ${hostname} no es local.`)
  }
}

// ── Generador determinista ──────────────────────────────────────────────────
function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 2 ** 32
  }
}
const intBetween = (r, min, max) => min + Math.floor(r() * (max - min + 1))
const toMoney = (cents) => (cents / 100).toFixed(2)

// Un perfil por nivel de alerta, más los dos casos borde.
const PROFILES = [
  { name: 'vacio' },
  { name: 'sin_presupuesto' },
  { name: 'saludable', ratio: 0.35 },
  { name: 'precaucion', ratio: 0.67 },
  { name: 'advertencia', ratio: 0.87 },
  { name: 'critico', ratio: 1 },
  { name: 'excedido', ratio: 1.38 },
]
const AJUSTES_CENTS = [50000, -12050]

function buildProjectData(index) {
  const profile = PROFILES[(index - 1) % PROFILES.length]
  const r = rng(index * 7919)

  if (profile.name === 'vacio') {
    return { profile: profile.name, baseCents: 1000000, activities: [], movements: [], ajustes: [] }
  }

  const activities = Array.from({ length: 5 }, (_, a) => ({
    nombre: `BENCH actividad ${a + 1}`,
    planificadoCents: intBetween(r, 50000, 300000),
    // Las dos últimas imitan registerExpense: monto_real 0 y el gasto como GASTO_ADMIN.
    realCents: a < 3 ? intBetween(r, 10000, 150000) : 0,
  }))

  const movements = []
  for (let k = 0; k < 6; k++) {
    movements.push({ tipo: 'ENTRADA', cantidad: intBetween(r, 1, 20), precioCents: intBetween(r, 500, 8099) })
  }
  for (let k = 0; k < 6; k++) {
    movements.push({ tipo: 'SALIDA', cantidad: intBetween(r, 1, 10), precioCents: intBetween(r, 1000, 12000) })
  }
  for (let k = 0; k < 8; k++) {
    movements.push({
      tipo: 'GASTO_ADMIN',
      cantidad: null,
      precioCents: intBetween(r, 2000, 40099),
      actividad: k < 6 ? 3 + (k % 2) : null,
    })
  }

  const spentCents =
    activities.reduce((s, a) => s + a.realCents, 0) +
    movements
      .filter((m) => m.tipo !== 'SALIDA')
      .reduce((s, m) => s + m.precioCents * (m.cantidad ?? 1), 0)

  if (profile.name === 'sin_presupuesto') {
    return { profile: profile.name, baseCents: 0, activities, movements, ajustes: [] }
  }

  const ajustesNet = AJUSTES_CENTS.reduce((s, c) => s + c, 0)
  const baseCents = profile.ratio === 1
    ? spentCents - ajustesNet
    : Math.round(spentCents / profile.ratio) - ajustesNet

  return { profile: profile.name, baseCents, activities, movements, ajustes: AJUSTES_CENTS }
}

// ── Sembrado ────────────────────────────────────────────────────────────────
async function ensureOwner(pool) {
  const existing = await pool.query('SELECT id_usuario FROM public.usuario WHERE email = $1', [OWNER_EMAIL])
  if (existing.rows.length) return existing.rows[0].id_usuario

  const rol = await pool.query("SELECT id_rol FROM public.rol WHERE nombre_rol = 'usuario'")
  const inserted = await pool.query(
    `INSERT INTO public.usuario (nombre, apellido, email, password_hash, id_rol)
     VALUES ('Bench', 'DT-10', $1, NULL, $2) RETURNING id_usuario`,
    [OWNER_EMAIL, rol.rows[0].id_rol]
  )
  return inserted.rows[0].id_usuario
}

async function deleteCompanyData(client, idEmpresa) {
  const projectIds = (await client.query(
    'SELECT id_proyecto FROM public.proyecto WHERE id_empresa = $1', [idEmpresa]
  )).rows.map((r) => r.id_proyecto)

  await client.query('DELETE FROM public.movimiento_inventario WHERE id_empresa = $1', [idEmpresa])
  if (projectIds.length) {
    await client.query('DELETE FROM public.producto WHERE id_proyecto = ANY($1::int[])', [projectIds])
    await client.query('DELETE FROM public.presupuesto_ajuste WHERE id_proyecto = ANY($1::int[])', [projectIds])
    await client.query('DELETE FROM public.presupuesto_actividad WHERE id_proyecto = ANY($1::int[])', [projectIds])
  }
  await client.query('DELETE FROM public.proyecto WHERE id_empresa = $1', [idEmpresa])
}

async function seedCompany(pool, n, idUsuario) {
  const email = COMPANY_EMAIL(n)
  const found = await pool.query('SELECT id_empresa FROM public.empresa WHERE email = $1', [email])

  if (found.rows.length) {
    const idEmpresa = found.rows[0].id_empresa
    const count = await pool.query('SELECT COUNT(*)::int AS c FROM public.proyecto WHERE id_empresa = $1', [idEmpresa])
    if (count.rows[0].c === n) return { idEmpresa, seeded: false }
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    let idEmpresa = found.rows[0]?.id_empresa
    if (idEmpresa) {
      await deleteCompanyData(client, idEmpresa)
    } else {
      idEmpresa = (await client.query(
        'INSERT INTO public.empresa (nombre, email) VALUES ($1, $2) RETURNING id_empresa',
        [`BENCH DT-10 N${n}`, email]
      )).rows[0].id_empresa
    }

    await client.query(
      `INSERT INTO public.empresa_usuario (id_empresa, id_usuario, id_rol_empresa)
       SELECT $1, $2, id_rol_empresa FROM public.rol_empresa WHERE nombre = 'owner'
       ON CONFLICT (id_empresa, id_usuario) DO NOTHING`,
      [idEmpresa, idUsuario]
    )

    for (let i = 1; i <= n; i++) {
      const data = buildProjectData(i)
      const idProyecto = (await client.query(
        `INSERT INTO public.proyecto
           (nombre, fecha_inicio, presupuesto_total, estado, id_empresa, id_encargado)
         VALUES ($1, CURRENT_DATE, $2, 'EN_PROGRESO', $3, $4) RETURNING id_proyecto`,
        [`BENCH DT-10 Proyecto ${String(i).padStart(3, '0')} (${data.profile})`,
          toMoney(data.baseCents), idEmpresa, idUsuario]
      )).rows[0].id_proyecto

      const activityIds = []
      for (const a of data.activities) {
        activityIds.push((await client.query(
          `INSERT INTO public.presupuesto_actividad (nombre, monto_planificado, monto_real, id_proyecto)
           VALUES ($1, $2, $3, $4) RETURNING id_actividad`,
          [a.nombre, toMoney(a.planificadoCents), toMoney(a.realCents), idProyecto]
        )).rows[0].id_actividad)
      }

      let idProducto = null
      if (data.movements.length) {
        idProducto = (await client.query(
          `INSERT INTO public.producto (nombre, precio_venta, precio_costo, id_proyecto)
           VALUES ('BENCH producto', 100, 50, $1) RETURNING id_producto`,
          [idProyecto]
        )).rows[0].id_producto
      }

      for (const m of data.movements) {
        const isAdmin = m.tipo === 'GASTO_ADMIN'
        await client.query(
          `INSERT INTO public.movimiento_inventario
             (tipo, cantidad, precio_unitario, motivo, id_empresa, id_producto, id_usuario, id_proyecto, id_actividad)
           VALUES ($1, $2, $3, 'BENCH', $4, $5, $6, $7, $8)`,
          [m.tipo, m.cantidad, toMoney(m.precioCents), idEmpresa,
            isAdmin ? null : idProducto, idUsuario, idProyecto,
            isAdmin && m.actividad != null ? activityIds[m.actividad] : null]
        )
      }

      for (const cents of data.ajustes) {
        await client.query(
          `INSERT INTO public.presupuesto_ajuste (id_proyecto, monto, motivo, id_usuario)
           VALUES ($1, $2, 'BENCH', $3)`,
          [idProyecto, toMoney(cents), idUsuario]
        )
      }
    }

    await client.query('COMMIT')
    return { idEmpresa, seeded: true }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}

async function cleanup(pool) {
  const companies = await pool.query(
    "SELECT id_empresa FROM public.empresa WHERE email LIKE 'bench-dt10-n%@kontrol.local'"
  )
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const { id_empresa } of companies.rows) {
      await deleteCompanyData(client, id_empresa)
      await client.query('DELETE FROM public.empresa_usuario WHERE id_empresa = $1', [id_empresa])
      await client.query('DELETE FROM public.empresa WHERE id_empresa = $1', [id_empresa])
    }
    await client.query('DELETE FROM public.usuario WHERE email = $1', [OWNER_EMAIL])
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }
  console.log(`Limpieza: ${companies.rows.length} empresa(s) BENCH DT-10 borradas.`)
}

// ── Instrumentación ─────────────────────────────────────────────────────────
function instrumentPool(pool) {
  const counters = { queries: 0, peakWaiting: 0 }
  const original = pool.query.bind(pool)
  pool.query = (...args) => {
    counters.queries++
    const result = original(...args)
    counters.peakWaiting = Math.max(counters.peakWaiting, pool.waitingCount)
    return result
  }
  return counters
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const k = next++
      out[k] = await fn(items[k])
    }
  })
  await Promise.all(workers)
  return out
}

function stats(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const pick = (p) => sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)]
  const round = (v) => Number(v.toFixed(2))
  return {
    media: round(values.reduce((s, v) => s + v, 0) / values.length),
    p50: round(pick(50)),
    p95: round(pick(95)),
    min: round(sorted[0]),
    max: round(sorted[sorted.length - 1]),
  }
}

// ── Escenarios ──────────────────────────────────────────────────────────────
function makeClient(baseUrl, headers) {
  let requests = 0
  const get = async (path) => {
    requests++
    const res = await fetch(`${baseUrl}${path}`, { headers })
    const body = await res.json().catch(() => null)
    return { status: res.status, body }
  }
  return { get, requests: () => requests, reset: () => { requests = 0 } }
}

async function loadProjects(client) {
  const pr = await client.get('/api/projects?limit=100')
  if (pr.status !== 200) throw new Error(`/api/projects respondió ${pr.status}`)
  return pr.body.data
}

function buildScenarios(client, clearCache) {
  const n1 = (concurrency) => async () => {
    const projects = await loadProjects(client)
    const results = await mapLimit(projects, concurrency, (p) =>
      client.get(`/api/budgets/project/${p.id_proyecto}/summary`))
    const failed = results.filter((r) => r.status !== 200 || !r.body?.success).length
    if (failed) throw new Error(`${failed} resumen(es) fallaron en n1`)
  }

  const agg = async () => {
    const projects = await loadProjects(client)
    const ids = projects.map((p) => p.id_proyecto).join(',')
    const res = await client.get(`/api/budgets/summary?projectIds=${ids}`)
    if (res.status !== 200 || !res.body?.success) {
      throw new Error(`/api/budgets/summary respondió ${res.status}`)
    }
  }

  return {
    n1: [
      { name: 'n1 · concurrencia 6 (navegador)', run: n1(6) },
      { name: 'n1 · sin límite de concurrencia', run: n1(Infinity) },
    ],
    agg: [
      { name: 'agg · caché fría', before: clearCache, run: agg },
      { name: 'agg · caché caliente', run: agg },
    ],
  }
}

async function measure(scenario, client, counters, { iterations, warmup }) {
  for (let i = 0; i < warmup; i++) {
    await scenario.before?.()
    await scenario.run()
  }

  const times = []
  const queries = []
  const requests = []
  let peakWaiting = 0
  for (let i = 0; i < iterations; i++) {
    await scenario.before?.()
    client.reset()
    counters.queries = 0
    counters.peakWaiting = 0
    const t0 = performance.now()
    await scenario.run()
    times.push(performance.now() - t0)
    queries.push(counters.queries)
    requests.push(client.requests())
    peakWaiting = Math.max(peakWaiting, counters.peakWaiting)
  }

  return {
    escenario: scenario.name,
    iteraciones: iterations,
    peticiones_http: Math.max(...requests),
    consultas_bd: Math.max(...queries),
    tiempo_ms: stats(times),
    pico_cola_pool: peakWaiting,
  }
}

async function checkParity(client) {
  const projects = await loadProjects(client)
  const ids = projects.map((p) => p.id_proyecto)
  const agg = await client.get(`/api/budgets/summary?projectIds=${ids.join(',')}`)
  const byId = new Map((agg.body?.data ?? []).map((row) => [row.id_proyecto, row]))

  const diferencias = []
  for (const id of ids) {
    const single = await client.get(`/api/budgets/project/${id}/summary`)
    const row = byId.get(id)
    if (!row) {
      diferencias.push({ id_proyecto: id, campo: '(fila)', summary: 'presente', agregado: 'ausente' })
      continue
    }
    for (const field of FIELDS) {
      if (single.body.data[field] !== row[field]) {
        diferencias.push({ id_proyecto: id, campo: field, summary: single.body.data[field], agregado: row[field] })
      }
    }
  }
  for (const id of byId.keys()) {
    if (!ids.includes(id)) diferencias.push({ id_proyecto: id, campo: '(fila)', summary: 'ausente', agregado: 'presente' })
  }

  return { proyectos_comparados: ids.length, campos: FIELDS, diferencias }
}

// ── Principal ───────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv.slice(2))
  const url = process.env.BENCH_DATABASE_URL
  assertLocalDatabase(url)

  // Antes de importar el backend: lee el entorno al cargar.
  process.env.DATABASE_URL = url
  process.env.DATABASE_SSL = 'false'
  process.env.JWT_SECRET = BENCH_JWT_SECRET
  process.env.RATE_LIMIT_ENABLED = 'false'

  const { default: pool } = await import('../src/db/pool.js')
  try {
    if (args.cleanup) {
      await cleanup(pool)
      return
    }

    const { ensureDatabaseSchema } = await import('../src/db/bootstrap.js')
    await ensureDatabaseSchema()

    const idUsuario = await ensureOwner(pool)
    const { idEmpresa, seeded } = await seedCompany(pool, args.projects, idUsuario)
    console.log(`Empresa BENCH DT-10 N${args.projects} (id ${idEmpresa}) ${seeded ? 'sembrada' : 'ya existía'}.`)

    const counters = instrumentPool(pool)

    const { default: express } = await import('express')
    const { default: jwt } = await import('jsonwebtoken')
    const { default: projectRoutes } = await import('../src/routes/projectRoutes.js')
    const { default: budgetRoutes } = await import('../src/routes/budgetRoutes.js')
    const { errorHandler } = await import('../src/middleware/errorHandler.js')

    const app = express()
    app.use(express.json())
    app.use('/api/projects', projectRoutes)
    app.use('/api/budgets', budgetRoutes)
    app.use(errorHandler)
    const server = await new Promise((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s))
    })
    const baseUrl = `http://127.0.0.1:${server.address().port}`

    const token = jwt.sign({ id_usuario: idUsuario, email: OWNER_EMAIL, nombre_rol: 'usuario' }, BENCH_JWT_SECRET)
    const client = makeClient(baseUrl, { Authorization: `Bearer ${token}`, 'X-Company-ID': String(idEmpresa) })

    let clearCache = async () => {}
    if (args.modes.includes('agg')) {
      const cacheModule = await import('../src/utils/budgetSummaryCache.js').catch(() => null)
      if (!cacheModule) throw new Error('El modo agg requiere src/utils/budgetSummaryCache.js (endpoint agregado).')
      clearCache = async () => cacheModule.clearBudgetCache()
    }

    const scenarios = buildScenarios(client, clearCache)
    const resultados = []
    let paridad = null
    try {
      for (const mode of args.modes) {
        for (const scenario of scenarios[mode]) {
          console.log(`→ ${scenario.name} ...`)
          resultados.push(await measure(scenario, client, counters, args))
        }
      }
      if (args.modes.includes('agg')) {
        await clearCache()
        paridad = await checkParity(client)
      }
    } finally {
      server.close()
    }

    const pgVersion = (await pool.query('SHOW server_version')).rows[0].server_version
    const file = join(RESULTS_DIR, `dt10-${args.label}.json`)
    mkdirSync(RESULTS_DIR, { recursive: true })
    const doc = existsSync(file)
      ? JSON.parse(readFileSync(file, 'utf8'))
      : { ticket: 'SCRUM-68 (DT-10)', etiqueta: args.label, corridas: {} }
    doc.corridas[`${args.projects}_proyectos`] = {
      fecha: new Date().toISOString(),
      entorno: { node: process.version, postgres: pgVersion, pool_max: pool.options.max },
      calentamiento: args.warmup,
      resultados,
      ...(paridad && { paridad }),
    }
    writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`)

    console.log(`\nN = ${args.projects} proyectos`)
    console.table(resultados.map((r) => ({
      escenario: r.escenario,
      peticiones: r.peticiones_http,
      consultas: r.consultas_bd,
      'media ms': r.tiempo_ms.media,
      'p50 ms': r.tiempo_ms.p50,
      'p95 ms': r.tiempo_ms.p95,
      'cola pool': r.pico_cola_pool,
    })))
    if (paridad) {
      console.log(`Paridad: ${paridad.proyectos_comparados} proyectos, ${paridad.diferencias.length} diferencia(s).`)
      if (paridad.diferencias.length) console.table(paridad.diferencias)
    }
    console.log(`Resultados en ${file}`)
  } finally {
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
