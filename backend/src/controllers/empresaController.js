import pool from '../db/pool.js'
import {
  acceptCompanyInvitation,
  deactivateActiveInvitation,
  getActiveInvitationByEmpresa,
  getInvitationByToken,
  getOrCreateActiveInvitation,
  serializeInvitation,
  serializeInvitationCompany,
} from '../services/empresaInvitacionService.js'
import {
  buildEmpresaAccessContext,
  getCompanyProjectAssignments,
  getCompanyProjects,
  getProjectPermissionsCatalog,
} from '../services/projectAccessService.js'

const MEMBER_SELECT = `
  SELECT
    u.id_usuario,
    u.nombre,
    u.apellido,
    u.email,
    u.telefono,
    u.activo,
    re.nombre AS rol_empresa,
    re.descripcion AS rol_descripcion
  FROM public.empresa_usuario eu
  JOIN public.usuario u ON u.id_usuario = eu.id_usuario
  JOIN public.rol_empresa re ON re.id_rol_empresa = eu.id_rol_empresa
  WHERE eu.id_empresa = $1
`

const mapMemberAssignments = (members, assignments) => {
  const assignmentsByUser = new Map()

  for (const assignment of assignments) {
    const currentAssignments = assignmentsByUser.get(assignment.id_usuario) ?? []
    currentAssignments.push({
      id_proyecto: assignment.id_proyecto,
      proyecto_nombre: assignment.proyecto_nombre,
      proyecto_estado: assignment.proyecto_estado,
      permisos: assignment.permisos,
      rol_proyecto: assignment.rol_proyecto,
    })
    assignmentsByUser.set(assignment.id_usuario, currentAssignments)
  }

  return members.map((member) => ({
    ...member,
    project_assignments: assignmentsByUser.get(member.id_usuario) ?? [],
  }))
}

/**
 * POST /api/empresas
 * Crea una empresa y vincula al usuario autenticado como 'owner'.
 * Usado en onboarding cuando el usuario aún no pertenece a ninguna empresa.
 */
export const createEmpresa = async (req, res) => {
  const { nombre, industria, telefono, direccion } = req.body
  const id_usuario = req.user.id_usuario

  const userRow = await pool.query(
    'SELECT email FROM public.usuario WHERE id_usuario = $1',
    [id_usuario]
  )
  const email = userRow.rows[0]?.email

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const empresaInserted = await client.query(
      `INSERT INTO public.empresa (nombre, industria, telefono, direccion, email)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_empresa, nombre, email`,
      [nombre, industria ?? null, telefono ?? null, direccion ?? null, email]
    )
    const id_empresa = empresaInserted.rows[0].id_empresa

    // El creador de la empresa queda como 'owner'
    const ownerRole = await client.query(
      "SELECT id_rol_empresa FROM public.rol_empresa WHERE nombre = 'owner' LIMIT 1"
    )
    if (!ownerRole.rows.length) {
      throw new Error('Rol owner no encontrado. Verifica el seed de la base de datos.')
    }

    await client.query(
      `INSERT INTO public.empresa_usuario (id_empresa, id_usuario, id_rol_empresa)
       VALUES ($1, $2, $3)`,
      [id_empresa, id_usuario, ownerRole.rows[0].id_rol_empresa]
    )

    await client.query('COMMIT')
    return res.status(201).json({ success: true, data: empresaInserted.rows[0] })
  } catch (err) {
    await client.query('ROLLBACK')
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Ya existe una empresa con ese email.' })
    }
    throw err
  } finally {
    client.release()
  }
}

/**
 * GET /api/empresas/mis-empresas
 * Retorna todas las empresas a las que pertenece el usuario autenticado.
 */
export const getMisEmpresas = async (req, res) => {
  const id_usuario = req.user.id_usuario

  const result = await pool.query(
    `SELECT e.id_empresa, e.nombre, e.industria, e.email, e.telefono, re.nombre AS rol
     FROM public.empresa e
     JOIN public.empresa_usuario eu ON eu.id_empresa = e.id_empresa
     JOIN public.rol_empresa re ON re.id_rol_empresa = eu.id_rol_empresa
     WHERE eu.id_usuario = $1
     ORDER BY e.nombre`,
    [id_usuario]
  )

  return res.json({ success: true, data: result.rows })
}

/**
 * GET /api/empresas/contexto-acceso
 * Resumen del acceso efectivo del usuario actual dentro de la empresa seleccionada.
 */
export const getEmpresaAccessContext = async (req, res) => {
  const data = await buildEmpresaAccessContext({
    client: pool,
    id_empresa: req.empresa.id_empresa,
    id_usuario: req.user.id_usuario,
    rol_empresa: req.empresa.rol_empresa,
  })

  return res.json({
    success: true,
    data: {
      empresa: {
        id_empresa: req.empresa.id_empresa,
        rol_empresa: req.empresa.rol_empresa,
      },
      ...data,
    },
  })
}

/**
 * GET /api/empresas/panel-usuarios
 * Retorna el estado actual del panel de miembros de la empresa seleccionada.
 */
export const getEmpresaUsersPanel = async (req, res) => {
  const { id_empresa, rol_empresa } = req.empresa
  const canManageUsers = rol_empresa === 'owner'

  const [empresaResult, membersResult, rolesResult, activeInvitation, projects, permissionsCatalog, projectAssignments] = await Promise.all([
    pool.query(
      `SELECT id_empresa, nombre, industria, telefono, direccion, email
       FROM public.empresa
       WHERE id_empresa = $1`,
      [id_empresa]
    ),
    pool.query(
      `${MEMBER_SELECT}
       ORDER BY
         CASE re.nombre
           WHEN 'owner' THEN 0
           WHEN 'admin' THEN 1
           WHEN 'manager' THEN 2
           ELSE 3
         END,
         LOWER(u.nombre),
         LOWER(u.apellido),
         u.id_usuario`,
      [id_empresa]
    ),
    canManageUsers
      ? pool.query(
          `SELECT nombre, descripcion
           FROM public.rol_empresa
           WHERE nombre != 'owner'
           ORDER BY
             CASE nombre
               WHEN 'admin' THEN 0
               WHEN 'manager' THEN 1
               WHEN 'collaborator' THEN 2
               ELSE 3
             END,
             nombre`
        )
      : Promise.resolve({ rows: [] }),
    canManageUsers ? getActiveInvitationByEmpresa(pool, id_empresa) : Promise.resolve(null),
    getCompanyProjects(pool, { id_empresa }),
    getProjectPermissionsCatalog(pool),
    getCompanyProjectAssignments(pool, { id_empresa }),
  ])

  if (!empresaResult.rows.length) {
    return res.status(404).json({ success: false, message: 'Empresa no encontrada.' })
  }

  return res.json({
    success: true,
    data: {
      empresa: {
        ...empresaResult.rows[0],
        rol_actual: rol_empresa,
      },
      can_manage_users: canManageUsers,
      invitation: canManageUsers ? serializeInvitation(activeInvitation, req) : null,
      available_roles: rolesResult.rows,
      project_permission_catalog: permissionsCatalog,
      projects,
      members: mapMemberAssignments(membersResult.rows, projectAssignments),
    },
  })
}

/**
 * POST /api/empresas/invitacion
 * Genera o reutiliza el enlace activo de invitación de la empresa actual.
 */
export const createOrGetEmpresaInvitation = async (req, res) => {
  const invitation = await getOrCreateActiveInvitation({
    client: pool,
    id_empresa: req.empresa.id_empresa,
    id_usuario_owner: req.user.id_usuario,
    req,
  })

  return res.status(201).json({ success: true, data: invitation })
}

/**
 * DELETE /api/empresas/invitacion
 * Desactiva el enlace de invitación activo de la empresa actual.
 */
export const deactivateEmpresaInvitation = async (req, res) => {
  const invitation = await deactivateActiveInvitation({
    client: pool,
    id_empresa: req.empresa.id_empresa,
    req,
  })

  if (!invitation) {
    return res.status(404).json({
      success: false,
      message: 'No hay un enlace de invitación activo para desactivar.',
    })
  }

  return res.json({
    success: true,
    message: 'El enlace de invitación fue desactivado.',
    data: invitation,
  })
}

/**
 * GET /api/empresas/invitaciones/:token
 * Consulta pública del enlace de invitación.
 */
export const getPublicEmpresaInvitation = async (req, res) => {
  const invitation = await getInvitationByToken(pool, req.params.token)

  if (!invitation) {
    return res.status(404).json({
      success: false,
      code: 'invite_not_found',
      message: 'La invitación no existe.',
    })
  }

  const statusCode = invitation.activa ? 200 : 410
  return res.status(statusCode).json({
    success: invitation.activa,
    code: invitation.activa ? 'invite_active' : 'invite_inactive',
    message: invitation.activa
      ? 'Invitación disponible.'
      : 'La invitación ya no está activa.',
    data: {
      invitation: serializeInvitation(invitation, req),
      empresa: serializeInvitationCompany(invitation),
      rol_asignado: 'collaborator',
    },
  })
}

/**
 * POST /api/empresas/invitaciones/:token/accept
 * Acepta una invitación usando el usuario autenticado.
 */
export const acceptEmpresaInvitation = async (req, res) => {
  const result = await acceptCompanyInvitation({
    client: pool,
    inviteToken: req.params.token,
    id_usuario: req.user.id_usuario,
    req,
  })

  if (!result.success) {
    return res.status(result.code === 'invite_inactive' ? 410 : 404).json(result)
  }

  return res.json(result)
}

/**
 * PATCH /api/empresas/miembros/:id_usuario/rol
 * Cambia el rol de un miembro dentro de la empresa actual.
 */
export const updateEmpresaMemberRole = async (req, res) => {
  const { id_empresa } = req.empresa
  const { id_usuario } = req.params
  const { rol } = req.body

  if (rol === 'owner') {
    return res.status(400).json({
      success: false,
      message: 'El rol owner no se puede asignar desde este panel.',
    })
  }

  const client = await pool.connect()
  try {
    const [memberResult, roleResult] = await Promise.all([
      client.query(
        `SELECT re.nombre AS rol_empresa
         FROM public.empresa_usuario eu
         JOIN public.rol_empresa re ON re.id_rol_empresa = eu.id_rol_empresa
         WHERE eu.id_empresa = $1 AND eu.id_usuario = $2
         LIMIT 1`,
        [id_empresa, id_usuario]
      ),
      client.query(
        `SELECT id_rol_empresa, nombre
         FROM public.rol_empresa
         WHERE nombre = $1
         LIMIT 1`,
        [rol]
      ),
    ])

    if (!memberResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Miembro no encontrado en esta empresa.' })
    }

    if (memberResult.rows[0].rol_empresa === 'owner') {
      return res.status(409).json({
        success: false,
        message: 'No puedes cambiar el rol del owner.',
      })
    }

    if (!roleResult.rows.length || roleResult.rows[0].nombre === 'owner') {
      return res.status(400).json({
        success: false,
        message: 'El rol solicitado no es válido para esta operación.',
      })
    }

    await client.query(
      `UPDATE public.empresa_usuario
       SET id_rol_empresa = $1
       WHERE id_empresa = $2 AND id_usuario = $3`,
      [roleResult.rows[0].id_rol_empresa, id_empresa, id_usuario]
    )

    const updatedMember = await client.query(
      `${MEMBER_SELECT}
       AND eu.id_usuario = $2
       LIMIT 1`,
      [id_empresa, id_usuario]
    )

    return res.json({
      success: true,
      message: 'Rol actualizado correctamente.',
      data: updatedMember.rows[0],
    })
  } finally {
    client.release()
  }
}

/**
 * PUT /api/empresas/miembros/:id_usuario/proyectos/:id_proyecto
 * Asigna un proyecto a un miembro y define sus permisos explícitos.
 */
export const upsertEmpresaMemberProjectAccess = async (req, res) => {
  const { id_empresa } = req.empresa
  const { id_usuario, id_proyecto } = req.params
  const { permisos = [] } = req.body

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const [memberResult, projectResult, permissionRows] = await Promise.all([
      client.query(
        `SELECT re.nombre AS rol_empresa
         FROM public.empresa_usuario eu
         JOIN public.rol_empresa re ON re.id_rol_empresa = eu.id_rol_empresa
         WHERE eu.id_empresa = $1 AND eu.id_usuario = $2
         LIMIT 1`,
        [id_empresa, id_usuario]
      ),
      client.query(
        `SELECT id_proyecto, nombre, estado
         FROM public.proyecto
         WHERE id_empresa = $1 AND id_proyecto = $2
         LIMIT 1`,
        [id_empresa, id_proyecto]
      ),
      permisos.length
        ? client.query(
            `SELECT id_permiso_proyecto, nombre_permiso
             FROM public.permiso_proyecto
             WHERE nombre_permiso = ANY($1::varchar[])`,
            [permisos]
          )
        : Promise.resolve({ rows: [] }),
    ])

    if (!memberResult.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Miembro no encontrado en esta empresa.' })
    }

    if (memberResult.rows[0].rol_empresa === 'owner') {
      await client.query('ROLLBACK')
      return res.status(409).json({
        success: false,
        message: 'El owner no necesita asignaciones por proyecto.',
      })
    }

    if (!projectResult.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Proyecto no encontrado en esta empresa.' })
    }

    if (permissionRows.rows.length !== permisos.length) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        success: false,
        message: 'Uno o más permisos de proyecto no son válidos.',
      })
    }

    await client.query(
      `INSERT INTO public.proyecto_usuario (id_proyecto, id_usuario, id_rol_proyecto)
       VALUES ($1, $2, NULL)
       ON CONFLICT (id_proyecto, id_usuario) DO NOTHING`,
      [id_proyecto, id_usuario]
    )

    await client.query(
      `DELETE FROM public.proyecto_usuario_permiso
       WHERE id_proyecto = $1 AND id_usuario = $2`,
      [id_proyecto, id_usuario]
    )

    for (const permission of permissionRows.rows) {
      await client.query(
        `INSERT INTO public.proyecto_usuario_permiso (id_proyecto, id_usuario, id_permiso_proyecto)
         VALUES ($1, $2, $3)`,
        [id_proyecto, id_usuario, permission.id_permiso_proyecto]
      )
    }

    await client.query('COMMIT')

    return res.json({
      success: true,
      message: 'Acceso al proyecto actualizado correctamente.',
      data: {
        id_usuario: Number(id_usuario),
        id_proyecto: Number(id_proyecto),
        proyecto_nombre: projectResult.rows[0].nombre,
        proyecto_estado: projectResult.rows[0].estado,
        permisos,
      },
    })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/**
 * DELETE /api/empresas/miembros/:id_usuario/proyectos/:id_proyecto
 * Revoca completamente el acceso de un miembro a un proyecto.
 */
export const removeEmpresaMemberProjectAccess = async (req, res) => {
  const { id_empresa } = req.empresa
  const { id_usuario, id_proyecto } = req.params

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const [memberResult, projectResult] = await Promise.all([
      client.query(
        `SELECT re.nombre AS rol_empresa
         FROM public.empresa_usuario eu
         JOIN public.rol_empresa re ON re.id_rol_empresa = eu.id_rol_empresa
         WHERE eu.id_empresa = $1 AND eu.id_usuario = $2
         LIMIT 1`,
        [id_empresa, id_usuario]
      ),
      client.query(
        `SELECT id_proyecto
         FROM public.proyecto
         WHERE id_empresa = $1 AND id_proyecto = $2
         LIMIT 1`,
        [id_empresa, id_proyecto]
      ),
    ])

    if (!memberResult.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Miembro no encontrado en esta empresa.' })
    }

    if (memberResult.rows[0].rol_empresa === 'owner') {
      await client.query('ROLLBACK')
      return res.status(409).json({
        success: false,
        message: 'El owner no utiliza asignaciones por proyecto.',
      })
    }

    if (!projectResult.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Proyecto no encontrado en esta empresa.' })
    }

    await client.query(
      `DELETE FROM public.asignacion
       WHERE id_proyecto = $1 AND id_usuario = $2`,
      [id_proyecto, id_usuario]
    )

    await client.query(
      `DELETE FROM public.proyecto_usuario_permiso
       WHERE id_proyecto = $1 AND id_usuario = $2`,
      [id_proyecto, id_usuario]
    )

    const deleted = await client.query(
      `DELETE FROM public.proyecto_usuario
       WHERE id_proyecto = $1 AND id_usuario = $2
       RETURNING id_proyecto`,
      [id_proyecto, id_usuario]
    )

    if (!deleted.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({
        success: false,
        message: 'Este usuario no estaba asignado a ese proyecto.',
      })
    }

    await client.query('COMMIT')

    return res.json({
      success: true,
      message: 'Acceso al proyecto removido correctamente.',
    })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/**
 * DELETE /api/empresas/miembros/:id_usuario
 * Expulsa a un miembro de la empresa actual.
 */
export const removeEmpresaMember = async (req, res) => {
  const { id_empresa } = req.empresa
  const { id_usuario } = req.params

  if (Number(id_usuario) === req.user.id_usuario) {
    return res.status(409).json({
      success: false,
      message: 'El owner no puede expulsarse a sí mismo.',
    })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const memberResult = await client.query(
      `SELECT re.nombre AS rol_empresa
       FROM public.empresa_usuario eu
       JOIN public.rol_empresa re ON re.id_rol_empresa = eu.id_rol_empresa
       WHERE eu.id_empresa = $1 AND eu.id_usuario = $2
       LIMIT 1`,
      [id_empresa, id_usuario]
    )

    if (!memberResult.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Miembro no encontrado en esta empresa.' })
    }

    if (memberResult.rows[0].rol_empresa === 'owner') {
      await client.query('ROLLBACK')
      return res.status(409).json({
        success: false,
        message: 'No puedes expulsar al owner de la empresa.',
      })
    }

    const assignedProjects = await client.query(
      `SELECT COUNT(*)::int AS total
       FROM public.proyecto
       WHERE id_empresa = $1 AND id_encargado = $2`,
      [id_empresa, id_usuario]
    )

    if (assignedProjects.rows[0].total > 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({
        success: false,
        message: 'No puedes expulsar a este usuario porque aún es encargado de uno o más proyectos.',
      })
    }

    await client.query(
      `DELETE FROM public.asignacion a
       USING public.proyecto p
       WHERE a.id_proyecto = p.id_proyecto
         AND p.id_empresa = $1
         AND a.id_usuario = $2`,
      [id_empresa, id_usuario]
    )

    await client.query(
      `DELETE FROM public.proyecto_usuario_permiso pup
       USING public.proyecto p
       WHERE pup.id_proyecto = p.id_proyecto
         AND p.id_empresa = $1
         AND pup.id_usuario = $2`,
      [id_empresa, id_usuario]
    )

    await client.query(
      `DELETE FROM public.proyecto_usuario pu
       USING public.proyecto p
       WHERE pu.id_proyecto = p.id_proyecto
         AND p.id_empresa = $1
         AND pu.id_usuario = $2`,
      [id_empresa, id_usuario]
    )

    await client.query(
      `DELETE FROM public.empresa_usuario
       WHERE id_empresa = $1 AND id_usuario = $2`,
      [id_empresa, id_usuario]
    )

    await client.query('COMMIT')

    return res.json({
      success: true,
      message: 'El miembro fue removido de la empresa.',
    })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
