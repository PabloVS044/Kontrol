import { describe, it, expect, vi } from 'vitest'

vi.mock('../src/db/pool.js', () => ({ default: { query: vi.fn() } }))

import { createFakeBillingProvider } from './helpers/fakeBillingProvider.js'
import { cancelPendingSubscriptions, markSubscriptionsForCancellation } from '../src/services/billingService.js'

// PAY-1 — Cancelación de suscripciones de empresas desactivadas por una baja.

const dbWith = (pending) => {
  const updates = []
  return {
    updates,
    query: vi.fn(async (sql, params) => {
      if (sql.includes('SELECT id_empresa, id_suscripcion_proveedor')) return { rows: pending }
      updates.push(params)
      return { rowCount: 1, rows: [] }
    }),
  }
}

describe('markSubscriptionsForCancellation', () => {
  it('marca solo las empresas indicadas, dentro de la transacción recibida', async () => {
    const client = { query: vi.fn().mockResolvedValue({ rowCount: 1 }) }
    await markSubscriptionsForCancellation(client, [4, 9])
    const [sql, params] = client.query.mock.calls[0]
    expect(sql).toContain('cancelacion_pendiente = true')
    expect(params).toEqual([[4, 9]])
  })

  it('sin empresas desactivadas no consulta nada', async () => {
    const client = { query: vi.fn() }
    await markSubscriptionsForCancellation(client, [])
    expect(client.query).not.toHaveBeenCalled()
  })
})

describe('cancelPendingSubscriptions', () => {
  it('cancela en la pasarela y quita la marca', async () => {
    const provider = createFakeBillingProvider()
    provider.setSubscription({ id: 'sub_1', companyId: 4, plan: 'pro' })
    const db = dbWith([{ id_empresa: 4, id_suscripcion_proveedor: 'sub_1' }])

    await expect(cancelPendingSubscriptions({ companyIds: [4] }, { provider, db })).resolves.toBe(1)
    expect(provider.cancelSubscription).toHaveBeenCalledWith('sub_1')
    expect(db.updates).toEqual([[4, 'sub_1']])
  })

  it('si ya estaba cancelada en la pasarela, solo quita la marca', async () => {
    const provider = createFakeBillingProvider()
    provider.setSubscription({ id: 'sub_1', companyId: 4, status: 'canceled' })
    const db = dbWith([{ id_empresa: 4, id_suscripcion_proveedor: 'sub_1' }])

    await cancelPendingSubscriptions({}, { provider, db })
    expect(provider.cancelSubscription).not.toHaveBeenCalled()
    expect(db.updates).toHaveLength(1)
  })

  it('si la pasarela falla, deja la marca para el reintento y sigue con las demás', async () => {
    const provider = createFakeBillingProvider()
    provider.setSubscription({ id: 'sub_ok', companyId: 5 })
    provider.setSubscription({ id: 'sub_fail', companyId: 4 })
    provider.cancelSubscription.mockRejectedValueOnce(new Error('timeout'))
    const db = dbWith([
      { id_empresa: 4, id_suscripcion_proveedor: 'sub_fail' },
      { id_empresa: 5, id_suscripcion_proveedor: 'sub_ok' },
    ])

    await expect(cancelPendingSubscriptions({}, { provider, db })).resolves.toBe(1)
    expect(db.updates).toEqual([[5, 'sub_ok']])
  })

  it('sin pasarela configurada no hace nada y lo indica', async () => {
    const db = dbWith([])
    await expect(cancelPendingSubscriptions({}, { provider: { configured: false }, db })).resolves.toBeNull()
    expect(db.query).not.toHaveBeenCalled()
  })
})
