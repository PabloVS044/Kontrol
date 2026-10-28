import pool from '../db/pool.js'
import { isReauthenticated, REAUTH_ACTIONS } from '../auth/reauthentication.js'
import { cancelPendingSubscriptions } from '../services/billingService.js'
import { logger } from '../utils/logger.js'
import {
  cancelCompanyClosure as cancelClosure,
  CLOSURE_REASONS,
  findCompanyClosure,
  listClosuresRequestedBy,
  presentClosure,
  scheduleCompanyClosure,
} from '../services/companyClosure.js'

const invalidCredentials = (res) =>
  res.status(401).json({ success: false, message: 'Reauthentication failed.' })

const normalizeName = (value) => String(value ?? '').trim().toLocaleLowerCase('es')

/**
 * POST /api/companies/closure
 * Owner (or Kontrol support) closes the selected company. Opens the 30-day
 * export window, or skips it when the owner asks for deletion right away.
 */
export const requestCompanyClosure = async (req, res) => {
  const client = await pool.connect()
  let released = false
  try {
    await client.query('BEGIN')
    const userResult = await client.query(
      `SELECT id_usuario, password_hash, activo
       FROM public.usuario
       WHERE id_usuario = $1`,
      [req.user.id_usuario]
    )
    const user = userResult.rows[0]
    const reauthenticated = user?.activo && await isReauthenticated({
      user,
      password: req.body.password,
      googleProof: req.body.google_reauth_token,
      purpose: REAUTH_ACTIONS.COMPANY_CLOSURE,
    })
    if (!reauthenticated) {
      await client.query('ROLLBACK')
      return invalidCredentials(res)
    }

    const companyResult = await client.query(
      'SELECT nombre, activo FROM public.empresa WHERE id_empresa = $1 FOR UPDATE',
      [req.company.id_empresa]
    )
    const company = companyResult.rows[0]
    if (!company?.activo) {
      await client.query('ROLLBACK')
      return res.status(409).json({ success: false, message: 'This company is not active.' })
    }
    if (normalizeName(req.body.confirm_name) !== normalizeName(company.nombre)) {
      await client.query('ROLLBACK')
      return res.status(400).json({ success: false, message: 'The company name does not match.' })
    }

    const closure = await scheduleCompanyClosure(client, {
      companyId: req.company.id_empresa,
      requestedBy: user.id_usuario,
      reason: req.user.nombre_rol === 'super_user'
        ? CLOSURE_REASONS.PROVIDER_TERMINATION
        : CLOSURE_REASONS.OWNER_REQUEST,
      skipExportWindow: req.body.skip_export_window === true,
    })
    if (!closure) {
      await client.query('ROLLBACK')
      return res.status(409).json({ success: false, message: 'This company is already being closed.' })
    }

    await client.query('COMMIT')
    client.release()
    released = true
    // PAY-1 — scheduleCompanyClosure marked the subscription; if the provider
    // fails here the billing worker retries it.
    try {
      await cancelPendingSubscriptions({ companyIds: [req.company.id_empresa] })
    } catch (error) {
      logger.error('Subscription cancellation was queued for retry:', error)
    }
    return res.status(201).json({ success: true, data: presentClosure(closure) })
  } catch (error) {
    if (!released) {
      try { await client.query('ROLLBACK') } catch (rollbackError) {
        client.release(rollbackError)
        released = true
      }
    }
    throw error
  } finally {
    if (!released) client.release()
  }
}

/**
 * DELETE /api/companies/closure
 * Withdraws the closure while the export window is still open.
 */
export const cancelCompanyClosure = async (req, res) => {
  const client = await pool.connect()
  let released = false
  try {
    await client.query('BEGIN')
    const cancelled = await cancelClosure(client, req.company.id_empresa)
    if (!cancelled) {
      await client.query('ROLLBACK')
      return res.status(409).json({
        success: false,
        message: 'The closure can no longer be cancelled.',
      })
    }
    await client.query('COMMIT')
    return res.json({ success: true, data: { company_id: req.company.id_empresa, status: 'active' } })
  } catch (error) {
    try { await client.query('ROLLBACK') } catch (rollbackError) {
      client.release(rollbackError)
      released = true
    }
    throw error
  } finally {
    if (!released) client.release()
  }
}

/** GET /api/companies/closure — closure of the selected company, if any. */
export const getCompanyClosure = async (req, res) => {
  const closure = await findCompanyClosure(pool, req.company.id_empresa)
  return res.json({ success: true, data: closure ? presentClosure(closure) : null })
}

/**
 * GET /api/companies/closures/mine — closures this account requested. Works
 * after the company is gone: the deleted ones are the deletion certificates.
 */
export const listMyCompanyClosures = async (req, res) => {
  const closures = await listClosuresRequestedBy(pool, req.user.id_usuario)
  return res.json({ success: true, data: closures.map(presentClosure) })
}
