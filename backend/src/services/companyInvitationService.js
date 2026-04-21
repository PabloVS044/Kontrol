import crypto from 'node:crypto'
import { buildInvitationUrl } from '../utils/frontendUrl.js'

const INVITATION_SELECT = `
  SELECT
    ei.id_invitacion,
    ei.id_empresa,
    ei.token,
    ei.id_usuario_owner,
    ei.activa,
    ei.creada_en,
    ei.desactivada_en,
    ei.ultimo_uso_en,
    e.nombre AS empresa_nombre,
    e.industria AS empresa_industria,
    e.email AS empresa_email,
    u.nombre AS owner_nombre,
    u.apellido AS owner_apellido
  FROM public.empresa_invitacion ei
  JOIN public.empresa e ON e.id_empresa = ei.id_empresa
  JOIN public.usuario u ON u.id_usuario = ei.id_usuario_owner
`

export const serializeInvitation = (invitation, req) => {
  if (!invitation) return null

  return {
    id_invitacion: invitation.id_invitacion,
    token: invitation.token,
    activa: invitation.activa,
    creada_en: invitation.creada_en,
    desactivada_en: invitation.desactivada_en,
    ultimo_uso_en: invitation.ultimo_uso_en,
    link: buildInvitationUrl(req, invitation.token),
  }
}

export const serializeInvitationCompany = (invitation) => {
  if (!invitation) return null

  return {
    id_empresa: invitation.id_empresa,
    nombre: invitation.empresa_nombre,
    industria: invitation.empresa_industria,
    email: invitation.empresa_email,
    owner_nombre: [invitation.owner_nombre, invitation.owner_apellido].filter(Boolean).join(' ').trim(),
  }
}

export const getActiveInvitationByEmpresa = async (client, id_empresa) => {
  const result = await client.query(
    `${INVITATION_SELECT}
     WHERE ei.id_empresa = $1 AND ei.activa = true
     ORDER BY ei.id_invitacion DESC
     LIMIT 1`,
    [id_empresa]
  )

  return result.rows[0] ?? null
}

export const getInvitationByToken = async (client, token) => {
  const result = await client.query(
    `${INVITATION_SELECT}
     WHERE ei.token = $1
     LIMIT 1`,
    [token]
  )

  return result.rows[0] ?? null
}

const generateInvitationToken = () => crypto.randomBytes(24).toString('base64url')

export const getCollaboratorRole = async (client) => {
  const result = await client.query(
    `SELECT id_rol_empresa, nombre
     FROM public.rol_empresa
     WHERE nombre = 'collaborator'
     LIMIT 1`
  )

  if (!result.rows.length) {
    throw new Error('Collaborator role not found. Check the database seed data.')
  }

  return result.rows[0]
}

export const getOrCreateActiveInvitation = async ({ client, id_empresa, id_usuario_owner, req }) => {
  const existing = await getActiveInvitationByEmpresa(client, id_empresa)
  if (existing) {
    return serializeInvitation(existing, req)
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = generateInvitationToken()

    try {
      const inserted = await client.query(
        `INSERT INTO public.empresa_invitacion (id_empresa, token, id_usuario_owner)
         VALUES ($1, $2, $3)
         RETURNING id_invitacion, id_empresa, token, id_usuario_owner, activa, creada_en, desactivada_en, ultimo_uso_en`,
        [id_empresa, token, id_usuario_owner]
      )

      return serializeInvitation(inserted.rows[0], req)
    } catch (error) {
      if (error.code !== '23505') {
        throw error
      }

      const activeInvitation = await getActiveInvitationByEmpresa(client, id_empresa)
      if (activeInvitation) {
        return serializeInvitation(activeInvitation, req)
      }
    }
  }

  throw new Error('Could not generate the invitation link.')
}

export const deactivateActiveInvitation = async ({ client, id_empresa, req }) => {
  const result = await client.query(
    `UPDATE public.empresa_invitacion
     SET activa = false,
         desactivada_en = CURRENT_TIMESTAMP
     WHERE id_empresa = $1 AND activa = true
     RETURNING id_invitacion, id_empresa, token, id_usuario_owner, activa, creada_en, desactivada_en, ultimo_uso_en`,
    [id_empresa]
  )

  return serializeInvitation(result.rows[0] ?? null, req)
}

export const acceptCompanyInvitation = async ({ client, inviteToken, id_usuario, req }) => {
  const invitation = await getInvitationByToken(client, inviteToken)

  if (!invitation) {
    return {
      success: false,
      code: 'invite_not_found',
      message: 'The invitation does not exist.',
      invitation: null,
      empresa: null,
    }
  }

  if (!invitation.activa) {
    return {
      success: false,
      code: 'invite_inactive',
      message: 'This invitation is no longer active.',
      invitation: serializeInvitation(invitation, req),
      empresa: serializeInvitationCompany(invitation),
    }
  }

  const existingMembership = await client.query(
    `SELECT re.nombre AS rol_empresa
     FROM public.empresa_usuario eu
     JOIN public.rol_empresa re ON re.id_rol_empresa = eu.id_rol_empresa
     WHERE eu.id_empresa = $1 AND eu.id_usuario = $2
     LIMIT 1`,
    [invitation.id_empresa, id_usuario]
  )

  if (existingMembership.rows.length) {
    await client.query(
      `UPDATE public.empresa_invitacion
       SET ultimo_uso_en = CURRENT_TIMESTAMP
       WHERE id_invitacion = $1`,
      [invitation.id_invitacion]
    )

    return {
      success: true,
      joined: false,
      alreadyMember: true,
      code: 'already_member',
      message: 'You already belong to this company.',
      invitation: serializeInvitation(invitation, req),
      empresa: serializeInvitationCompany(invitation),
      membership: {
        rol: existingMembership.rows[0].rol_empresa,
      },
    }
  }

  const collaboratorRole = await getCollaboratorRole(client)

  try {
    await client.query(
      `INSERT INTO public.empresa_usuario (id_empresa, id_usuario, id_rol_empresa)
       VALUES ($1, $2, $3)`,
      [invitation.id_empresa, id_usuario, collaboratorRole.id_rol_empresa]
    )
  } catch (error) {
    if (error.code !== '23505') {
      throw error
    }

    return {
      success: true,
      joined: false,
      alreadyMember: true,
      code: 'already_member',
      message: 'You already belong to this company.',
      invitation: serializeInvitation(invitation, req),
      empresa: serializeInvitationCompany(invitation),
      membership: {
        rol: collaboratorRole.nombre,
      },
    }
  }

  await client.query(
    `UPDATE public.empresa_invitacion
     SET ultimo_uso_en = CURRENT_TIMESTAMP
     WHERE id_invitacion = $1`,
    [invitation.id_invitacion]
  )

  return {
    success: true,
    joined: true,
    alreadyMember: false,
    code: 'accepted',
    message: 'You joined the company successfully.',
    invitation: serializeInvitation(invitation, req),
    empresa: serializeInvitationCompany(invitation),
    membership: {
      rol: collaboratorRole.nombre,
    },
  }
}
