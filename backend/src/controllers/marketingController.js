import pool from '../db/pool.js'
import { EMPRESA_MANAGEMENT_ROLES } from '../services/projectAccessService.js'
import { buildMarketingDrafts } from '../services/marketingGenerationService.js'

const MARKETING_CAMPAIGN_SELECT = `
  mc.id_campaign,
  mc.name,
  mc.description,
  mc.objective,
  mc.channel,
  mc.status,
  mc.id_proyecto,
  mc.start_date,
  mc.end_date,
  mc.created_at,
  mc.updated_at,
  p.nombre AS project_name,
  COUNT(mi.id_marketing_item)::int AS items_count
`

const MARKETING_ITEM_SELECT = `
  mi.id_marketing_item,
  mi.title,
  mi.description,
  mi.content,
  mi.status,
  mi.content_type,
  mi.marketing_date,
  mi.resource_link,
  mi.origin_type,
  mi.integration_provider,
  mi.integration_reference,
  mi.integration_metadata,
  mi.id_campaign,
  mi.id_proyecto,
  mi.created_at,
  mi.updated_at,
  mc.name AS campaign_name,
  p.nombre AS project_name,
  TRIM(CONCAT(creator.nombre, ' ', creator.apellido)) AS created_by_name,
  TRIM(CONCAT(updater.nombre, ' ', updater.apellido)) AS updated_by_name
`

const getCompanyId = (req) => req.company?.id_empresa ?? req.empresa?.id_empresa
const getCompanyRole = (req) => req.company?.rol_empresa ?? req.empresa?.rol_empresa

const canManageMarketing = (req) => EMPRESA_MANAGEMENT_ROLES.includes(getCompanyRole(req))

const normalizeText = (value) => {
  if (value === undefined) return undefined
  if (value === null) return null
  const normalized = String(value).trim()
  return normalized.length ? normalized : null
}

const mapCampaign = (row) => ({
  id: row.id_campaign,
  name: row.name,
  description: row.description ?? '',
  objective: row.objective ?? '',
  channel: row.channel ?? '',
  status: row.status,
  projectId: row.id_proyecto,
  projectName: row.project_name ?? null,
  startDate: row.start_date,
  endDate: row.end_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  itemsCount: Number(row.items_count ?? 0),
})

const mapItem = (row) => ({
  id: row.id_marketing_item,
  title: row.title,
  description: row.description ?? '',
  content: row.content,
  status: row.status,
  contentType: row.content_type,
  marketingDate: row.marketing_date,
  resourceLink: row.resource_link ?? '',
  originType: row.origin_type,
  integrationProvider: row.integration_provider ?? '',
  integrationReference: row.integration_reference ?? '',
  integrationMetadata: row.integration_metadata ?? {},
  campaignId: row.id_campaign,
  campaignName: row.campaign_name ?? null,
  projectId: row.id_proyecto,
  projectName: row.project_name ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  createdByName: row.created_by_name || 'Unknown',
  updatedByName: row.updated_by_name || 'Unknown',
})

const getProjectInCompany = async (companyId, projectId) => {
  if (!projectId) return null

  const result = await pool.query(
    `SELECT id_proyecto, nombre
     FROM public.proyecto
     WHERE id_empresa = $1 AND id_proyecto = $2
     LIMIT 1`,
    [companyId, projectId]
  )

  return result.rows[0] ?? null
}

const getCampaignInCompany = async (companyId, campaignId) => {
  if (!campaignId) return null

  const result = await pool.query(
    `SELECT id_campaign, name, id_proyecto
     FROM public.marketing_campaign
     WHERE id_empresa = $1 AND id_campaign = $2
     LIMIT 1`,
    [companyId, campaignId]
  )

  return result.rows[0] ?? null
}

const fetchCampaignById = async (companyId, campaignId) => {
  const result = await pool.query(
    `SELECT ${MARKETING_CAMPAIGN_SELECT}
     FROM public.marketing_campaign mc
     LEFT JOIN public.proyecto p ON p.id_proyecto = mc.id_proyecto
     LEFT JOIN public.marketing_item mi ON mi.id_campaign = mc.id_campaign
     WHERE mc.id_empresa = $1 AND mc.id_campaign = $2
     GROUP BY mc.id_campaign, p.nombre`,
    [companyId, campaignId]
  )

  return result.rows[0] ?? null
}

const fetchItemById = async (companyId, itemId) => {
  const result = await pool.query(
    `SELECT ${MARKETING_ITEM_SELECT}
     FROM public.marketing_item mi
     LEFT JOIN public.marketing_campaign mc ON mc.id_campaign = mi.id_campaign
     LEFT JOIN public.proyecto p ON p.id_proyecto = mi.id_proyecto
     JOIN public.usuario creator ON creator.id_usuario = mi.created_by
     JOIN public.usuario updater ON updater.id_usuario = mi.updated_by
     WHERE mi.id_empresa = $1 AND mi.id_marketing_item = $2
     LIMIT 1`,
    [companyId, itemId]
  )

  return result.rows[0] ?? null
}

const resolveCampaignAndProject = async ({
  companyId,
  campaignId,
  projectId,
}) => {
  const campaign = campaignId ? await getCampaignInCompany(companyId, campaignId) : null
  if (campaignId && !campaign) {
    return { error: { status: 404, message: 'Campaign not found.' } }
  }

  let finalProjectId = projectId ?? null

  if (finalProjectId) {
    const project = await getProjectInCompany(companyId, finalProjectId)
    if (!project) {
      return { error: { status: 404, message: 'Project not found.' } }
    }
  }

  if (campaign?.id_proyecto) {
    if (!finalProjectId) {
      finalProjectId = campaign.id_proyecto
    } else if (Number(finalProjectId) !== Number(campaign.id_proyecto)) {
      return {
        error: {
          status: 400,
          message: 'Selected campaign is linked to a different project.',
        },
      }
    }
  }

  return {
    campaign,
    projectId: finalProjectId,
  }
}

export const getMarketingCampaigns = async (req, res) => {
  const companyId = getCompanyId(req)
  const values = [companyId]
  const filters = ['mc.id_empresa = $1']

  if (req.query.status) {
    values.push(req.query.status)
    filters.push(`mc.status = $${values.length}`)
  }

  const result = await pool.query(
    `SELECT ${MARKETING_CAMPAIGN_SELECT}
     FROM public.marketing_campaign mc
     LEFT JOIN public.proyecto p ON p.id_proyecto = mc.id_proyecto
     LEFT JOIN public.marketing_item mi ON mi.id_campaign = mc.id_campaign
     WHERE ${filters.join(' AND ')}
     GROUP BY mc.id_campaign, p.nombre
     ORDER BY LOWER(mc.name), mc.id_campaign`,
    values
  )

  return res.json({
    success: true,
    data: result.rows.map(mapCampaign),
    capabilities: {
      canManageMarketing: canManageMarketing(req),
    },
  })
}

export const createMarketingCampaign = async (req, res) => {
  const companyId = getCompanyId(req)
  const {
    name,
    description,
    objective,
    channel,
    status,
    projectId,
    startDate,
    endDate,
  } = req.body

  if (projectId) {
    const project = await getProjectInCompany(companyId, projectId)
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' })
    }
  }

  const result = await pool.query(
    `INSERT INTO public.marketing_campaign
       (id_empresa, id_proyecto, name, description, objective, channel, status, start_date, end_date, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
     RETURNING id_campaign`,
    [
      companyId,
      projectId ?? null,
      name.trim(),
      normalizeText(description) ?? null,
      normalizeText(objective) ?? null,
      normalizeText(channel) ?? null,
      status ?? 'DRAFT',
      startDate ?? null,
      endDate ?? null,
      req.user.id_usuario,
    ]
  )

  const campaign = await fetchCampaignById(companyId, result.rows[0].id_campaign)

  return res.status(201).json({
    success: true,
    data: mapCampaign(campaign),
  })
}

export const updateMarketingCampaign = async (req, res) => {
  const companyId = getCompanyId(req)
  const { campaignId } = req.params

  const existing = await getCampaignInCompany(companyId, campaignId)
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Campaign not found.' })
  }

  if (req.body.projectId) {
    const project = await getProjectInCompany(companyId, req.body.projectId)
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' })
    }
  }

  const setClauses = []
  const values = []

  if (req.body.name !== undefined) {
    values.push(req.body.name.trim())
    setClauses.push(`name = $${values.length}`)
  }
  if (req.body.description !== undefined) {
    values.push(normalizeText(req.body.description))
    setClauses.push(`description = $${values.length}`)
  }
  if (req.body.objective !== undefined) {
    values.push(normalizeText(req.body.objective))
    setClauses.push(`objective = $${values.length}`)
  }
  if (req.body.channel !== undefined) {
    values.push(normalizeText(req.body.channel))
    setClauses.push(`channel = $${values.length}`)
  }
  if (req.body.status !== undefined) {
    values.push(req.body.status)
    setClauses.push(`status = $${values.length}`)
  }
  if (req.body.projectId !== undefined) {
    values.push(req.body.projectId ?? null)
    setClauses.push(`id_proyecto = $${values.length}`)
  }
  if (req.body.startDate !== undefined) {
    values.push(req.body.startDate ?? null)
    setClauses.push(`start_date = $${values.length}`)
  }
  if (req.body.endDate !== undefined) {
    values.push(req.body.endDate ?? null)
    setClauses.push(`end_date = $${values.length}`)
  }

  values.push(req.user.id_usuario)
  setClauses.push(`updated_by = $${values.length}`)
  setClauses.push('updated_at = CURRENT_TIMESTAMP')

  values.push(companyId, campaignId)
  await pool.query(
    `UPDATE public.marketing_campaign
     SET ${setClauses.join(', ')}
     WHERE id_empresa = $${values.length - 1} AND id_campaign = $${values.length}`,
    values
  )

  const campaign = await fetchCampaignById(companyId, campaignId)

  return res.json({
    success: true,
    data: mapCampaign(campaign),
  })
}

export const deleteMarketingCampaign = async (req, res) => {
  const companyId = getCompanyId(req)
  const result = await pool.query(
    `DELETE FROM public.marketing_campaign
     WHERE id_empresa = $1 AND id_campaign = $2
     RETURNING id_campaign`,
    [companyId, req.params.campaignId]
  )

  if (!result.rows.length) {
    return res.status(404).json({ success: false, message: 'Campaign not found.' })
  }

  return res.json({
    success: true,
    message: 'Campaign deleted successfully.',
  })
}

export const getMarketingItems = async (req, res) => {
  const companyId = getCompanyId(req)
  const values = [companyId]
  const filters = ['mi.id_empresa = $1']

  if (req.query.status) {
    values.push(req.query.status)
    filters.push(`mi.status = $${values.length}`)
  }
  if (req.query.contentType) {
    values.push(req.query.contentType)
    filters.push(`mi.content_type = $${values.length}`)
  }
  if (req.query.campaignId) {
    values.push(req.query.campaignId)
    filters.push(`mi.id_campaign = $${values.length}`)
  }
  if (req.query.projectId) {
    values.push(req.query.projectId)
    filters.push(`mi.id_proyecto = $${values.length}`)
  }
  if (req.query.search) {
    values.push(`%${req.query.search.toLowerCase()}%`)
    filters.push(`(
      LOWER(mi.title) LIKE $${values.length}
      OR LOWER(COALESCE(mi.description, '')) LIKE $${values.length}
      OR LOWER(mi.content) LIKE $${values.length}
      OR LOWER(COALESCE(mc.name, '')) LIKE $${values.length}
      OR LOWER(COALESCE(p.nombre, '')) LIKE $${values.length}
    )`)
  }

  values.push(req.query.limit ?? 100)

  const result = await pool.query(
    `SELECT ${MARKETING_ITEM_SELECT}
     FROM public.marketing_item mi
     LEFT JOIN public.marketing_campaign mc ON mc.id_campaign = mi.id_campaign
     LEFT JOIN public.proyecto p ON p.id_proyecto = mi.id_proyecto
     JOIN public.usuario creator ON creator.id_usuario = mi.created_by
     JOIN public.usuario updater ON updater.id_usuario = mi.updated_by
     WHERE ${filters.join(' AND ')}
     ORDER BY mi.marketing_date DESC NULLS LAST, mi.updated_at DESC, mi.id_marketing_item DESC
     LIMIT $${values.length}`,
    values
  )

  return res.json({
    success: true,
    data: result.rows.map(mapItem),
    capabilities: {
      canManageMarketing: canManageMarketing(req),
    },
  })
}

export const createMarketingItem = async (req, res) => {
  const companyId = getCompanyId(req)
  const {
    title,
    description,
    content,
    status,
    contentType,
    marketingDate,
    campaignId,
    projectId,
    resourceLink,
    originType,
  } = req.body

  const association = await resolveCampaignAndProject({
    companyId,
    campaignId: campaignId ?? null,
    projectId: projectId ?? null,
  })

  if (association.error) {
    return res.status(association.error.status).json({ success: false, message: association.error.message })
  }

  const result = await pool.query(
    `INSERT INTO public.marketing_item
       (
         id_empresa,
         id_campaign,
         id_proyecto,
         title,
         description,
         content,
         status,
         content_type,
         marketing_date,
         resource_link,
         origin_type,
         created_by,
         updated_by
       )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9::date, CURRENT_DATE), $10, $11, $12, $12)
     RETURNING id_marketing_item`,
    [
      companyId,
      campaignId ?? null,
      association.projectId ?? null,
      title.trim(),
      normalizeText(description) ?? null,
      content.trim(),
      status ?? 'DRAFT',
      contentType,
      marketingDate ?? null,
      normalizeText(resourceLink) ?? null,
      originType ?? 'MANUAL',
      req.user.id_usuario,
    ]
  )

  const item = await fetchItemById(companyId, result.rows[0].id_marketing_item)

  return res.status(201).json({
    success: true,
    data: mapItem(item),
  })
}

export const updateMarketingItem = async (req, res) => {
  const companyId = getCompanyId(req)
  const { itemId } = req.params

  const existing = await fetchItemById(companyId, itemId)
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Marketing item not found.' })
  }

  const nextCampaignId = req.body.campaignId !== undefined ? req.body.campaignId : existing.id_campaign
  const nextProjectId = req.body.projectId !== undefined ? req.body.projectId : existing.id_proyecto
  const association = await resolveCampaignAndProject({
    companyId,
    campaignId: nextCampaignId ?? null,
    projectId: nextProjectId ?? null,
  })

  if (association.error) {
    return res.status(association.error.status).json({ success: false, message: association.error.message })
  }

  const setClauses = []
  const values = []

  if (req.body.title !== undefined) {
    values.push(req.body.title.trim())
    setClauses.push(`title = $${values.length}`)
  }
  if (req.body.description !== undefined) {
    values.push(normalizeText(req.body.description))
    setClauses.push(`description = $${values.length}`)
  }
  if (req.body.content !== undefined) {
    values.push(req.body.content.trim())
    setClauses.push(`content = $${values.length}`)
  }
  if (req.body.status !== undefined) {
    values.push(req.body.status)
    setClauses.push(`status = $${values.length}`)
  }
  if (req.body.contentType !== undefined) {
    values.push(req.body.contentType)
    setClauses.push(`content_type = $${values.length}`)
  }
  if (req.body.marketingDate !== undefined) {
    values.push(req.body.marketingDate ?? null)
    setClauses.push(`marketing_date = COALESCE($${values.length}::date, CURRENT_DATE)`)
  }
  if (req.body.campaignId !== undefined) {
    values.push(nextCampaignId ?? null)
    setClauses.push(`id_campaign = $${values.length}`)
  }
  if (req.body.projectId !== undefined || req.body.campaignId !== undefined) {
    values.push(association.projectId ?? null)
    setClauses.push(`id_proyecto = $${values.length}`)
  }
  if (req.body.resourceLink !== undefined) {
    values.push(normalizeText(req.body.resourceLink))
    setClauses.push(`resource_link = $${values.length}`)
  }
  if (req.body.originType !== undefined) {
    values.push(req.body.originType)
    setClauses.push(`origin_type = $${values.length}`)
  }

  values.push(req.user.id_usuario)
  setClauses.push(`updated_by = $${values.length}`)
  setClauses.push('updated_at = CURRENT_TIMESTAMP')

  values.push(companyId, itemId)

  await pool.query(
    `UPDATE public.marketing_item
     SET ${setClauses.join(', ')}
     WHERE id_empresa = $${values.length - 1} AND id_marketing_item = $${values.length}`,
    values
  )

  const item = await fetchItemById(companyId, itemId)

  return res.json({
    success: true,
    data: mapItem(item),
  })
}

export const deleteMarketingItem = async (req, res) => {
  const companyId = getCompanyId(req)
  const result = await pool.query(
    `DELETE FROM public.marketing_item
     WHERE id_empresa = $1 AND id_marketing_item = $2
     RETURNING id_marketing_item`,
    [companyId, req.params.itemId]
  )

  if (!result.rows.length) {
    return res.status(404).json({ success: false, message: 'Marketing item not found.' })
  }

  return res.json({
    success: true,
    message: 'Marketing item deleted successfully.',
  })
}

export const generateMarketingDrafts = async (req, res) => {
  const companyId = getCompanyId(req)
  const {
    objective,
    audience,
    tone,
    channel,
    callToAction,
    productName,
    contentType,
    quantity,
    campaignId,
    projectId,
  } = req.body

  const association = await resolveCampaignAndProject({
    companyId,
    campaignId: campaignId ?? null,
    projectId: projectId ?? null,
  })

  if (association.error) {
    return res.status(association.error.status).json({ success: false, message: association.error.message })
  }

  const campaign = association.campaign
  const project = association.projectId
    ? await getProjectInCompany(companyId, association.projectId)
    : null

  const drafts = buildMarketingDrafts({
    objective,
    audience: normalizeText(audience) ?? '',
    tone: normalizeText(tone) ?? '',
    channel: normalizeText(channel) ?? '',
    callToAction: normalizeText(callToAction) ?? '',
    productName: normalizeText(productName) ?? '',
    contentType,
    quantity,
    campaignName: campaign?.name ?? '',
    projectName: project?.nombre ?? '',
  }).map((draft) => ({
    ...draft,
    campaignId: campaign?.id_campaign ?? campaignId ?? null,
    campaignName: campaign?.name ?? null,
    projectId: association.projectId ?? null,
    projectName: project?.nombre ?? null,
  }))

  return res.json({
    success: true,
    data: drafts,
    meta: {
      generationMode: 'RULE_BASED',
      futureProviders: ['AI', 'EXTERNAL'],
    },
  })
}
