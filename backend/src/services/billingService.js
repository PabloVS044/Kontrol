import pool from '../db/pool.js'
import { PLAN_CODES, getPlan, RESOURCES } from '../billing/plans.js'
import { getBillingProvider } from '../billing/provider.js'
import { logger } from '../utils/logger.js'

// PAY-1 — Estados del proveedor en los que la empresa conserva el plan pagado.
// `past_due` entra a propósito: mientras el proveedor reintenta el cobro la
// empresa sigue con su plan y ve un aviso. Cuando agota los reintentos cancela
// la suscripción y el evento la devuelve al plan gratuito.
export const ENTITLED_STATUSES = ['active', 'trialing', 'past_due']

export const resolveEffectivePlan = (subscription) => {
  if (!subscription) return 'free'
  if (!ENTITLED_STATUSES.includes(subscription.estado)) return 'free'
  return PLAN_CODES.includes(subscription.plan) ? subscription.plan : 'free'
}

export const getCompanySubscription = async (companyId, db = pool) => {
  const result = await db.query(
    `SELECT id_empresa, proveedor, id_cliente_proveedor, id_suscripcion_proveedor,
            plan, intervalo, estado, fin_periodo_actual, cancelar_al_final
     FROM public.empresa_suscripcion
     WHERE id_empresa = $1`,
    [companyId]
  )
  return result.rows[0] ?? null
}

export const getCompanyPlan = async (companyId, db = pool) =>
  resolveEffectivePlan(await getCompanySubscription(companyId, db))

// Un solo viaje a la base para los tres contadores. Los productos cuelgan del
// proyecto, no de la empresa, así que se cuentan a través de él.
export const getUsage = async (companyId, db = pool) => {
  const result = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM public.empresa_usuario WHERE id_empresa = $1)::int AS members,
       (SELECT COUNT(*) FROM public.proyecto WHERE id_empresa = $1)::int AS projects,
       (SELECT COUNT(*)
          FROM public.producto p
          JOIN public.proyecto pr ON pr.id_proyecto = p.id_proyecto
         WHERE pr.id_empresa = $1)::int AS products`,
    [companyId]
  )
  const row = result.rows[0] ?? {}
  return Object.fromEntries(RESOURCES.map((resource) => [resource, Number(row[resource] ?? 0)]))
}

// `incoming` es cuántos se van a agregar (aceptar una invitación suma uno).
export const isWithinLimit = (planCode, resource, current, incoming = 1) => {
  const limit = getPlan(planCode).limits[resource]
  return limit === null || limit === undefined || current + incoming <= limit
}

// PAY-1 — Eventos de la pasarela que mueven la suscripción. El resto se acusa
// recibido y se ignora.
export const HANDLED_EVENTS = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
])

const findCompanyByCustomer = async (db, customerId) => {
  if (!customerId) return null
  const result = await db.query(
    'SELECT id_empresa FROM public.empresa_suscripcion WHERE id_cliente_proveedor = $1',
    [customerId]
  )
  return result.rows[0]?.id_empresa ?? null
}

// Una suscripción vieja no puede pisar a la vigente. Pasa cuando la empresa
// canceló, volvió a suscribirse y llega tarde un evento de la anterior.
const isStaleSubscription = (current, incoming) =>
  current?.id_suscripcion_proveedor &&
  current.id_suscripcion_proveedor !== incoming.id &&
  ENTITLED_STATUSES.includes(current.estado) &&
  !ENTITLED_STATUSES.includes(incoming.status)

/**
 * Aplica un evento ya verificado por el proveedor (firma comprobada en
 * parseEvent). Garantías:
 *  - Idempotencia: el id del evento se registra en la misma transacción que el
 *    cambio; un reintento del mismo evento no hace nada.
 *  - Orden: el estado no se toma del evento sino que se vuelve a leer de la
 *    pasarela, así un evento atrasado no deja un estado viejo.
 *  - La empresa sale de la metadata que el servidor puso al crear el cliente y
 *    la sesión, o del cliente ya registrado. Nunca de lo que mande el navegador.
 */
export const handleBillingEvent = async (event, { provider = getBillingProvider(), db = pool } = {}) => {
  if (!HANDLED_EVENTS.has(event.type) || !event.subscriptionId) return { status: 'ignored' }

  // Se lee antes de abrir la transacción para no retener una conexión del
  // pool mientras se espera a la red. Si falla, el evento no se registra y el
  // proveedor lo reintenta.
  const subscription = await provider.getSubscription(event.subscriptionId)

  const client = await db.connect()
  try {
    await client.query('BEGIN')

    const inserted = await client.query(
      `INSERT INTO public.evento_pago_procesado (id_evento, proveedor, tipo)
       VALUES ($1, $2, $3)
       ON CONFLICT (id_evento) DO NOTHING
       RETURNING id_evento`,
      [event.id, provider.name, event.type]
    )
    if (!inserted.rowCount) {
      await client.query('ROLLBACK')
      return { status: 'duplicate' }
    }

    const companyId =
      subscription.companyId ?? event.companyId ?? (await findCompanyByCustomer(client, subscription.customerId))
    if (!companyId) {
      logger.warn(`[billing] Event ${event.id} (${event.type}) does not belong to any company; ignored.`)
      await client.query('COMMIT')
      return { status: 'ignored' }
    }

    const currentResult = await client.query(
      `SELECT id_cliente_proveedor, id_suscripcion_proveedor, estado
       FROM public.empresa_suscripcion
       WHERE id_empresa = $1
       FOR UPDATE`,
      [companyId]
    )
    const current = currentResult.rows[0]

    if (current?.id_cliente_proveedor && current.id_cliente_proveedor !== subscription.customerId) {
      logger.warn(`[billing] Event ${event.id} customer does not match company ${companyId}; ignored.`)
      await client.query('COMMIT')
      return { status: 'ignored' }
    }
    if (isStaleSubscription(current, subscription)) {
      await client.query('COMMIT')
      return { status: 'stale' }
    }

    await client.query(
      `INSERT INTO public.empresa_suscripcion
         (id_empresa, proveedor, id_cliente_proveedor, id_suscripcion_proveedor,
          plan, intervalo, estado, fin_periodo_actual, cancelar_al_final, actualizado_en)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
       ON CONFLICT (id_empresa) DO UPDATE SET
         proveedor = EXCLUDED.proveedor,
         id_cliente_proveedor = EXCLUDED.id_cliente_proveedor,
         id_suscripcion_proveedor = EXCLUDED.id_suscripcion_proveedor,
         plan = EXCLUDED.plan,
         intervalo = EXCLUDED.intervalo,
         estado = EXCLUDED.estado,
         fin_periodo_actual = EXCLUDED.fin_periodo_actual,
         cancelar_al_final = EXCLUDED.cancelar_al_final,
         actualizado_en = CURRENT_TIMESTAMP`,
      [
        companyId,
        provider.name,
        subscription.customerId,
        subscription.id,
        PLAN_CODES.includes(subscription.plan) ? subscription.plan : 'free',
        subscription.interval === 'month' || subscription.interval === 'year' ? subscription.interval : null,
        subscription.status,
        subscription.currentPeriodEnd,
        subscription.cancelAtPeriodEnd,
      ]
    )

    await client.query('COMMIT')
    return { status: 'applied', companyId, plan: resolveEffectivePlan({ plan: subscription.plan, estado: subscription.status }) }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}

const conflict = (message) => Object.assign(new Error(message), { status: 409 })

const hasPaidSubscription = (subscription) =>
  Boolean(subscription?.id_suscripcion_proveedor) && resolveEffectivePlan(subscription) !== 'free'

// Registra el cliente de la empresa en la pasarela la primera vez. La fila se
// crea con el plan gratuito: el plan solo cambia con un evento verificado.
const ensureProviderCustomer = async ({ companyId, provider, db, current }) => {
  if (current?.id_cliente_proveedor) return current.id_cliente_proveedor

  const customerId = await provider.ensureCustomer({ companyId })
  const result = await db.query(
    `INSERT INTO public.empresa_suscripcion (id_empresa, proveedor, id_cliente_proveedor)
     VALUES ($1, $2, $3)
     ON CONFLICT (id_empresa) DO UPDATE SET
       id_cliente_proveedor = COALESCE(public.empresa_suscripcion.id_cliente_proveedor, EXCLUDED.id_cliente_proveedor),
       actualizado_en = CURRENT_TIMESTAMP
     RETURNING id_cliente_proveedor`,
    [companyId, provider.name, customerId]
  )
  return result.rows[0].id_cliente_proveedor
}

/** Abre el Checkout hospedado para pasar del plan gratuito a uno pagado. */
export const startCheckout = async (
  { companyId, plan, interval, successUrl, cancelUrl },
  { provider = getBillingProvider(), db = pool } = {}
) => {
  const current = await getCompanySubscription(companyId, db)
  if (hasPaidSubscription(current)) {
    throw conflict('This company already has a paid subscription. Change the plan instead.')
  }

  const customerId = await ensureProviderCustomer({ companyId, provider, db, current })
  return provider.createCheckoutSession({ customerId, companyId, plan, interval, successUrl, cancelUrl })
}

/**
 * Cambia entre planes pagados (Pro <-> Business, mensual <-> anual) sobre la
 * suscripción vigente. La base no se toca aquí: el cambio llega por el evento
 * customer.subscription.updated, verificado, como cualquier otro.
 */
export const changePlan = async ({ companyId, plan, interval }, { provider = getBillingProvider(), db = pool } = {}) => {
  const current = await getCompanySubscription(companyId, db)
  if (!hasPaidSubscription(current)) {
    throw conflict('This company has no paid subscription to change. Subscribe first.')
  }
  if (current.estado === 'past_due') {
    throw conflict('Update the payment method before changing the plan.')
  }
  if (current.plan === plan && current.intervalo === interval) {
    throw conflict('The company is already on this plan.')
  }

  const updated = await provider.changeSubscriptionPlan(current.id_suscripcion_proveedor, { plan, interval })
  return { plan: updated.plan, interval: updated.interval, status: updated.status }
}

/** Portal hospedado del proveedor: tarjeta, facturas y cancelación. */
export const openPortal = async ({ companyId, returnUrl }, { provider = getBillingProvider(), db = pool } = {}) => {
  const current = await getCompanySubscription(companyId, db)
  if (!current?.id_cliente_proveedor) {
    throw conflict('This company has no billing account yet. Subscribe first.')
  }
  return provider.createPortalSession({ customerId: current.id_cliente_proveedor, returnUrl })
}

/** Resumen para la interfaz: plan efectivo, estado, topes y uso. */
export const getBillingSummary = async (companyId, db = pool) => {
  const [subscription, usage] = await Promise.all([getCompanySubscription(companyId, db), getUsage(companyId, db)])
  const plan = resolveEffectivePlan(subscription)
  const { limits, features } = getPlan(plan)
  return {
    plan,
    status: subscription?.estado ?? 'none',
    interval: plan === 'free' ? null : subscription?.intervalo ?? null,
    currentPeriodEnd: plan === 'free' ? null : subscription?.fin_periodo_actual ?? null,
    cancelAtPeriodEnd: plan === 'free' ? false : Boolean(subscription?.cancelar_al_final),
    hasBillingAccount: Boolean(subscription?.id_cliente_proveedor),
    limits,
    features,
    usage,
  }
}
