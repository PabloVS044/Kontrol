import { randomUUID } from 'node:crypto'
import { pipeline } from 'node:stream/promises'
import pool from '../db/pool.js'
import { isMongoReady } from '../db/mongo.js'
import { isReauthenticated, REAUTH_ACTIONS } from '../auth/reauthentication.js'
import { prepareCompanyDataExport } from '../services/companyDataExport.js'
import { processMongoAccountDeletion } from '../services/accountDeletionOutbox.js'
import { cancelPendingSubscriptions, markSubscriptionsForCancellation } from '../services/billingService.js'
import { CLOSURE_REASONS, scheduleCompanyClosure } from '../services/companyClosure.js'
import { disconnectUserSockets } from '../socket/index.js'
import { logger } from '../utils/logger.js'

const invalidCredentials = (res) =>
  res.status(401).json({ success: false, message: 'Reauthentication failed.' })

export const exportCompanyData = async (req, res, next) => {
  res.locals ??= {}
  res.locals.companyExportOwnsSlot = true
  let client
  let transactionStarted = false
  let stream
  let interrupted = false
  let connectionError
  const abortController = new AbortController()
  const abortExport = () => {
    if (res.writableEnded) return
    interrupted = true
    abortController.abort()
    stream?.destroy()
  }
  const handleClose = () => {
    if (!res.writableEnded) abortExport()
  }
  const handleClientError = (error) => {
    connectionError = error
    abortController.abort(error)
    stream?.destroy(error)
  }
  // Install before the first await: a queued pool connection can outlive HTTP.
  req.once('aborted', abortExport)
  res.once('close', handleClose)
  const configuredTimeout = Number(process.env.COMPANY_EXPORT_TIMEOUT_MS)
  const timeoutMs = Number.isSafeInteger(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout : 15 * 60 * 1000
  const timeout = setTimeout(() => {
    abortExport()
    if (!res.writableEnded) res.destroy()
  }, timeoutMs)
  timeout.unref?.()
  const closed = () => interrupted || req.aborted || res.destroyed

  try {
    if (closed()) return
    if (!isMongoReady()) {
      return res.status(503).json({
        success: false,
        message: 'A complete export is temporarily unavailable because conversation storage is offline.',
      })
    }
    client = await pool.connect()
    client.on?.('error', handleClientError)
    if (closed()) return
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    transactionStarted = true
    await client.query("SET LOCAL statement_timeout = '10s'")
    await client.query("SET LOCAL idle_in_transaction_session_timeout = '30s'")
    if (closed()) return
    stream = await prepareCompanyDataExport(client, {
      companyId: req.company.id_empresa,
      userId: req.user.id_usuario,
      signal: abortController.signal,
    })
    if (closed()) {
      stream.destroy()
      return
    }
    abortController.signal.throwIfAborted()
    res.status(200).type('application/json; charset=utf-8').set({
      'Cache-Control': 'no-store, private',
      Pragma: 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': `attachment; filename="kontrol-company-${req.company.id_empresa}-export.json"`,
      Vary: 'Authorization',
    })
    await pipeline(stream, res, { signal: abortController.signal })
  } catch (error) {
    if (interrupted || req.aborted || (res.destroyed && !connectionError)) {
      logger.info('Company data export was interrupted by the client or its timeout.')
    } else {
      logger.error('Company data export failed:', error)
      if (res.headersSent || res.destroyed) res.destroy(error)
      else next(error)
    }
  } finally {
    clearTimeout(timeout)
    req.removeListener('aborted', abortExport)
    res.removeListener('close', handleClose)
    try {
      if (client) {
        if (transactionStarted && !connectionError) {
          try { await client.query('ROLLBACK') } catch (error) { connectionError = error }
        }
        client.removeListener?.('error', handleClientError)
        // Discard broken clients; never return them as healthy to the pool.
        client.release(connectionError)
      }
    } finally {
      res.locals.releaseCompanyExport?.()
    }
  }
}

export const deleteOwnAccount = async (req, res) => {
  const client = await pool.connect()
  let committed = false
  let released = false
  try {
    await client.query('BEGIN')
    const userResult = await client.query(
      `SELECT id_usuario, password_hash, google_id, activo
       FROM public.usuario
       WHERE id_usuario = $1
       FOR UPDATE`,
      [req.user.id_usuario]
    )
    const user = userResult.rows[0]
    if (!user || !user.activo) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Account not found.' })
    }

    const reauthenticated = await isReauthenticated({
      user,
      password: req.body.password,
      googleProof: req.body.google_reauth_token,
      purpose: REAUTH_ACTIONS.ACCOUNT_DELETION,
    })
    if (!reauthenticated) {
      await client.query('ROLLBACK')
      return invalidCredentials(res)
    }

    const memberships = await client.query(
      `SELECT eu.id_empresa, re.nombre AS rol_empresa
       FROM public.empresa_usuario eu
       JOIN public.rol_empresa re ON re.id_rol_empresa = eu.id_rol_empresa
       WHERE eu.id_usuario = $1`,
      [user.id_usuario]
    )

    const ownerRole = await client.query(
      "SELECT id_rol_empresa FROM public.rol_empresa WHERE nombre = 'owner' LIMIT 1"
    )
    if (!ownerRole.rows.length) throw new Error('Company owner role is missing.')

    const closedCompanies = []
    for (const membership of memberships.rows.filter(({ rol_empresa }) => rol_empresa === 'owner')) {
      const successor = await client.query(
        `SELECT eu.id_usuario
         FROM public.empresa_usuario eu
         JOIN public.usuario u ON u.id_usuario = eu.id_usuario
         JOIN public.rol_empresa re ON re.id_rol_empresa = eu.id_rol_empresa
         WHERE eu.id_empresa = $1 AND eu.id_usuario <> $2 AND u.activo = true
         ORDER BY CASE re.nombre
           WHEN 'admin' THEN 0
           WHEN 'manager' THEN 1
           ELSE 2
         END, eu.id_usuario
         LIMIT 1
         FOR UPDATE OF eu`,
        [membership.id_empresa, user.id_usuario]
      )

      if (successor.rows.length) {
        await client.query(
          `UPDATE public.empresa_usuario
           SET id_rol_empresa = $1
           WHERE id_empresa = $2 AND id_usuario = $3`,
          [ownerRole.rows[0].id_rol_empresa, membership.id_empresa, successor.rows[0].id_usuario]
        )
      } else {
        // Nobody is left to run the company: the relationship ends (addendum
        // §10.1 d) and the company follows the regular closure deadlines.
        await scheduleCompanyClosure(client, {
          companyId: membership.id_empresa,
          requestedBy: user.id_usuario,
          reason: CLOSURE_REASONS.NO_ACTIVE_OWNER,
        })
        closedCompanies.push(membership.id_empresa)
      }
    }

    // PAY-1 — Una empresa en cierre no debe seguir renovando su plan. Se
    // marca aquí y se cancela en la pasarela después del COMMIT.
    await markSubscriptionsForCancellation(client, closedCompanies)

    await client.query(
      `UPDATE public.empresa_invitacion
       SET activa = false, desactivada_en = COALESCE(desactivada_en, CURRENT_TIMESTAMP)
       WHERE id_usuario_owner = $1 AND activa = true`,
      [user.id_usuario]
    )
    await client.query(
      `UPDATE public.proyecto_invitacion
       SET activa = false, desactivada_en = COALESCE(desactivada_en, CURRENT_TIMESTAMP)
       WHERE id_usuario_invitador = $1 AND activa = true`,
      [user.id_usuario]
    )

    await client.query('DELETE FROM public.asignacion WHERE id_usuario = $1', [user.id_usuario])
    await client.query('DELETE FROM public.proyecto_usuario_permiso WHERE id_usuario = $1', [user.id_usuario])
    await client.query('DELETE FROM public.proyecto_usuario WHERE id_usuario = $1', [user.id_usuario])
    await client.query('DELETE FROM public.equipo_usuario WHERE id_usuario = $1', [user.id_usuario])
    await client.query('DELETE FROM public.empresa_usuario WHERE id_usuario = $1', [user.id_usuario])

    await client.query(
      `UPDATE public.usuario
       SET nombre = 'Cuenta eliminada',
           apellido = '',
           email = $1,
           password_hash = NULL,
           telefono = NULL,
           google_id = NULL,
           activo = false,
           token_version = token_version + 1
       WHERE id_usuario = $2`,
      [`deleted-${user.id_usuario}-${randomUUID()}@account.invalid`, user.id_usuario]
    )

    await client.query(
      `INSERT INTO public.account_mongo_deletion_outbox (id_usuario)
       VALUES ($1)
       ON CONFLICT (id_usuario) DO NOTHING`,
      [user.id_usuario]
    )
    await client.query('COMMIT')
    committed = true
    client.release()
    released = true
    try { disconnectUserSockets(user.id_usuario) } catch (error) {
      logger.error('Could not disconnect deleted account sockets:', error)
    }
    let subscriptionCancellation = closedCompanies.length ? 'pending_retry' : 'not_applicable'
    if (closedCompanies.length) {
      try {
        const cancelled = await cancelPendingSubscriptions({ companyIds: closedCompanies })
        if (cancelled === null) subscriptionCancellation = 'billing_not_configured'
        else if (cancelled > 0) subscriptionCancellation = 'requested'
      } catch (error) {
        logger.error('Subscription cancellation was queued for retry:', error)
      }
    }
    let mongoCleanup = 'pending_retry'
    try {
      if (await processMongoAccountDeletion(user.id_usuario)) mongoCleanup = 'completed'
    } catch (error) {
      logger.error('MongoDB account data cleanup was queued for retry:', error)
    }
    return res.json({
      success: true,
      data: {
        account: 'disabled_and_anonymized',
        companyRecords: 'retained_for_business_continuity',
        retentionPeriod: 'not_defined_in_the_current_policy',
        externalProviders: 'not_deleted_by_this_operation',
        mongoConversationData: mongoCleanup,
        subscriptionCancellation,
        ownerCompanies: memberships.rows
          .filter(({ rol_empresa }) => rol_empresa === 'owner')
          .map(({ id_empresa }) => id_empresa),
        companiesScheduledForDeletion: closedCompanies,
      },
    })
  } catch (error) {
    if (!committed) {
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
