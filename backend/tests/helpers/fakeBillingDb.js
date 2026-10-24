import { vi } from 'vitest'

// PAY-1 — Base de datos en memoria para las pruebas unitarias del módulo de
// pagos. Reconoce solo las consultas de billingService y de los middlewares de
// plan, con transacciones de juguete (BEGIN guarda una copia, ROLLBACK la
// restaura). Las consultas reales se prueban contra Postgres en
// tests/integration/billing.int.test.js.

const clone = (value) => structuredClone(value)

export const createFakeBillingDb = ({ usage = {}, role = 'owner' } = {}) => {
  // `role` es el rol del usuario en la empresa para requireCompany; null = no es miembro.
  const state = { events: new Set(), subscriptions: new Map(), role }
  const counts = { members: 1, projects: 0, products: 0, ...usage }
  let snapshot = null

  const run = async (text, params = []) => {
    const sql = text.replace(/\s+/g, ' ').trim()

    if (sql === 'BEGIN') {
      snapshot = { events: new Set(state.events), subscriptions: clone(state.subscriptions) }
      return { rows: [], rowCount: 0 }
    }
    if (sql === 'COMMIT') {
      snapshot = null
      return { rows: [], rowCount: 0 }
    }
    if (sql === 'ROLLBACK') {
      if (snapshot) Object.assign(state, snapshot)
      snapshot = null
      return { rows: [], rowCount: 0 }
    }

    if (sql.includes('FROM public.empresa_usuario eu JOIN public.rol_empresa re')) {
      if (!state.role) return { rows: [], rowCount: 0 }
      return { rows: [{ id_rol_empresa: 1, rol_empresa: state.role, activo: true, nombre: 'Empresa' }], rowCount: 1 }
    }

    if (sql.startsWith('SELECT id_empresa, nombre FROM public.empresa WHERE id_empresa = $1')) {
      return { rows: [{ id_empresa: Number(params[0]), nombre: 'Empresa' }], rowCount: 1 }
    }

    if (sql.startsWith('INSERT INTO public.evento_pago_procesado')) {
      if (state.events.has(params[0])) return { rows: [], rowCount: 0 }
      state.events.add(params[0])
      return { rows: [{ id_evento: params[0] }], rowCount: 1 }
    }

    if (sql.includes('FROM public.empresa_suscripcion WHERE id_cliente_proveedor = $1')) {
      const row = [...state.subscriptions.values()].find((sub) => sub.id_cliente_proveedor === params[0])
      return { rows: row ? [{ id_empresa: row.id_empresa }] : [], rowCount: row ? 1 : 0 }
    }

    if (sql.includes('FROM public.empresa_suscripcion WHERE id_empresa = $1')) {
      const row = state.subscriptions.get(Number(params[0]))
      return { rows: row ? [clone(row)] : [], rowCount: row ? 1 : 0 }
    }

    if (sql.startsWith('INSERT INTO public.empresa_suscripcion')) {
      const [id_empresa, proveedor, id_cliente_proveedor, id_suscripcion_proveedor, ...rest] = params
      const previous = state.subscriptions.get(Number(id_empresa)) ?? {}
      const row = sql.includes('id_suscripcion_proveedor, plan')
        ? {
            id_empresa: Number(id_empresa),
            proveedor,
            id_cliente_proveedor,
            id_suscripcion_proveedor,
            plan: rest[0],
            intervalo: rest[1],
            estado: rest[2],
            fin_periodo_actual: rest[3],
            cancelar_al_final: rest[4],
          }
        : {
            plan: 'free',
            intervalo: null,
            estado: 'none',
            fin_periodo_actual: null,
            cancelar_al_final: false,
            id_suscripcion_proveedor: null,
            ...previous,
            id_empresa: Number(id_empresa),
            proveedor,
            id_cliente_proveedor: previous.id_cliente_proveedor ?? id_cliente_proveedor,
          }
      state.subscriptions.set(Number(id_empresa), row)
      return { rows: [clone(row)], rowCount: 1 }
    }

    if (sql.includes('AS members') && sql.includes('AS products')) {
      return { rows: [{ ...counts }], rowCount: 1 }
    }

    throw new Error(`fakeBillingDb: unexpected query: ${sql.slice(0, 120)}`)
  }

  const client = { query: vi.fn(run), release: vi.fn() }
  return {
    state,
    counts,
    client,
    query: vi.fn(run),
    connect: vi.fn(async () => client),
  }
}
