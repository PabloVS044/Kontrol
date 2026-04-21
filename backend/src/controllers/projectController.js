import pool from '../db/pool.js'
import {
  DEFAULT_PROJECT_PERMISSION_NAMES,
  ensureProjectAccess,
  getAccessibleProjectAssignments,
  getProjectPermissionsCatalog,
  hasEmpresaManagementAccess as hasCompanyManagementAccess,
} from '../services/projectAccessService.js'
import {
  acceptProjectInvitation as acceptProjectInvitationToken,
  deactivateActiveProjectInvitation,
  getActiveProjectInvitationByProject,
  getOrCreateActiveProjectInvitation,
  getProjectInvitationByToken,
  serializeProjectInvitation,
  serializeProjectInvitationProject,
} from '../services/projectInvitationService.js'
import { serializeInvitationCompany } from '../services/companyInvitationService.js'

const PROJECT_SELECT = `
  id_proyecto, nombre, descripcion, fecha_inicio, fecha_fin_planificada,
  presupuesto_total, estado, id_empresa, id_encargado
`

const buildProjectPermissionMap = (assignments) =>
  new Map(assignments.map((assignment) => [assignment.id_proyecto, assignment.permisos]))

const normalizeMemberRow = (row) => ({
  ...row,
  permisos: Array.isArray(row.permisos) ? row.permisos.filter(Boolean) : [],
})

const getPermissionRowsByNames = async (client, permisos = []) => {
  if (!permisos.length) return []

  const result = await client.query(
    `SELECT id_permiso_proyecto, nombre_permiso
     FROM public.permiso_proyecto
     WHERE nombre_permiso = ANY($1::varchar[])`,
    [permisos]
  )

  if (result.rows.length !== permisos.length) {
    return null
  }

  return result.rows
}

export const getProjects = async (req, res) => {
  const { page, limit, estado } = req.query
  const { id_empresa, rol_empresa } = req.empresa
  const offset = (page - 1) * limit
  const managementAccess = hasCompanyManagementAccess(rol_empresa)

  if (!managementAccess) {
    const assignments = await getAccessibleProjectAssignments({
      client: pool,
      id_empresa,
      id_usuario: req.user.id_usuario,
      rol_empresa,
    })

    const accessibleProjectIds = assignments.map(({ id_proyecto }) => id_proyecto)
    if (!accessibleProjectIds.length) {
      return res.json({
        success: true,
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      })
    }

    const filters = ['id_empresa = $1', `id_proyecto = ANY($2::int[])`]
    const values = [id_empresa, accessibleProjectIds]

    if (estado) {
      values.push(estado)
      filters.push(`estado = $${values.length}`)
    }

    const where = `WHERE ${filters.join(' AND ')}`
    const permissionMap = buildProjectPermissionMap(assignments)

    const [countResult, dataResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM public.proyecto ${where}`, values),
      pool.query(
        `SELECT ${PROJECT_SELECT} FROM public.proyecto ${where}
         ORDER BY id_proyecto LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, limit, offset]
      ),
    ])

    return res.json({
      success: true,
      data: dataResult.rows.map((project) => ({
        ...project,
        mis_permisos: permissionMap.get(project.id_proyecto) ?? [],
      })),
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      },
    })
  }

  const filters = ['id_empresa = $1']
  const values = [id_empresa]

  if (estado) {
    values.push(estado)
    filters.push(`estado = $${values.length}`)
  }

  const where = `WHERE ${filters.join(' AND ')}`

  const [countResult, dataResult] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM public.proyecto ${where}`, values),
    pool.query(
      `SELECT ${PROJECT_SELECT} FROM public.proyecto ${where}
       ORDER BY id_proyecto LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    ),
  ])

  return res.json({
    success: true,
    data: dataResult.rows.map((project) => ({
      ...project,
      mis_permisos: [...DEFAULT_PROJECT_PERMISSION_NAMES],
    })),
    pagination: {
      page,
      limit,
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    },
  })
}

export const getProjectById = async (req, res) => {
  const { id_empresa, rol_empresa } = req.empresa

  if (!hasCompanyManagementAccess(rol_empresa)) {
    const assignments = await getAccessibleProjectAssignments({
      client: pool,
      id_empresa,
      id_usuario: req.user.id_usuario,
      rol_empresa,
    })

    const assignment = assignments.find(({ id_proyecto }) => id_proyecto === Number(req.params.id))
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Project not found.' })
    }

    const result = await pool.query(
      `SELECT ${PROJECT_SELECT} FROM public.proyecto WHERE id_proyecto = $1 AND id_empresa = $2`,
      [req.params.id, id_empresa]
    )
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Project not found.' })
    }

    return res.json({
      success: true,
      data: {
        ...result.rows[0],
        mis_permisos: assignment.permisos,
      },
    })
  }

  const result = await pool.query(
    `SELECT ${PROJECT_SELECT} FROM public.proyecto WHERE id_proyecto = $1 AND id_empresa = $2`,
    [req.params.id, id_empresa]
  )
  if (!result.rows.length) {
    return res.status(404).json({ success: false, message: 'Project not found.' })
  }

  return res.json({
    success: true,
    data: {
      ...result.rows[0],
      mis_permisos: [...DEFAULT_PROJECT_PERMISSION_NAMES],
    },
  })
}

export const createProject = async (req, res) => {
  const { nombre, descripcion, fecha_inicio, fecha_fin_planificada, presupuesto_total, estado } = req.body
  const { id_empresa } = req.empresa
  const id_encargado = req.user.id_usuario

  const result = await pool.query(
    `INSERT INTO public.proyecto
       (nombre, descripcion, fecha_inicio, fecha_fin_planificada, presupuesto_total, estado, id_empresa, id_encargado)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${PROJECT_SELECT}`,
    [
      nombre,
      descripcion ?? null,
      fecha_inicio,
      fecha_fin_planificada ?? null,
      presupuesto_total,
      estado ?? 'PLANIFICADO',
      id_empresa,
      id_encargado,
    ]
  )

  return res.status(201).json({ success: true, data: result.rows[0] })
}

export const updateProject = async (req, res) => {
  const { id } = req.params
  const { id_empresa } = req.empresa

  const existing = await pool.query(
    'SELECT id_proyecto FROM public.proyecto WHERE id_proyecto = $1 AND id_empresa = $2',
    [id, id_empresa]
  )
  if (!existing.rows.length) {
    return res.status(404).json({ success: false, message: 'Project not found.' })
  }

  const allowedFields = ['nombre', 'descripcion', 'fecha_inicio', 'fecha_fin_planificada', 'presupuesto_total', 'estado', 'id_encargado']
  const setClauses = []
  const values = []

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      values.push(req.body[field])
      setClauses.push(`${field} = $${values.length}`)
    }
  }

  values.push(id)
  const result = await pool.query(
    `UPDATE public.proyecto SET ${setClauses.join(', ')} WHERE id_proyecto = $${values.length} RETURNING ${PROJECT_SELECT}`,
    values
  )

  return res.json({ success: true, data: result.rows[0] })
}

export const deleteProject = async (req, res) => {
  const { id_empresa } = req.empresa
  const result = await pool.query(
    'DELETE FROM public.proyecto WHERE id_proyecto = $1 AND id_empresa = $2 RETURNING id_proyecto',
    [req.params.id, id_empresa]
  )

  if (!result.rows.length) {
    return res.status(404).json({ success: false, message: 'Project not found.' })
  }

  return res.json({ success: true, message: 'Project deleted successfully.' })
}

export const getProjectMembers = async (req, res) => {
  const { id } = req.params
  const { id_empresa } = req.empresa

  const result = await pool.query(
    `SELECT u.id_usuario, u.nombre, u.apellido, u.email
     FROM public.proyecto_usuario pu
     JOIN public.proyecto p ON p.id_proyecto = pu.id_proyecto
     JOIN public.usuario u ON u.id_usuario = pu.id_usuario
     WHERE pu.id_proyecto = $1
       AND p.id_empresa = $2
     ORDER BY LOWER(u.nombre), LOWER(u.apellido), u.id_usuario`,
    [id, id_empresa]
  )

  return res.json({ success: true, data: result.rows })
}

export const getProjectMembersPanel = async (req, res) => {
  const { id_empresa, rol_empresa } = req.empresa
  const id_proyecto = Number(req.params.id)

  const access = await ensureProjectAccess({
    client: pool,
    id_empresa,
    id_usuario: req.user.id_usuario,
    rol_empresa,
    id_proyecto,
  })

  if (!access.allowed) {
    return res.status(403).json({ success: false, message: 'You do not have access to this project.' })
  }

  const canManageMembers = access.permissions.includes('asignar_usuarios')

  const [projectResult, membersResult, availableMembersResult, permissionsCatalog, activeInvitation] = await Promise.all([
    pool.query(
      `SELECT id_proyecto, nombre, estado
       FROM public.proyecto
       WHERE id_empresa = $1 AND id_proyecto = $2
       LIMIT 1`,
      [id_empresa, id_proyecto]
    ),
    pool.query(
      `SELECT
         u.id_usuario,
         u.nombre,
         u.apellido,
         u.email,
         u.telefono,
         u.activo,
         re.nombre AS rol_empresa,
         rp.nombre AS rol_proyecto,
         COALESCE(
           array_agg(DISTINCT pp.nombre_permiso) FILTER (WHERE pp.nombre_permiso IS NOT NULL),
           '{}'::varchar[]
         ) AS permisos
       FROM public.proyecto_usuario pu
       JOIN public.proyecto p ON p.id_proyecto = pu.id_proyecto
       JOIN public.empresa_usuario eu ON eu.id_empresa = p.id_empresa AND eu.id_usuario = pu.id_usuario
       JOIN public.usuario u ON u.id_usuario = pu.id_usuario
       JOIN public.rol_empresa re ON re.id_rol_empresa = eu.id_rol_empresa
       LEFT JOIN public.rol_proyecto rp ON rp.id_rol_proyecto = pu.id_rol_proyecto
       LEFT JOIN public.proyecto_usuario_permiso pup
         ON pup.id_proyecto = pu.id_proyecto AND pup.id_usuario = pu.id_usuario
       LEFT JOIN public.permiso_proyecto pp ON pp.id_permiso_proyecto = pup.id_permiso_proyecto
       WHERE p.id_empresa = $1 AND pu.id_proyecto = $2
       GROUP BY
         u.id_usuario,
         u.nombre,
         u.apellido,
         u.email,
         u.telefono,
         u.activo,
         re.nombre,
         rp.nombre
       ORDER BY LOWER(u.nombre), LOWER(u.apellido), u.id_usuario`,
      [id_empresa, id_proyecto]
    ),
    canManageMembers
      ? pool.query(
          `SELECT
             u.id_usuario,
             u.nombre,
             u.apellido,
             u.email,
             re.nombre AS rol_empresa
           FROM public.empresa_usuario eu
           JOIN public.usuario u ON u.id_usuario = eu.id_usuario
           JOIN public.rol_empresa re ON re.id_rol_empresa = eu.id_rol_empresa
           WHERE eu.id_empresa = $1
             AND re.nombre != 'owner'
             AND NOT EXISTS (
               SELECT 1
               FROM public.proyecto_usuario pu
               WHERE pu.id_proyecto = $2 AND pu.id_usuario = eu.id_usuario
             )
           ORDER BY
             CASE re.nombre
               WHEN 'admin' THEN 0
               WHEN 'manager' THEN 1
               WHEN 'collaborator' THEN 2
               ELSE 3
             END,
             LOWER(u.nombre),
             LOWER(u.apellido),
             u.id_usuario`,
          [id_empresa, id_proyecto]
        )
      : Promise.resolve({ rows: [] }),
    getProjectPermissionsCatalog(pool),
    canManageMembers
      ? getActiveProjectInvitationByProject(pool, { id_empresa, id_proyecto })
      : Promise.resolve(null),
  ])

  if (!projectResult.rows.length) {
    return res.status(404).json({ success: false, message: 'Project not found.' })
  }

  return res.json({
    success: true,
    data: {
      project: projectResult.rows[0],
      can_manage_members: canManageMembers,
      invitation: activeInvitation ? serializeProjectInvitation(activeInvitation, req) : null,
      project_permission_catalog: permissionsCatalog,
      members: membersResult.rows.map(normalizeMemberRow),
      available_company_members: availableMembersResult.rows,
    },
  })
}

export const createOrGetProjectInvitation = async (req, res) => {
  const { id_empresa } = req.empresa
  const id_proyecto = Number(req.params.id)
  const { permisos = [] } = req.body

  const projectResult = await pool.query(
    `SELECT id_proyecto
     FROM public.proyecto
     WHERE id_empresa = $1 AND id_proyecto = $2
     LIMIT 1`,
    [id_empresa, id_proyecto]
  )

  if (!projectResult.rows.length) {
    return res.status(404).json({ success: false, message: 'Project not found.' })
  }

  const permissionRows = await getPermissionRowsByNames(pool, permisos)
  if (permissionRows === null) {
    return res.status(400).json({
      success: false,
      message: 'One or more project permissions are invalid.',
    })
  }

  const invitation = await getOrCreateActiveProjectInvitation({
    client: pool,
    id_empresa,
    id_proyecto,
    id_usuario_invitador: req.user.id_usuario,
    permissionRows,
    req,
  })

  return res.status(201).json({ success: true, data: invitation })
}

export const deactivateProjectInvitation = async (req, res) => {
  const { id_empresa } = req.empresa
  const id_proyecto = Number(req.params.id)

  const invitation = await deactivateActiveProjectInvitation({
    client: pool,
    id_empresa,
    id_proyecto,
    req,
  })

  if (!invitation) {
    return res.status(404).json({
      success: false,
      message: 'There is no active invitation link for this project.',
    })
  }

  return res.json({
    success: true,
    message: 'The project invitation link was deactivated.',
    data: invitation,
  })
}

export const getPublicProjectInvitation = async (req, res) => {
  const invitation = await getProjectInvitationByToken(pool, req.params.token)

  if (!invitation) {
    return res.status(404).json({
      success: false,
      code: 'invite_not_found',
      message: 'The invitation does not exist.',
    })
  }

  const statusCode = invitation.activa ? 200 : 410

  return res.status(statusCode).json({
    success: invitation.activa,
    code: invitation.activa ? 'invite_active' : 'invite_inactive',
    message: invitation.activa
      ? 'Invitation available.'
      : 'This invitation is no longer active.',
    data: {
      scope: 'project',
      invitation: serializeProjectInvitation(invitation, req),
      empresa: serializeInvitationCompany(invitation),
      proyecto: serializeProjectInvitationProject(invitation),
      rol_asignado: 'collaborator',
      permisos_proyecto: invitation.permisos,
    },
  })
}

export const acceptProjectInvitation = async (req, res) => {
  const result = await acceptProjectInvitationToken({
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

export const upsertProjectMemberAccess = async (req, res) => {
  const { id_empresa } = req.empresa
  const id_proyecto = Number(req.params.id)
  const id_usuario = Number(req.params.userId)
  const { permisos = [] } = req.body

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
        `SELECT id_proyecto, nombre, estado
         FROM public.proyecto
         WHERE id_empresa = $1 AND id_proyecto = $2
         LIMIT 1`,
        [id_empresa, id_proyecto]
      ),
    ])

    const permissionRows = await getPermissionRowsByNames(client, permisos)

    if (!memberResult.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Member not found in this company.' })
    }

    if (memberResult.rows[0].rol_empresa === 'owner') {
      await client.query('ROLLBACK')
      return res.status(409).json({
        success: false,
        message: 'The owner does not need project assignments.',
      })
    }

    if (!projectResult.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Project not found in this company.' })
    }

    if (permissionRows === null) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        success: false,
        message: 'One or more project permissions are invalid.',
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

    for (const permission of permissionRows) {
      await client.query(
        `INSERT INTO public.proyecto_usuario_permiso (id_proyecto, id_usuario, id_permiso_proyecto)
         VALUES ($1, $2, $3)`,
        [id_proyecto, id_usuario, permission.id_permiso_proyecto]
      )
    }

    await client.query('COMMIT')

    return res.json({
      success: true,
      message: 'Member access updated successfully.',
      data: {
        id_usuario,
        id_proyecto,
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

export const removeProjectMemberAccess = async (req, res) => {
  const { id_empresa } = req.empresa
  const id_proyecto = Number(req.params.id)
  const id_usuario = Number(req.params.userId)

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
      return res.status(404).json({ success: false, message: 'Member not found in this company.' })
    }

    if (memberResult.rows[0].rol_empresa === 'owner') {
      await client.query('ROLLBACK')
      return res.status(409).json({
        success: false,
        message: 'The owner does not use project assignments.',
      })
    }

    if (!projectResult.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Project not found in this company.' })
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
        message: 'This user was not assigned to this project.',
      })
    }

    await client.query('COMMIT')

    return res.json({
      success: true,
      message: 'Project access removed successfully.',
    })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
