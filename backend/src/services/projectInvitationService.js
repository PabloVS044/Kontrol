import crypto from 'node:crypto'
import { getCollaboratorRole, serializeInvitationCompany } from './empresaInvitacionService.js'
import { buildInvitationUrl } from '../utils/frontendUrl.js'

const PROJECT_INVITATION_SELECT = `
  SELECT
    pi.id_invitacion,
    pi.id_empresa,
    pi.id_proyecto,
    pi.token,
    pi.id_usuario_invitador,
    pi.activa,
    pi.creada_en,
    pi.desactivada_en,
    pi.ultimo_uso_en,
    e.nombre AS empresa_nombre,
    e.industria AS empresa_industria,
    e.email AS empresa_email,
    p.nombre AS proyecto_nombre,
    p.estado AS proyecto_estado,
    u.nombre AS owner_nombre,
    u.apellido AS owner_apellido,
    COALESCE(
      array_agg(DISTINCT pp.nombre_permiso) FILTER (WHERE pp.nombre_permiso IS NOT NULL),
      '{}'::varchar[]
    ) AS permisos
  FROM public.proyecto_invitacion pi
  JOIN public.empresa e ON e.id_empresa = pi.id_empresa
  JOIN public.proyecto p ON p.id_proyecto = pi.id_proyecto
  JOIN public.usuario u ON u.id_usuario = pi.id_usuario_invitador
  LEFT JOIN public.proyecto_invitacion_permiso pip ON pip.id_invitacion = pi.id_invitacion
  LEFT JOIN public.permiso_proyecto pp ON pp.id_permiso_proyecto = pip.id_permiso_proyecto
`

const PROJECT_INVITATION_GROUP_BY = `
  GROUP BY
    pi.id_invitacion,
    pi.id_empresa,
    pi.id_proyecto,
    pi.token,
    pi.id_usuario_invitador,
    pi.activa,
    pi.creada_en,
    pi.desactivada_en,
    pi.ultimo_uso_en,
    e.nombre,
    e.industria,
    e.email,
    p.nombre,
    p.estado,
    u.nombre,
    u.apellido
`

const normalizeInvitation = (invitation) => {
  if (!invitation) return null

  return {
    ...invitation,
    permisos: Array.isArray(invitation.permisos) ? invitation.permisos.filter(Boolean) : [],
  }
}

const generateInvitationToken = () => crypto.randomBytes(24).toString('base64url')

export const serializeProjectInvitation = (invitation, req) => {
  if (!invitation) return null

  return {
    id_invitacion: invitation.id_invitacion,
    token: invitation.token,
    activa: invitation.activa,
    creada_en: invitation.creada_en,
    desactivada_en: invitation.desactivada_en,
    ultimo_uso_en: invitation.ultimo_uso_en,
    link: buildInvitationUrl(req, invitation.token),
    permisos: invitation.permisos,
  }
}

export const serializeProjectInvitationProject = (invitation) => {
  if (!invitation) return null

  return {
    id_proyecto: invitation.id_proyecto,
    nombre: invitation.proyecto_nombre,
    estado: invitation.proyecto_estado,
  }
}

export const getActiveProjectInvitationByProject = async (client, { id_empresa, id_proyecto }) => {
  const result = await client.query(
    `${PROJECT_INVITATION_SELECT}
     WHERE pi.id_empresa = $1 AND pi.id_proyecto = $2 AND pi.activa = true
     ${PROJECT_INVITATION_GROUP_BY}
     ORDER BY pi.id_invitacion DESC
     LIMIT 1`,
    [id_empresa, id_proyecto]
  )

  return normalizeInvitation(result.rows[0] ?? null)
}

export const getProjectInvitationByToken = async (client, token) => {
  const result = await client.query(
    `${PROJECT_INVITATION_SELECT}
     WHERE pi.token = $1
     ${PROJECT_INVITATION_GROUP_BY}
     LIMIT 1`,
    [token]
  )

  return normalizeInvitation(result.rows[0] ?? null)
}

const syncInvitationPermissions = async ({ client, id_invitacion, permissionRows }) => {
  await client.query(
    `DELETE FROM public.proyecto_invitacion_permiso
     WHERE id_invitacion = $1`,
    [id_invitacion]
  )

  for (const permission of permissionRows) {
    await client.query(
      `INSERT INTO public.proyecto_invitacion_permiso (id_invitacion, id_permiso_proyecto)
       VALUES ($1, $2)`,
      [id_invitacion, permission.id_permiso_proyecto]
    )
  }
}

export const getOrCreateActiveProjectInvitation = async ({
  client,
  id_empresa,
  id_proyecto,
  id_usuario_invitador,
  permissionRows,
  req,
}) => {
  const existing = await getActiveProjectInvitationByProject(client, { id_empresa, id_proyecto })
  if (existing) {
    await syncInvitationPermissions({
      client,
      id_invitacion: existing.id_invitacion,
      permissionRows,
    })

    const refreshed = await getProjectInvitationByToken(client, existing.token)
    return serializeProjectInvitation(refreshed, req)
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = generateInvitationToken()

    try {
      const inserted = await client.query(
        `INSERT INTO public.proyecto_invitacion (id_empresa, id_proyecto, token, id_usuario_invitador)
         VALUES ($1, $2, $3, $4)
         RETURNING id_invitacion`,
        [id_empresa, id_proyecto, token, id_usuario_invitador]
      )

      await syncInvitationPermissions({
        client,
        id_invitacion: inserted.rows[0].id_invitacion,
        permissionRows,
      })

      const invitation = await getProjectInvitationByToken(client, token)
      return serializeProjectInvitation(invitation, req)
    } catch (error) {
      if (error.code !== '23505') {
        throw error
      }

      const activeInvitation = await getActiveProjectInvitationByProject(client, { id_empresa, id_proyecto })
      if (activeInvitation) {
        await syncInvitationPermissions({
          client,
          id_invitacion: activeInvitation.id_invitacion,
          permissionRows,
        })

        const refreshed = await getProjectInvitationByToken(client, activeInvitation.token)
        return serializeProjectInvitation(refreshed, req)
      }
    }
  }

  throw new Error('No se pudo generar la invitación del proyecto.')
}

export const deactivateActiveProjectInvitation = async ({ client, id_empresa, id_proyecto, req }) => {
  const result = await client.query(
    `UPDATE public.proyecto_invitacion
     SET activa = false,
         desactivada_en = CURRENT_TIMESTAMP
     WHERE id_empresa = $1 AND id_proyecto = $2 AND activa = true
     RETURNING token`,
    [id_empresa, id_proyecto]
  )

  if (!result.rows.length) return null

  const invitation = await getProjectInvitationByToken(client, result.rows[0].token)
  return serializeProjectInvitation(invitation, req)
}

export const acceptProjectInvitation = async ({ client, inviteToken, id_usuario, req }) => {
  const invitation = await getProjectInvitationByToken(client, inviteToken)

  if (!invitation) {
    return {
      success: false,
      code: 'invite_not_found',
      message: 'La invitación no existe.',
      invitation: null,
      empresa: null,
      proyecto: null,
    }
  }

  if (!invitation.activa) {
    return {
      success: false,
      code: 'invite_inactive',
      message: 'La invitación ya no está activa.',
      invitation: serializeProjectInvitation(invitation, req),
      empresa: serializeInvitationCompany(invitation),
      proyecto: serializeProjectInvitationProject(invitation),
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

  let membershipRole = existingMembership.rows[0]?.rol_empresa ?? null
  let joinedCompany = false

  if (!membershipRole) {
    const collaboratorRole = await getCollaboratorRole(client)

    await client.query(
      `INSERT INTO public.empresa_usuario (id_empresa, id_usuario, id_rol_empresa)
       VALUES ($1, $2, $3)
       ON CONFLICT (id_empresa, id_usuario) DO NOTHING`,
      [invitation.id_empresa, id_usuario, collaboratorRole.id_rol_empresa]
    )

    membershipRole = collaboratorRole.nombre
    joinedCompany = true
  }

  if (['owner', 'admin', 'manager'].includes(membershipRole)) {
    await client.query(
      `UPDATE public.proyecto_invitacion
       SET ultimo_uso_en = CURRENT_TIMESTAMP
       WHERE id_invitacion = $1`,
      [invitation.id_invitacion]
    )

    return {
      success: true,
      joined: joinedCompany,
      joinedCompany,
      alreadyMember: !joinedCompany,
      alreadyAssigned: true,
      code: 'already_assigned',
      message: 'Ya tienes acceso a este proyecto por tu rol actual dentro de la empresa.',
      invitation: serializeProjectInvitation(invitation, req),
      empresa: serializeInvitationCompany(invitation),
      proyecto: serializeProjectInvitationProject(invitation),
      membership: {
        rol: membershipRole,
      },
      permisos: invitation.permisos,
    }
  }

  const existingAssignment = await client.query(
    `SELECT 1
     FROM public.proyecto_usuario
     WHERE id_proyecto = $1 AND id_usuario = $2
     LIMIT 1`,
    [invitation.id_proyecto, id_usuario]
  )

  if (!existingAssignment.rows.length) {
    await client.query(
      `INSERT INTO public.proyecto_usuario (id_proyecto, id_usuario, id_rol_proyecto)
       VALUES ($1, $2, NULL)
       ON CONFLICT (id_proyecto, id_usuario) DO NOTHING`,
      [invitation.id_proyecto, id_usuario]
    )

    await client.query(
      `DELETE FROM public.proyecto_usuario_permiso
       WHERE id_proyecto = $1 AND id_usuario = $2`,
      [invitation.id_proyecto, id_usuario]
    )

    if (invitation.permisos.length) {
      const permissionRows = await client.query(
        `SELECT id_permiso_proyecto
         FROM public.permiso_proyecto
         WHERE nombre_permiso = ANY($1::varchar[])`,
        [invitation.permisos]
      )

      for (const permission of permissionRows.rows) {
        await client.query(
          `INSERT INTO public.proyecto_usuario_permiso (id_proyecto, id_usuario, id_permiso_proyecto)
           VALUES ($1, $2, $3)`,
          [invitation.id_proyecto, id_usuario, permission.id_permiso_proyecto]
        )
      }
    }
  }

  await client.query(
    `UPDATE public.proyecto_invitacion
     SET ultimo_uso_en = CURRENT_TIMESTAMP
     WHERE id_invitacion = $1`,
    [invitation.id_invitacion]
  )

  return {
    success: true,
    joined: joinedCompany || !existingAssignment.rows.length,
    joinedCompany,
    alreadyMember: !joinedCompany,
    alreadyAssigned: existingAssignment.rows.length > 0,
    code: existingAssignment.rows.length ? 'already_assigned' : 'accepted',
    message: existingAssignment.rows.length
      ? 'Ya tienes acceso a este proyecto.'
      : 'Te uniste al proyecto correctamente.',
    invitation: serializeProjectInvitation(invitation, req),
    empresa: serializeInvitationCompany(invitation),
    proyecto: serializeProjectInvitationProject(invitation),
    membership: {
      rol: membershipRole,
    },
    permisos: invitation.permisos,
  }
}
