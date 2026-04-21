import pool from '../db/pool.js'
import { EMPRESA_MANAGEMENT_ROLES } from '../services/projectAccessService.js'

const ENTRY_SELECT = `
  ppe.id_progress_entry AS id,
  ppe.id_proyecto AS project_id,
  ppe.id_usuario AS author_id,
  ppe.title,
  ppe.details,
  ppe.update_type AS update_type,
  ppe.progress_percentage AS progress_percentage,
  ppe.happened_at AS happened_at,
  ppe.created_at AS created_at,
  ppe.updated_at AS updated_at,
  u.nombre AS author_first_name,
  u.apellido AS author_last_name,
  u.email AS author_email
`

const mapProgressEntry = (row) => ({
  id: row.id,
  projectId: row.project_id,
  authorId: row.author_id,
  title: row.title,
  details: row.details ?? '',
  updateType: row.update_type,
  progressPercentage: Number(row.progress_percentage),
  happenedAt: row.happened_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  author: {
    id: row.author_id,
    firstName: row.author_first_name,
    lastName: row.author_last_name,
    email: row.author_email,
  },
})

const canManageProjectProgress = (req) => {
  const companyRole = req.company?.rol_empresa ?? req.empresa?.rol_empresa
  if (EMPRESA_MANAGEMENT_ROLES.includes(companyRole)) {
    return true
  }

  const permissions = req.project?.permisos ?? req.proyecto?.permisos ?? []
  return permissions.includes('editar_proyecto') || permissions.includes('gestionar_tareas')
}

const getProjectScope = async ({ projectId, companyId }) => {
  const result = await pool.query(
    `SELECT id_proyecto, nombre, estado, fecha_inicio, fecha_fin_planificada
     FROM public.proyecto
     WHERE id_proyecto = $1 AND id_empresa = $2
     LIMIT 1`,
    [projectId, companyId]
  )

  return result.rows[0] ?? null
}

const getTaskCompletionSummary = async (projectId) => {
  const result = await pool.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE estado = 'COMPLETADA')::int AS completed
     FROM public.tarea
     WHERE id_proyecto = $1`,
    [projectId]
  )

  const total = result.rows[0]?.total ?? 0
  const completed = result.rows[0]?.completed ?? 0
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  return { total, completed, percentage }
}

const getProgressEntries = async (projectId) => {
  const result = await pool.query(
    `SELECT ${ENTRY_SELECT}
     FROM public.project_progress_entry ppe
     JOIN public.usuario u ON u.id_usuario = ppe.id_usuario
     WHERE ppe.id_proyecto = $1
     ORDER BY ppe.happened_at DESC, ppe.id_progress_entry DESC`,
    [projectId]
  )

  return result.rows.map(mapProgressEntry)
}

const getProgressSummary = async (projectId) => {
  const [entriesResult, taskSummary] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*)::int AS entries_count,
         COUNT(*) FILTER (WHERE update_type = 'MILESTONE')::int AS milestones_count,
         COUNT(*) FILTER (WHERE update_type = 'BLOCKER')::int AS blockers_count,
         MAX(happened_at) AS last_update_at
       FROM public.project_progress_entry
       WHERE id_proyecto = $1`,
      [projectId]
    ),
    getTaskCompletionSummary(projectId),
  ])

  const summaryRow = entriesResult.rows[0]
  const latestProgressResult = await pool.query(
    `SELECT progress_percentage
     FROM public.project_progress_entry
     WHERE id_proyecto = $1
     ORDER BY happened_at DESC, id_progress_entry DESC
     LIMIT 1`,
    [projectId]
  )

  const latestProgress = latestProgressResult.rows[0]
  const currentProgressPercentage = latestProgress
    ? Number(latestProgress.progress_percentage)
    : taskSummary.percentage

  return {
    currentProgressPercentage,
    derivedFrom: latestProgress ? 'progress_entry' : 'tasks',
    entriesCount: summaryRow?.entries_count ?? 0,
    milestonesCount: summaryRow?.milestones_count ?? 0,
    blockersCount: summaryRow?.blockers_count ?? 0,
    lastUpdateAt: summaryRow?.last_update_at ?? null,
    taskCompletion: taskSummary,
  }
}

const getProgressEntryById = async ({ projectId, entryId, companyId }) => {
  const result = await pool.query(
    `SELECT ${ENTRY_SELECT}
     FROM public.project_progress_entry ppe
     JOIN public.proyecto p ON p.id_proyecto = ppe.id_proyecto
     JOIN public.usuario u ON u.id_usuario = ppe.id_usuario
     WHERE ppe.id_progress_entry = $1
       AND ppe.id_proyecto = $2
       AND p.id_empresa = $3
     LIMIT 1`,
    [entryId, projectId, companyId]
  )

  return result.rows[0] ?? null
}

export const getProjectProgress = async (req, res) => {
  const projectId = Number(req.params.id)
  const companyId = req.company?.id_empresa ?? req.empresa?.id_empresa

  const project = await getProjectScope({ projectId, companyId })
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found.' })
  }

  const [entries, summary] = await Promise.all([
    getProgressEntries(projectId),
    getProgressSummary(projectId),
  ])

  return res.json({
    success: true,
    data: {
      project: {
        id: project.id_proyecto,
        name: project.nombre,
        status: project.estado,
        startDate: project.fecha_inicio,
        plannedEndDate: project.fecha_fin_planificada,
      },
      summary,
      entries,
      canManageProgress: canManageProjectProgress(req),
    },
  })
}

export const createProjectProgressEntry = async (req, res) => {
  if (!canManageProjectProgress(req)) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to register project progress updates.',
    })
  }

  const projectId = Number(req.params.id)
  const companyId = req.company?.id_empresa ?? req.empresa?.id_empresa
  const project = await getProjectScope({ projectId, companyId })

  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found.' })
  }

  const { title, details, updateType, progressPercentage, happenedAt } = req.body

  const result = await pool.query(
    `INSERT INTO public.project_progress_entry
       (id_proyecto, id_usuario, title, details, update_type, progress_percentage, happened_at)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::timestamp, CURRENT_TIMESTAMP))
     RETURNING id_progress_entry`,
    [
      projectId,
      req.user.id_usuario,
      title,
      details ?? null,
      updateType,
      progressPercentage,
      happenedAt ?? null,
    ]
  )

  const createdEntry = await getProgressEntryById({
    projectId,
    entryId: result.rows[0].id_progress_entry,
    companyId,
  })

  return res.status(201).json({
    success: true,
    message: 'Project progress update saved successfully.',
    data: mapProgressEntry(createdEntry),
  })
}

export const updateProjectProgressEntry = async (req, res) => {
  if (!canManageProjectProgress(req)) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to edit project progress updates.',
    })
  }

  const projectId = Number(req.params.id)
  const entryId = Number(req.params.entryId)
  const companyId = req.company?.id_empresa ?? req.empresa?.id_empresa

  const existingEntry = await getProgressEntryById({ projectId, entryId, companyId })
  if (!existingEntry) {
    return res.status(404).json({ success: false, message: 'Progress entry not found.' })
  }

  const setClauses = []
  const values = []

  if (req.body.title !== undefined) {
    values.push(req.body.title)
    setClauses.push(`title = $${values.length}`)
  }
  if (req.body.details !== undefined) {
    values.push(req.body.details)
    setClauses.push(`details = $${values.length}`)
  }
  if (req.body.updateType !== undefined) {
    values.push(req.body.updateType)
    setClauses.push(`update_type = $${values.length}`)
  }
  if (req.body.progressPercentage !== undefined) {
    values.push(req.body.progressPercentage)
    setClauses.push(`progress_percentage = $${values.length}`)
  }
  if (req.body.happenedAt !== undefined) {
    values.push(req.body.happenedAt)
    setClauses.push(`happened_at = COALESCE($${values.length}::timestamp, happened_at)`)
  }

  setClauses.push('updated_at = CURRENT_TIMESTAMP')
  values.push(entryId, projectId)

  await pool.query(
    `UPDATE public.project_progress_entry
     SET ${setClauses.join(', ')}
     WHERE id_progress_entry = $${values.length - 1} AND id_proyecto = $${values.length}`,
    values
  )

  const updatedEntry = await getProgressEntryById({ projectId, entryId, companyId })

  return res.json({
    success: true,
    message: 'Project progress update edited successfully.',
    data: mapProgressEntry(updatedEntry),
  })
}

export const deleteProjectProgressEntry = async (req, res) => {
  if (!canManageProjectProgress(req)) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to delete project progress updates.',
    })
  }

  const projectId = Number(req.params.id)
  const entryId = Number(req.params.entryId)
  const companyId = req.company?.id_empresa ?? req.empresa?.id_empresa

  const existingEntry = await getProgressEntryById({ projectId, entryId, companyId })
  if (!existingEntry) {
    return res.status(404).json({ success: false, message: 'Progress entry not found.' })
  }

  await pool.query(
    `DELETE FROM public.project_progress_entry
     WHERE id_progress_entry = $1 AND id_proyecto = $2`,
    [entryId, projectId]
  )

  return res.json({
    success: true,
    message: 'Project progress update deleted successfully.',
  })
}
