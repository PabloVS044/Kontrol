import bcrypt from 'bcrypt'
import { randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'
import pool from '../db/pool.js'
import { isMongoReady } from '../db/mongo.js'
import Conversation from '../models/Conversation.js'
import Message from '../models/Message.js'
import AgentConversation from '../models/AgentConversation.js'
import AgentMessage from '../models/AgentMessage.js'
import { prepareCompanyDataExport } from '../services/companyDataExport.js'
import { disconnectUserSockets } from '../socket/index.js'
import { logger } from '../utils/logger.js'

const invalidCredentials = (res) =>
  res.status(401).json({ success: false, message: 'Reauthentication failed.' })

const verifyGoogleReauthentication = (token, userId) => {
  if (!token) return false
  try {
    const proof = jwt.verify(token, process.env.JWT_SECRET)
    return proof.purpose === 'account-deletion' && proof.id_usuario === userId
  } catch {
    return false
  }
}

async function removeMongoAccountData(userId) {
  await AgentMessage.deleteMany({ userId })
  await AgentConversation.deleteMany({ userId })

  for await (const conversation of Conversation.find({ participants: userId }).cursor()) {
    const participants = conversation.participants.filter((participant) => participant !== userId)
    const participantInfo = conversation.participantInfo.filter((participant) => participant.id !== userId)
    const conversationId = conversation._id

    await Message.deleteMany({ conversationId, senderId: userId })
    await Message.updateMany({ conversationId }, { $pull: { readBy: userId } })

    if (participants.length === 0) {
      await Message.deleteMany({ conversationId })
      await Conversation.deleteOne({ _id: conversationId })
      continue
    }

    const lastMessage = await Message.findOne({ conversationId }).sort({ createdAt: -1 }).lean()
    const update = {
      $set: {
        participants,
        participantInfo,
        lastMessage: lastMessage
          ? {
              text: lastMessage.text,
              senderId: lastMessage.senderId,
              type: lastMessage.type,
              createdAt: lastMessage.createdAt,
            }
          : null,
      },
      $unset: { [`unreadCounts.${userId}`]: '' },
    }
    await Conversation.updateOne({ _id: conversationId }, update)
  }
}

export const exportCompanyData = async (req, res, next) => {
  if (!isMongoReady()) {
    return res.status(503).json({
      success: false,
      message: 'A complete export is temporarily unavailable because conversation storage is offline.',
    })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    const stream = await prepareCompanyDataExport(client, {
      companyId: req.company.id_empresa,
      userId: req.user.id_usuario,
    })

    res
      .status(200)
      .type('application/json; charset=utf-8')
      .set({
        'Cache-Control': 'no-store, private',
        Pragma: 'no-cache',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': `attachment; filename="kontrol-company-${req.company.id_empresa}-export.json"`,
        Vary: 'Authorization',
      })

    stream.on('error', (error) => {
      logger.error('Company data export stream failed:', error)
      if (res.headersSent) res.destroy(error)
      else next(error)
    })
    res.on('close', () => {
      if (!res.writableEnded) stream.destroy(new Error('Export download was interrupted.'))
    })
    stream.pipe(res)
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } finally {
      client.release()
    }
    next(error)
  }
}

export const deleteOwnAccount = async (req, res) => {
  if (!isMongoReady()) {
    return res.status(503).json({
      success: false,
      message: 'Account deletion is temporarily unavailable because conversation storage is offline.',
    })
  }

  const client = await pool.connect()
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

    const hasPassword = user.password_hash
      ? await bcrypt.compare(req.body.password || '', user.password_hash)
      : false
    const hasGoogleProof = verifyGoogleReauthentication(req.body.google_reauth_token, user.id_usuario)
    if (!hasPassword && !hasGoogleProof) {
      await client.query('ROLLBACK')
      return invalidCredentials(res)
    }

    await removeMongoAccountData(user.id_usuario)

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
        await client.query(
          'UPDATE public.empresa SET activo = false WHERE id_empresa = $1',
          [membership.id_empresa]
        )
      }
    }

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

    await client.query('COMMIT')
    disconnectUserSockets(user.id_usuario)
    return res.json({
      success: true,
      data: {
        account: 'disabled_and_anonymized',
        companyRecords: 'retained_for_business_continuity',
        retentionPeriod: 'not_defined_in_the_current_policy',
        externalProviders: 'not_deleted_by_this_operation',
        ownerCompanies: memberships.rows
          .filter(({ rol_empresa }) => rol_empresa === 'owner')
          .map(({ id_empresa }) => id_empresa),
      },
    })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
