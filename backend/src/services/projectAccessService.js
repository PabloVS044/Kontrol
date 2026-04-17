export const EMPRESA_MANAGEMENT_ROLES = ['owner', 'admin', 'manager']
export const INVENTORY_VIEW_PERMISSION_NAMES = ['ver_inventario', 'gestionar_inventario']
export const INVENTORY_WRITE_PERMISSION_NAMES = ['gestionar_inventario']
export const DEFAULT_PROJECT_PERMISSION_NAMES = [
  'ver_inventario',
  'gestionar_inventario',
  'editar_proyecto',
  'gestionar_tareas',
  'asignar_usuarios',
  'gestionar_presupuesto',
  'crear_reportes',
]

export const hasEmpresaManagementAccess = (rol_empresa) =>
  EMPRESA_MANAGEMENT_ROLES.includes(rol_empresa)

const PROJECT_ASSIGNMENTS_SELECT = `
  SELECT
    pu.id_usuario,
    pu.id_proyecto,
    p.nombre AS proyecto_nombre,
    p.estado AS proyecto_estado,
    p.id_encargado,
    rp.nombre AS rol_proyecto,
    COALESCE(
      array_agg(DISTINCT perms.nombre_permiso) FILTER (WHERE perms.nombre_permiso IS NOT NULL),
      '{}'::varchar[]
    ) AS permisos
  FROM public.proyecto_usuario pu
  JOIN public.proyecto p ON p.id_proyecto = pu.id_proyecto
  LEFT JOIN public.rol_proyecto rp ON rp.id_rol_proyecto = pu.id_rol_proyecto
  LEFT JOIN (
    SELECT pup.id_proyecto, pup.id_usuario, pp.nombre_permiso
    FROM public.proyecto_usuario_permiso pup
    JOIN public.permiso_proyecto pp ON pp.id_permiso_proyecto = pup.id_permiso_proyecto

    UNION

    SELECT pu2.id_proyecto, pu2.id_usuario, pp.nombre_permiso
    FROM public.proyecto_usuario pu2
    JOIN public.rol_proyecto_permiso rpp ON rpp.id_rol_proyecto = pu2.id_rol_proyecto
    JOIN public.permiso_proyecto pp ON pp.id_permiso_proyecto = rpp.id_permiso_proyecto
  ) perms ON perms.id_proyecto = pu.id_proyecto AND perms.id_usuario = pu.id_usuario
  WHERE p.id_empresa = $1
    AND ($2::int IS NULL OR pu.id_usuario = $2)
  GROUP BY pu.id_usuario, pu.id_proyecto, p.nombre, p.estado, p.id_encargado, rp.nombre
  ORDER BY LOWER(p.nombre), pu.id_proyecto
`

const normalizeAssignmentRow = (row) => ({
  id_usuario: row.id_usuario,
  id_proyecto: row.id_proyecto,
  proyecto_nombre: row.proyecto_nombre,
  proyecto_estado: row.proyecto_estado,
  id_encargado: row.id_encargado,
  rol_proyecto: row.rol_proyecto,
  permisos: Array.isArray(row.permisos) ? row.permisos.filter(Boolean) : [],
})

export const getCompanyProjects = async (client, { id_empresa }) => {
  const result = await client.query(
    `SELECT id_proyecto, nombre, estado, id_encargado
     FROM public.proyecto
     WHERE id_empresa = $1
     ORDER BY LOWER(nombre), id_proyecto`,
    [id_empresa]
  )

  return result.rows
}

export const getUserProjectAssignments = async (client, { id_empresa, id_usuario }) => {
  const result = await client.query(PROJECT_ASSIGNMENTS_SELECT, [id_empresa, id_usuario])
  return result.rows.map(normalizeAssignmentRow)
}

export const getCompanyProjectAssignments = async (client, { id_empresa }) => {
  const result = await client.query(PROJECT_ASSIGNMENTS_SELECT, [id_empresa, null])
  return result.rows.map(normalizeAssignmentRow)
}

export const getProjectPermissionsCatalog = async (client) => {
  const result = await client.query(
    `SELECT nombre_permiso, descripcion
     FROM public.permiso_proyecto
     ORDER BY
       CASE nombre_permiso
         WHEN 'ver_inventario' THEN 0
         WHEN 'gestionar_inventario' THEN 1
         WHEN 'editar_proyecto' THEN 2
         WHEN 'gestionar_tareas' THEN 3
         WHEN 'asignar_usuarios' THEN 4
         WHEN 'gestionar_presupuesto' THEN 5
         WHEN 'crear_reportes' THEN 6
         ELSE 100
       END,
       nombre_permiso`
  )

  return result.rows
}

export const getAccessibleProjectAssignments = async ({
  client,
  id_empresa,
  id_usuario,
  rol_empresa,
  requiredPermissions = [],
}) => {
  if (hasEmpresaManagementAccess(rol_empresa)) {
    const projects = await getCompanyProjects(client, { id_empresa })
    return projects.map((project) => ({
      id_usuario,
      id_proyecto: project.id_proyecto,
      proyecto_nombre: project.nombre,
      proyecto_estado: project.estado,
      id_encargado: project.id_encargado,
      rol_proyecto: 'management',
      permisos: [...DEFAULT_PROJECT_PERMISSION_NAMES],
    }))
  }

  const assignments = await getUserProjectAssignments(client, { id_empresa, id_usuario })
  if (!requiredPermissions.length) return assignments

  return assignments.filter((assignment) =>
    requiredPermissions.some((permission) => assignment.permisos.includes(permission))
  )
}

export const getAccessibleProjectIds = async (options) => {
  const assignments = await getAccessibleProjectAssignments(options)
  return assignments.map(({ id_proyecto }) => id_proyecto)
}

export const ensureProjectAccess = async ({
  client,
  id_empresa,
  id_usuario,
  rol_empresa,
  id_proyecto,
  requiredPermissions = [],
}) => {
  const projectId = Number(id_proyecto)

  if (hasEmpresaManagementAccess(rol_empresa)) {
    const result = await client.query(
      `SELECT id_proyecto, nombre, estado, id_encargado
       FROM public.proyecto
       WHERE id_empresa = $1 AND id_proyecto = $2
       LIMIT 1`,
      [id_empresa, projectId]
    )

    if (!result.rows.length) {
      return { allowed: false, reason: 'project_not_found' }
    }

    return {
      allowed: true,
      project: result.rows[0],
      permissions: [...DEFAULT_PROJECT_PERMISSION_NAMES],
      assignment: null,
    }
  }

  const assignments = await getUserProjectAssignments(client, { id_empresa, id_usuario })
  const assignment = assignments.find(({ id_proyecto: assignedProjectId }) => assignedProjectId === projectId)

  if (!assignment) {
    return { allowed: false, reason: 'project_unassigned' }
  }

  if (requiredPermissions.length) {
    const hasPermission = requiredPermissions.some((permission) =>
      assignment.permisos.includes(permission)
    )

    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'missing_permissions',
        assignment,
        permissions: assignment.permisos,
      }
    }
  }

  return {
    allowed: true,
    project: {
      id_proyecto: assignment.id_proyecto,
      nombre: assignment.proyecto_nombre,
      estado: assignment.proyecto_estado,
      id_encargado: assignment.id_encargado,
    },
    assignment,
    permissions: assignment.permisos,
  }
}

export const buildEmpresaAccessContext = async ({
  client,
  id_empresa,
  id_usuario,
  rol_empresa,
}) => {
  const managementAccess = hasEmpresaManagementAccess(rol_empresa)

  if (managementAccess) {
    const projects = await getCompanyProjects(client, { id_empresa })
    const projectIds = projects.map(({ id_proyecto }) => id_proyecto)

    return {
      rol_empresa,
      assigned_projects_count: projects.length,
      project_ids: projectIds,
      inventory_project_ids: projectIds,
      capabilities: {
        can_manage_users: rol_empresa === 'owner',
        can_view_projects: true,
        can_create_projects: true,
        can_view_inventory: true,
        can_manage_inventory: true,
      },
    }
  }

  const assignments = await getUserProjectAssignments(client, { id_empresa, id_usuario })
  const inventoryProjectIds = assignments
    .filter(({ permisos }) =>
      INVENTORY_VIEW_PERMISSION_NAMES.some((permission) => permisos.includes(permission))
    )
    .map(({ id_proyecto }) => id_proyecto)

  return {
    rol_empresa,
    assigned_projects_count: assignments.length,
    project_ids: assignments.map(({ id_proyecto }) => id_proyecto),
    inventory_project_ids: inventoryProjectIds,
    capabilities: {
      can_manage_users: false,
      can_view_projects: assignments.length > 0,
      can_create_projects: false,
      can_view_inventory: inventoryProjectIds.length > 0,
      can_manage_inventory: assignments.some(({ permisos }) =>
        INVENTORY_WRITE_PERMISSION_NAMES.some((permission) => permisos.includes(permission))
      ),
    },
  }
}
