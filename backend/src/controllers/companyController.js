import pool from '../db/pool.js'
import {
  acceptCompanyInvitation as acceptCompanyInvitationToken,
  deactivateActiveInvitation,
  getActiveInvitationByEmpresa as getActiveInvitationByCompany,
  getInvitationByToken,
  getOrCreateActiveInvitation,
  serializeInvitation,
  serializeInvitationCompany,
} from '../services/companyInvitationService.js'
import {
  buildEmpresaAccessContext as buildCompanyAccessContext,
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
 * POST /api/companies
 * Creates a company and links the authenticated user as 'owner'.
 * Used during onboarding when the user still does not belong to any company.
 */
export const createCompany = async (req, res) => {
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
      throw new Error('Owner role not found. Check the database seed data.')
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
      return res.status(409).json({ success: false, message: 'A company with that email already exists.' })
    }
    throw err
  } finally {
    client.release()
  }
}

/**
 * GET /api/companies/my-companies
 * Returns every company that the authenticated user belongs to.
 */
export const getMyCompanies = async (req, res) => {
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
 * GET /api/companies/access-context
 * Summary of the current user's effective access inside the selected company.
 */
export const getCompanyAccessContext = async (req, res) => {
  const data = await buildCompanyAccessContext({
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
 * GET /api/companies/members-panel
 * Returns the current state of the selected company's members panel.
 */
export const getCompanyUsersPanel = async (req, res) => {
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
    canManageUsers ? getActiveInvitationByCompany(pool, id_empresa) : Promise.resolve(null),
    getCompanyProjects(pool, { id_empresa }),
    getProjectPermissionsCatalog(pool),
    getCompanyProjectAssignments(pool, { id_empresa }),
  ])

  if (!empresaResult.rows.length) {
    return res.status(404).json({ success: false, message: 'Company not found.' })
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
 * POST /api/companies/invitation
 * Generates or reuses the current company's active invitation link.
 */
export const createOrGetCompanyInvitation = async (req, res) => {
  const invitation = await getOrCreateActiveInvitation({
    client: pool,
    id_empresa: req.empresa.id_empresa,
    id_usuario_owner: req.user.id_usuario,
    req,
  })

  return res.status(201).json({ success: true, data: invitation })
}

/**
 * DELETE /api/companies/invitation
 * Deactivates the current company's active invitation link.
 */
export const deactivateCompanyInvitation = async (req, res) => {
  const invitation = await deactivateActiveInvitation({
    client: pool,
    id_empresa: req.empresa.id_empresa,
    req,
  })

  if (!invitation) {
    return res.status(404).json({
      success: false,
      message: 'There is no active invitation link to deactivate.',
    })
  }

  return res.json({
    success: true,
    message: 'The invitation link was deactivated.',
    data: invitation,
  })
}

/**
 * GET /api/companies/invitations/:token
 * Public lookup for an invitation link.
 */
export const getPublicCompanyInvitation = async (req, res) => {
  const invitation = await getInvitationByToken(pool, req.params.token)

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
      invitation: serializeInvitation(invitation, req),
      empresa: serializeInvitationCompany(invitation),
      rol_asignado: 'collaborator',
    },
  })
}

/**
 * POST /api/companies/invitations/:token/accept
 * Accepts an invitation with the authenticated user.
 */
export const acceptCompanyInvitation = async (req, res) => {
  const result = await acceptCompanyInvitationToken({
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
 * PATCH /api/companies/members/:userId/role
 * Updates a member role inside the current company.
 */
export const updateCompanyMemberRole = async (req, res) => {
  const { id_empresa } = req.empresa
  const { userId: id_usuario } = req.params
  const { rol } = req.body

  if (rol === 'owner') {
    return res.status(400).json({
      success: false,
      message: 'The owner role cannot be assigned from this panel.',
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
      return res.status(404).json({ success: false, message: 'Member not found in this company.' })
    }

    if (memberResult.rows[0].rol_empresa === 'owner') {
      return res.status(409).json({
        success: false,
        message: 'You cannot change the owner role.',
      })
    }

    if (!roleResult.rows.length || roleResult.rows[0].nombre === 'owner') {
      return res.status(400).json({
        success: false,
        message: 'The requested role is not valid for this operation.',
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
      message: 'Role updated successfully.',
      data: updatedMember.rows[0],
    })
  } finally {
    client.release()
  }
}

/**
 * PUT /api/companies/members/:userId/projects/:projectId
 * Assigns a project to a member and defines explicit permissions.
 */
export const upsertCompanyMemberProjectAccess = async (req, res) => {
  const { id_empresa } = req.empresa
  const { userId: id_usuario, projectId: id_proyecto } = req.params
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

    if (permissionRows.rows.length !== permisos.length) {
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
      message: 'Project access updated successfully.',
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
 * DELETE /api/companies/members/:userId/projects/:projectId
 * Fully revokes a member's access to a project.
 */
export const removeCompanyMemberProjectAccess = async (req, res) => {
  const { id_empresa } = req.empresa
  const { userId: id_usuario, projectId: id_proyecto } = req.params

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
        message: 'This user was not assigned to that project.',
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

/**
 * DELETE /api/companies/members/:userId
 * Removes a member from the current company.
 */
export const removeCompanyMember = async (req, res) => {
  const { id_empresa } = req.empresa
  const { userId: id_usuario } = req.params

  if (Number(id_usuario) === req.user.id_usuario) {
    return res.status(409).json({
      success: false,
      message: 'The owner cannot remove themselves.',
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
      return res.status(404).json({ success: false, message: 'Member not found in this company.' })
    }

    if (memberResult.rows[0].rol_empresa === 'owner') {
      await client.query('ROLLBACK')
      return res.status(409).json({
        success: false,
        message: 'You cannot remove the company owner.',
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
        message: 'You cannot remove this user because they are still responsible for one or more projects.',
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
      message: 'The member was removed from the company.',
    })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
