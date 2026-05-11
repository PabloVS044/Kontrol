import pool from '../db/pool.js'

const normalizeTeam = (row) => ({
  id_equipo: row.id_equipo,
  nombre: row.nombre,
  descripcion: row.descripcion,
  id_empresa: row.id_empresa,
  id_lider: row.id_lider,
  activo: row.activo,
  creado_en: row.creado_en,
  lider: row.lider_id
    ? {
        id_usuario: row.lider_id,
        nombre: row.lider_nombre,
        apellido: row.lider_apellido,
        email: row.lider_email,
      }
    : null,
  miembros: row.miembros ?? [],
  proyectos: row.proyectos ?? [],
})

const getCompanyId = (req) => req.company?.id_empresa ?? req.empresa?.id_empresa

async function rollbackQuietly(client) {
  try {
    await client.query('ROLLBACK')
  } catch {
    // The original error is more useful than a rollback failure.
  }
}

async function assertTeamInCompany(client, { id_equipo, id_empresa }) {
  const result = await client.query(
    `SELECT id_equipo, id_lider
     FROM public.equipo
     WHERE id_equipo = $1 AND id_empresa = $2 AND activo = true`,
    [id_equipo, id_empresa]
  )

  if (!result.rows.length) {
    const error = new Error('Team not found in this company.')
    error.status = 404
    throw error
  }

  return result.rows[0]
}

async function assertUserInCompany(client, { id_usuario, id_empresa }) {
  const result = await client.query(
    `SELECT u.id_usuario
     FROM public.empresa_usuario eu
     JOIN public.usuario u ON u.id_usuario = eu.id_usuario
     WHERE eu.id_empresa = $1 AND eu.id_usuario = $2`,
    [id_empresa, id_usuario]
  )

  if (!result.rows.length) {
    const error = new Error('User does not belong to this company.')
    error.status = 400
    throw error
  }
}

async function assertProjectInCompany(client, { id_proyecto, id_empresa }) {
  const result = await client.query(
    `SELECT id_proyecto
     FROM public.proyecto
     WHERE id_proyecto = $1 AND id_empresa = $2`,
    [id_proyecto, id_empresa]
  )

  if (!result.rows.length) {
    const error = new Error('Project does not belong to this company.')
    error.status = 400
    throw error
  }
}

export const getTeamsContext = async (req, res) => {
  const id_empresa = getCompanyId(req)

  const [membersResult, projectsResult] = await Promise.all([
    pool.query(
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
       ORDER BY LOWER(u.nombre), LOWER(u.apellido), u.id_usuario`,
      [id_empresa]
    ),
    pool.query(
      `SELECT p.id_proyecto, p.nombre, p.estado, p.id_equipo
       FROM public.proyecto p
       WHERE p.id_empresa = $1
       ORDER BY LOWER(p.nombre), p.id_proyecto`,
      [id_empresa]
    ),
  ])

  return res.json({
    success: true,
    data: {
      members: membersResult.rows,
      projects: projectsResult.rows,
    },
  })
}

export const listTeams = async (req, res) => {
  const id_empresa = getCompanyId(req)

  const result = await pool.query(
    `SELECT
       e.*,
       lider.id_usuario AS lider_id,
       lider.nombre AS lider_nombre,
       lider.apellido AS lider_apellido,
       lider.email AS lider_email,
       COALESCE(
         json_agg(DISTINCT jsonb_build_object(
           'id_usuario', u.id_usuario,
           'nombre', u.nombre,
           'apellido', u.apellido,
           'email', u.email
         )) FILTER (WHERE u.id_usuario IS NOT NULL),
         '[]'
       ) AS miembros,
       COALESCE(
         json_agg(DISTINCT jsonb_build_object(
           'id_proyecto', p.id_proyecto,
           'nombre', p.nombre,
           'estado', p.estado
         )) FILTER (WHERE p.id_proyecto IS NOT NULL),
         '[]'
       ) AS proyectos
     FROM public.equipo e
     JOIN public.usuario lider ON lider.id_usuario = e.id_lider
     LEFT JOIN public.equipo_usuario eu ON eu.id_equipo = e.id_equipo
     LEFT JOIN public.usuario u ON u.id_usuario = eu.id_usuario
     LEFT JOIN public.proyecto p ON p.id_equipo = e.id_equipo
     WHERE e.id_empresa = $1 AND e.activo = true
     GROUP BY e.id_equipo, lider.id_usuario
     ORDER BY LOWER(e.nombre), e.id_equipo`,
    [id_empresa]
  )

  return res.json({ success: true, data: result.rows.map(normalizeTeam) })
}

export const createTeam = async (req, res) => {
  const client = await pool.connect()
  try {
    const { nombre, descripcion, id_lider } = req.body
    const id_empresa = getCompanyId(req)

    await client.query('BEGIN')
    await assertUserInCompany(client, { id_usuario: id_lider, id_empresa })

    const teamRes = await client.query(
      `INSERT INTO public.equipo (nombre, descripcion, id_empresa, id_lider)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [nombre, descripcion ?? null, id_empresa, id_lider]
    )
    const newTeam = teamRes.rows[0]

    await client.query(
      `INSERT INTO public.equipo_usuario (id_equipo, id_usuario)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [newTeam.id_equipo, id_lider]
    )

    await client.query('COMMIT')
    return res.status(201).json({ success: true, data: newTeam })
  } catch (error) {
    await rollbackQuietly(client)
    console.error('[teams:createTeam]', error)
    return res.status(error.status ?? 400).json({ success: false, message: error.message })
  } finally {
    client.release()
  }
}

export const updateTeam = async (req, res) => {
  const client = await pool.connect()
  try {
    const { nombre, descripcion, id_lider } = req.body
    const id_empresa = getCompanyId(req)
    const id_equipo = Number(req.params.teamId)

    await client.query('BEGIN')
    await assertTeamInCompany(client, { id_equipo, id_empresa })
    await assertUserInCompany(client, { id_usuario: id_lider, id_empresa })

    const result = await client.query(
      `UPDATE public.equipo
       SET nombre = $1, descripcion = $2, id_lider = $3
       WHERE id_equipo = $4 AND id_empresa = $5
       RETURNING *`,
      [nombre, descripcion ?? null, id_lider, id_equipo, id_empresa]
    )

    await client.query(
      `INSERT INTO public.equipo_usuario (id_equipo, id_usuario)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [id_equipo, id_lider]
    )

    await client.query('COMMIT')
    return res.json({ success: true, data: result.rows[0] })
  } catch (error) {
    await rollbackQuietly(client)
    console.error('[teams:updateTeam]', error)
    return res.status(error.status ?? 400).json({ success: false, message: error.message })
  } finally {
    client.release()
  }
}

export const deleteTeam = async (req, res) => {
  const client = await pool.connect()
  try {
    const id_empresa = getCompanyId(req)
    const id_equipo = Number(req.params.teamId)

    await client.query('BEGIN')
    await assertTeamInCompany(client, { id_equipo, id_empresa })

    await client.query(
      `UPDATE public.proyecto
       SET id_equipo = NULL
       WHERE id_empresa = $1 AND id_equipo = $2`,
      [id_empresa, id_equipo]
    )
    await client.query(
      `UPDATE public.equipo
       SET activo = false
       WHERE id_empresa = $1 AND id_equipo = $2`,
      [id_empresa, id_equipo]
    )

    await client.query('COMMIT')
    return res.json({ success: true })
  } catch (error) {
    await rollbackQuietly(client)
    console.error('[teams:deleteTeam]', error)
    return res.status(error.status ?? 400).json({ success: false, message: error.message })
  } finally {
    client.release()
  }
}

export const addTeamMember = async (req, res) => {
  const client = await pool.connect()
  try {
    const id_empresa = getCompanyId(req)
    const id_equipo = Number(req.params.teamId)
    const id_usuario = Number(req.params.userId)

    await client.query('BEGIN')
    await assertTeamInCompany(client, { id_equipo, id_empresa })
    await assertUserInCompany(client, { id_usuario, id_empresa })
    await client.query(
      `INSERT INTO public.equipo_usuario (id_equipo, id_usuario)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [id_equipo, id_usuario]
    )
    await client.query('COMMIT')

    return res.status(201).json({ success: true })
  } catch (error) {
    await rollbackQuietly(client)
    console.error('[teams:addTeamMember]', error)
    return res.status(error.status ?? 400).json({ success: false, message: error.message })
  } finally {
    client.release()
  }
}

export const removeTeamMember = async (req, res) => {
  const client = await pool.connect()
  try {
    const id_empresa = getCompanyId(req)
    const id_equipo = Number(req.params.teamId)
    const id_usuario = Number(req.params.userId)

    await client.query('BEGIN')
    const team = await assertTeamInCompany(client, { id_equipo, id_empresa })
    if (team.id_lider === id_usuario) {
      const error = new Error('Change the team leader before removing this member.')
      error.status = 400
      throw error
    }

    await client.query(
      `DELETE FROM public.equipo_usuario
       WHERE id_equipo = $1 AND id_usuario = $2`,
      [id_equipo, id_usuario]
    )
    await client.query('COMMIT')

    return res.json({ success: true })
  } catch (error) {
    await rollbackQuietly(client)
    console.error('[teams:removeTeamMember]', error)
    return res.status(error.status ?? 400).json({ success: false, message: error.message })
  } finally {
    client.release()
  }
}

export const assignTeamProject = async (req, res) => {
  const client = await pool.connect()
  try {
    const id_empresa = getCompanyId(req)
    const id_equipo = Number(req.params.teamId)
    const id_proyecto = Number(req.params.projectId)

    await client.query('BEGIN')
    await assertTeamInCompany(client, { id_equipo, id_empresa })
    await assertProjectInCompany(client, { id_proyecto, id_empresa })
    await client.query(
      `UPDATE public.proyecto
       SET id_equipo = $1
       WHERE id_empresa = $2 AND id_proyecto = $3`,
      [id_equipo, id_empresa, id_proyecto]
    )
    await client.query('COMMIT')

    return res.json({ success: true })
  } catch (error) {
    await rollbackQuietly(client)
    console.error('[teams:assignTeamProject]', error)
    return res.status(error.status ?? 400).json({ success: false, message: error.message })
  } finally {
    client.release()
  }
}

export const removeTeamProject = async (req, res) => {
  const id_empresa = getCompanyId(req)
  const id_equipo = Number(req.params.teamId)
  const id_proyecto = Number(req.params.projectId)

  await pool.query(
    `UPDATE public.proyecto
     SET id_equipo = NULL
     WHERE id_empresa = $1 AND id_equipo = $2 AND id_proyecto = $3`,
    [id_empresa, id_equipo, id_proyecto]
  )

  return res.json({ success: true })
}
