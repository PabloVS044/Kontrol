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
  COALESCE(item_stats.items_count, 0)::int AS items_count,
  COALESCE(publication_stats.publications_count, 0)::int AS publications_count,
  COALESCE(publication_stats.pipeline_count, 0)::int AS pipeline_count,
  COALESCE(publication_stats.published_count, 0)::int AS published_count,
  COALESCE(publication_stats.total_impressions, 0)::bigint AS total_impressions,
  COALESCE(publication_stats.total_reach, 0)::bigint AS total_reach,
  COALESCE(publication_stats.total_clicks, 0)::bigint AS total_clicks,
  COALESCE(publication_stats.total_leads, 0)::bigint AS total_leads,
  COALESCE(publication_stats.total_spend, 0)::numeric AS total_spend,
  COALESCE(publication_stats.total_engagements, 0)::bigint AS total_engagements
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

const MARKETING_PUBLICATION_SELECT = `
  mp.id_publication,
  mp.id_campaign,
  mp.id_proyecto,
  mp.title,
  mp.caption,
  mp.platform,
  mp.publication_format,
  mp.status,
  mp.scheduled_for,
  mp.published_at,
  mp.asset_url,
  mp.publication_url,
  mp.notes,
  mp.created_at,
  mp.updated_at,
  mc.name AS campaign_name,
  p.nombre AS project_name,
  TRIM(CONCAT(creator.nombre, ' ', creator.apellido)) AS created_by_name,
  TRIM(CONCAT(updater.nombre, ' ', updater.apellido)) AS updated_by_name,
  COALESCE(snapshot_counts.snapshots_count, 0)::int AS snapshots_count,
  latest_metric.captured_at AS last_metric_at,
  COALESCE(latest_metric.impressions, 0)::int AS impressions,
  COALESCE(latest_metric.reach, 0)::int AS reach,
  COALESCE(latest_metric.likes, 0)::int AS likes,
  COALESCE(latest_metric.comments, 0)::int AS comments,
  COALESCE(latest_metric.shares, 0)::int AS shares,
  COALESCE(latest_metric.saves, 0)::int AS saves,
  COALESCE(latest_metric.clicks, 0)::int AS clicks,
  COALESCE(latest_metric.leads, 0)::int AS leads,
  COALESCE(latest_metric.followers_gained, 0)::int AS followers_gained,
  COALESCE(latest_metric.spend, 0)::numeric AS spend
`

const MARKETING_METRIC_SNAPSHOT_SELECT = `
  ms.id_metric_snapshot,
  ms.id_publication,
  ms.captured_at,
  ms.impressions,
  ms.reach,
  ms.likes,
  ms.comments,
  ms.shares,
  ms.saves,
  ms.clicks,
  ms.leads,
  ms.followers_gained,
  ms.spend,
  ms.notes,
  ms.created_at,
  ms.updated_at,
  TRIM(CONCAT(u.nombre, ' ', u.apellido)) AS created_by_name
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

const toNumber = (value) => Number(value || 0)

// HU-28 — ciclo de vida de una publicación: borrador → programada → publicada.
// PUBLISHED es terminal: el contenido se sigue pudiendo editar, el estado no.
// DRAFT → PUBLISHED se admite como atajo de "publicar ahora".
const PUBLICATION_STATUS_TRANSITIONS = {
  DRAFT: ['SCHEDULED', 'PUBLISHED'],
  SCHEDULED: ['DRAFT', 'PUBLISHED'],
  PUBLISHED: [],
}

// Marca para que el UPDATE escriba CURRENT_TIMESTAMP en lugar de un parámetro:
// la fecha la pone la base, no el reloj del proceso de Node.
const NOW = Symbol('CURRENT_TIMESTAMP')

const isPublicationTransitionAllowed = (current, next) =>
  current === next || (PUBLICATION_STATUS_TRANSITIONS[current] ?? []).includes(next)

const resolvePublicationLifecycleForCreate = ({ status, scheduledFor }) => {
  const nextStatus = status ?? 'DRAFT'

  if (nextStatus === 'SCHEDULED' && !scheduledFor) {
    return { error: { status: 400, message: 'A scheduled publication requires a scheduled date.' } }
  }

  return { status: nextStatus }
}

/**
 * Decide el estado resultante y qué hacer con published_at.
 * `publishedAt: undefined` significa "no tocar la columna", lo que evita
 * reenviar a Postgres una fecha que ya viajó de ida y vuelta por Node.
 */
const resolvePublicationLifecycleForUpdate = ({ existing, body }) => {
  const currentStatus = existing.status
  const nextStatus = body.status ?? currentStatus

  if (!isPublicationTransitionAllowed(currentStatus, nextStatus)) {
    return {
      error: {
        status: 409,
        message: `A publication cannot move from ${currentStatus} to ${nextStatus}.`,
      },
    }
  }

  const scheduledFor = body.scheduledFor !== undefined ? body.scheduledFor : existing.scheduled_for
  if (nextStatus === 'SCHEDULED' && !scheduledFor) {
    return { error: { status: 400, message: 'A scheduled publication requires a scheduled date.' } }
  }

  let publishedAt

  if (nextStatus === 'PUBLISHED') {
    if (body.publishedAt) publishedAt = body.publishedAt
    else if (!existing.published_at) publishedAt = NOW
  } else if (existing.published_at) {
    // Al dejar de estar publicada se limpia la marca de publicación.
    publishedAt = null
  }

  return { status: nextStatus, publishedAt }
}

const buildLatestMetrics = (row) => {
  const impressions = toNumber(row.impressions)
  const reach = toNumber(row.reach)
  const likes = toNumber(row.likes)
  const comments = toNumber(row.comments)
  const shares = toNumber(row.shares)
  const saves = toNumber(row.saves)
  const clicks = toNumber(row.clicks)
  const leads = toNumber(row.leads)
  const followersGained = toNumber(row.followers_gained)
  const spend = Number(toNumber(row.spend).toFixed(2))
  const engagements = likes + comments + shares + saves
  const engagementRate = reach > 0 ? Number((engagements / reach).toFixed(4)) : 0

  return {
    impressions,
    reach,
    likes,
    comments,
    shares,
    saves,
    clicks,
    leads,
    followersGained,
    spend,
    engagements,
    engagementRate,
    snapshotsCount: toNumber(row.snapshots_count),
    lastMetricAt: row.last_metric_at ?? null,
  }
}

const buildMetricsDelta = (current, previous) => {
  if (!current || !previous) return null

  return {
    impressions: current.impressions - previous.impressions,
    reach: current.reach - previous.reach,
    likes: current.likes - previous.likes,
    comments: current.comments - previous.comments,
    shares: current.shares - previous.shares,
    saves: current.saves - previous.saves,
    clicks: current.clicks - previous.clicks,
    leads: current.leads - previous.leads,
    followersGained: current.followersGained - previous.followersGained,
    spend: Number((current.spend - previous.spend).toFixed(2)),
    engagements: current.engagements - previous.engagements,
    engagementRate: Number((current.engagementRate - previous.engagementRate).toFixed(4)),
  }
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
  itemsCount: toNumber(row.items_count),
  publicationsCount: toNumber(row.publications_count),
  pipelineCount: toNumber(row.pipeline_count),
  publishedCount: toNumber(row.published_count),
  totals: {
    impressions: toNumber(row.total_impressions),
    reach: toNumber(row.total_reach),
    clicks: toNumber(row.total_clicks),
    leads: toNumber(row.total_leads),
    spend: Number(toNumber(row.total_spend).toFixed(2)),
    engagements: toNumber(row.total_engagements),
  },
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

const mapPublication = (row) => ({
  id: row.id_publication,
  campaignId: row.id_campaign,
  projectId: row.id_proyecto,
  title: row.title,
  caption: row.caption ?? '',
  platform: row.platform,
  format: row.publication_format,
  status: row.status,
  scheduledFor: row.scheduled_for,
  publishedAt: row.published_at,
  assetUrl: row.asset_url ?? '',
  publicationUrl: row.publication_url ?? '',
  notes: row.notes ?? '',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  campaignName: row.campaign_name ?? null,
  projectName: row.project_name ?? null,
  createdByName: row.created_by_name || 'Unknown',
  updatedByName: row.updated_by_name || 'Unknown',
  latestMetrics: buildLatestMetrics(row),
})

const mapMetricSnapshot = (row) => {
  const metrics = buildLatestMetrics({
    ...row,
    last_metric_at: row.captured_at,
    snapshots_count: 1,
  })

  return {
    id: row.id_metric_snapshot,
    publicationId: row.id_publication,
    capturedAt: row.captured_at,
    impressions: metrics.impressions,
    reach: metrics.reach,
    likes: metrics.likes,
    comments: metrics.comments,
    shares: metrics.shares,
    saves: metrics.saves,
    clicks: metrics.clicks,
    leads: metrics.leads,
    followersGained: metrics.followersGained,
    spend: metrics.spend,
    engagements: metrics.engagements,
    engagementRate: metrics.engagementRate,
    notes: row.notes ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByName: row.created_by_name || 'Unknown',
  }
}

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

const getPublicationInCompany = async (companyId, publicationId) => {
  const result = await pool.query(
    `SELECT id_publication, id_campaign, id_proyecto, title, status, scheduled_for, published_at
     FROM public.marketing_publication
     WHERE id_empresa = $1 AND id_publication = $2
     LIMIT 1`,
    [companyId, publicationId]
  )

  return result.rows[0] ?? null
}

const getMetricSnapshotInCompany = async (companyId, publicationId, snapshotId) => {
  const result = await pool.query(
    `SELECT ms.id_metric_snapshot, ms.id_publication
     FROM public.marketing_publication_metric_snapshot ms
     JOIN public.marketing_publication mp ON mp.id_publication = ms.id_publication
     WHERE mp.id_empresa = $1
       AND ms.id_publication = $2
       AND ms.id_metric_snapshot = $3
     LIMIT 1`,
    [companyId, publicationId, snapshotId]
  )

  return result.rows[0] ?? null
}

const buildCampaignQuery = ({ whereClause, values }) => pool.query(
  `SELECT ${MARKETING_CAMPAIGN_SELECT}
   FROM public.marketing_campaign mc
   LEFT JOIN public.proyecto p ON p.id_proyecto = mc.id_proyecto
   LEFT JOIN LATERAL (
     SELECT COUNT(*)::int AS items_count
     FROM public.marketing_item mi
     WHERE mi.id_campaign = mc.id_campaign
   ) item_stats ON true
   LEFT JOIN LATERAL (
     SELECT
       COUNT(*)::int AS publications_count,
       COUNT(*) FILTER (WHERE mp.status IN ('DRAFT', 'SCHEDULED'))::int AS pipeline_count,
       COUNT(*) FILTER (WHERE mp.status = 'PUBLISHED')::int AS published_count,
       COALESCE(SUM(COALESCE(latest_metric.impressions, 0)), 0)::bigint AS total_impressions,
       COALESCE(SUM(COALESCE(latest_metric.reach, 0)), 0)::bigint AS total_reach,
       COALESCE(SUM(COALESCE(latest_metric.clicks, 0)), 0)::bigint AS total_clicks,
       COALESCE(SUM(COALESCE(latest_metric.leads, 0)), 0)::bigint AS total_leads,
       COALESCE(SUM(COALESCE(latest_metric.spend, 0)), 0)::numeric AS total_spend,
       COALESCE(SUM(
         COALESCE(latest_metric.likes, 0)
         + COALESCE(latest_metric.comments, 0)
         + COALESCE(latest_metric.shares, 0)
         + COALESCE(latest_metric.saves, 0)
       ), 0)::bigint AS total_engagements
     FROM public.marketing_publication mp
     LEFT JOIN LATERAL (
       SELECT
         ms.impressions,
         ms.reach,
         ms.likes,
         ms.comments,
         ms.shares,
         ms.saves,
         ms.clicks,
         ms.leads,
         ms.spend
       FROM public.marketing_publication_metric_snapshot ms
       WHERE ms.id_publication = mp.id_publication
       ORDER BY ms.captured_at DESC, ms.id_metric_snapshot DESC
       LIMIT 1
     ) latest_metric ON true
     WHERE mp.id_campaign = mc.id_campaign
   ) publication_stats ON true
   ${whereClause}
   ORDER BY LOWER(mc.name), mc.id_campaign`,
  values
)

const fetchCampaignById = async (companyId, campaignId) => {
  const result = await buildCampaignQuery({
    whereClause: 'WHERE mc.id_empresa = $1 AND mc.id_campaign = $2',
    values: [companyId, campaignId],
  })

  return result.rows[0] ?? null
}

const buildPublicationQuery = ({ whereClause, values, limitClause = '' }) => pool.query(
  `SELECT ${MARKETING_PUBLICATION_SELECT}
   FROM public.marketing_publication mp
   LEFT JOIN public.marketing_campaign mc ON mc.id_campaign = mp.id_campaign
   LEFT JOIN public.proyecto p ON p.id_proyecto = mp.id_proyecto
   JOIN public.usuario creator ON creator.id_usuario = mp.created_by
   JOIN public.usuario updater ON updater.id_usuario = mp.updated_by
   LEFT JOIN LATERAL (
     SELECT COUNT(*)::int AS snapshots_count
     FROM public.marketing_publication_metric_snapshot ms
     WHERE ms.id_publication = mp.id_publication
   ) snapshot_counts ON true
   LEFT JOIN LATERAL (
     SELECT
       ms.captured_at,
       ms.impressions,
       ms.reach,
       ms.likes,
       ms.comments,
       ms.shares,
       ms.saves,
       ms.clicks,
       ms.leads,
       ms.followers_gained,
       ms.spend
     FROM public.marketing_publication_metric_snapshot ms
     WHERE ms.id_publication = mp.id_publication
     ORDER BY ms.captured_at DESC, ms.id_metric_snapshot DESC
     LIMIT 1
   ) latest_metric ON true
   ${whereClause}
   ORDER BY COALESCE(mp.published_at, mp.scheduled_for) DESC NULLS LAST, mp.updated_at DESC, mp.id_publication DESC
   ${limitClause}`,
  values
)

const fetchPublicationById = async (companyId, publicationId) => {
  const result = await buildPublicationQuery({
    whereClause: 'WHERE mp.id_empresa = $1 AND mp.id_publication = $2',
    values: [companyId, publicationId],
  })

  return result.rows[0] ?? null
}

const fetchPublicationMetrics = async (publicationId) => {
  const result = await pool.query(
    `SELECT ${MARKETING_METRIC_SNAPSHOT_SELECT}
     FROM public.marketing_publication_metric_snapshot ms
     JOIN public.usuario u ON u.id_usuario = ms.created_by
     WHERE ms.id_publication = $1
     ORDER BY ms.captured_at DESC, ms.id_metric_snapshot DESC`,
    [publicationId]
  )

  return result.rows.map(mapMetricSnapshot)
}

const fetchMetricSnapshotById = async (companyId, publicationId, snapshotId) => {
  const result = await pool.query(
    `SELECT ${MARKETING_METRIC_SNAPSHOT_SELECT}
     FROM public.marketing_publication_metric_snapshot ms
     JOIN public.marketing_publication mp ON mp.id_publication = ms.id_publication
     JOIN public.usuario u ON u.id_usuario = ms.created_by
     WHERE mp.id_empresa = $1
       AND ms.id_publication = $2
       AND ms.id_metric_snapshot = $3
     LIMIT 1`,
    [companyId, publicationId, snapshotId]
  )

  return result.rows[0] ?? null
}

const resolveCampaignAndProject = async ({
  companyId,
  campaignId,
  projectId,
  requireProjectAssociation = false,
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

  if (requireProjectAssociation && !finalProjectId) {
    return {
      error: {
        status: 400,
        message: 'This record must be linked to a project.',
      },
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

  if (req.query.projectId) {
    values.push(req.query.projectId)
    filters.push(`mc.id_proyecto = $${values.length}`)
  }

  const result = await buildCampaignQuery({
    whereClause: `WHERE ${filters.join(' AND ')}`,
    values,
  })

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

  const project = await getProjectInCompany(companyId, projectId)
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found.' })
  }

  const result = await pool.query(
    `INSERT INTO public.marketing_campaign
       (id_empresa, id_proyecto, name, description, objective, channel, status, start_date, end_date, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
     RETURNING id_campaign`,
    [
      companyId,
      projectId,
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
  const { campaignId } = req.params

  const existing = await getCampaignInCompany(companyId, campaignId)
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Campaign not found.' })
  }

  const dependencies = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM public.marketing_publication WHERE id_campaign = $2) AS publications_count,
       (SELECT COUNT(*)::int FROM public.marketing_item WHERE id_campaign = $2) AS items_count
     FROM public.marketing_campaign
     WHERE id_empresa = $1 AND id_campaign = $2`,
    [companyId, campaignId]
  )

  const counts = dependencies.rows[0]
  if ((counts?.publications_count ?? 0) > 0 || (counts?.items_count ?? 0) > 0) {
    return res.status(409).json({
      success: false,
      message: 'Delete or move linked publications and creative items before deleting this campaign.',
    })
  }

  await pool.query(
    `DELETE FROM public.marketing_campaign
     WHERE id_empresa = $1 AND id_campaign = $2`,
    [companyId, campaignId]
  )

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

  const item = await fetchMarketingItemById(companyId, result.rows[0].id_marketing_item)

  return res.status(201).json({
    success: true,
    data: mapItem(item),
  })
}

const fetchMarketingItemById = async (companyId, itemId) => {
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

export const updateMarketingItem = async (req, res) => {
  const companyId = getCompanyId(req)
  const { itemId } = req.params

  const existing = await fetchMarketingItemById(companyId, itemId)
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

  const item = await fetchMarketingItemById(companyId, itemId)

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

export const getMarketingPublications = async (req, res) => {
  const companyId = getCompanyId(req)
  const values = [companyId]
  const filters = ['mp.id_empresa = $1']

  if (req.query.status) {
    values.push(req.query.status)
    filters.push(`mp.status = $${values.length}`)
  }

  if (req.query.platform) {
    values.push(req.query.platform)
    filters.push(`mp.platform = $${values.length}`)
  }

  if (req.query.campaignId) {
    values.push(req.query.campaignId)
    filters.push(`mp.id_campaign = $${values.length}`)
  }

  if (req.query.projectId) {
    values.push(req.query.projectId)
    filters.push(`mp.id_proyecto = $${values.length}`)
  }

  if (req.query.search) {
    values.push(`%${req.query.search.toLowerCase()}%`)
    filters.push(`(
      LOWER(mp.title) LIKE $${values.length}
      OR LOWER(COALESCE(mp.caption, '')) LIKE $${values.length}
      OR LOWER(COALESCE(mc.name, '')) LIKE $${values.length}
      OR LOWER(COALESCE(p.nombre, '')) LIKE $${values.length}
    )`)
  }

  values.push(req.query.limit ?? 200)

  const result = await buildPublicationQuery({
    whereClause: `WHERE ${filters.join(' AND ')}`,
    values,
    limitClause: `LIMIT $${values.length}`,
  })

  return res.json({
    success: true,
    data: result.rows.map(mapPublication),
    capabilities: {
      canManageMarketing: canManageMarketing(req),
    },
  })
}

export const createMarketingPublication = async (req, res) => {
  const companyId = getCompanyId(req)
  const {
    title,
    caption,
    platform,
    format,
    status,
    campaignId,
    projectId,
    scheduledFor,
    publishedAt,
    assetUrl,
    publicationUrl,
    notes,
  } = req.body

  const association = await resolveCampaignAndProject({
    companyId,
    campaignId: campaignId ?? null,
    projectId: projectId ?? null,
    requireProjectAssociation: true,
  })

  if (association.error) {
    return res.status(association.error.status).json({ success: false, message: association.error.message })
  }

  const lifecycle = resolvePublicationLifecycleForCreate({ status, scheduledFor })
  if (lifecycle.error) {
    return res.status(lifecycle.error.status).json({ success: false, message: lifecycle.error.message })
  }

  const result = await pool.query(
    `INSERT INTO public.marketing_publication
       (
         id_empresa,
         id_campaign,
         id_proyecto,
         title,
         caption,
         platform,
         publication_format,
         status,
         scheduled_for,
         published_at,
         asset_url,
         publication_url,
         notes,
         created_by,
         updated_by
       )
     VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9::timestamp,
       -- Solo una publicación publicada lleva fecha de publicación; si no se
       -- envía, la fija la base.
       CASE WHEN $8::varchar = 'PUBLISHED' THEN COALESCE($10::timestamp, CURRENT_TIMESTAMP) END,
       $11, $12, $13, $14, $14
     )
     RETURNING id_publication`,
    [
      companyId,
      association.campaign?.id_campaign ?? campaignId ?? null,
      association.projectId,
      title.trim(),
      normalizeText(caption) ?? null,
      platform,
      format,
      lifecycle.status,
      scheduledFor ?? null,
      publishedAt ?? null,
      normalizeText(assetUrl) ?? null,
      normalizeText(publicationUrl) ?? null,
      normalizeText(notes) ?? null,
      req.user.id_usuario,
    ]
  )

  const publication = await fetchPublicationById(companyId, result.rows[0].id_publication)

  return res.status(201).json({
    success: true,
    data: mapPublication(publication),
  })
}

export const updateMarketingPublication = async (req, res) => {
  const companyId = getCompanyId(req)
  const { publicationId } = req.params

  const existing = await getPublicationInCompany(companyId, publicationId)
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Publication not found.' })
  }

  const nextCampaignId = req.body.campaignId !== undefined ? req.body.campaignId : existing.id_campaign
  const nextProjectId = req.body.projectId !== undefined ? req.body.projectId : existing.id_proyecto
  const association = await resolveCampaignAndProject({
    companyId,
    campaignId: nextCampaignId ?? null,
    projectId: nextProjectId ?? null,
    requireProjectAssociation: true,
  })

  if (association.error) {
    return res.status(association.error.status).json({ success: false, message: association.error.message })
  }

  const lifecycle = resolvePublicationLifecycleForUpdate({ existing, body: req.body })
  if (lifecycle.error) {
    return res.status(lifecycle.error.status).json({ success: false, message: lifecycle.error.message })
  }

  const setClauses = []
  const values = []

  if (req.body.title !== undefined) {
    values.push(req.body.title.trim())
    setClauses.push(`title = $${values.length}`)
  }
  if (req.body.caption !== undefined) {
    values.push(normalizeText(req.body.caption))
    setClauses.push(`caption = $${values.length}`)
  }
  if (req.body.platform !== undefined) {
    values.push(req.body.platform)
    setClauses.push(`platform = $${values.length}`)
  }
  if (req.body.format !== undefined) {
    values.push(req.body.format)
    setClauses.push(`publication_format = $${values.length}`)
  }
  // El estado siempre se reescribe: el resolver ya validó la transición y
  // devuelve el estado actual cuando la petición no lo cambia.
  values.push(lifecycle.status)
  setClauses.push(`status = $${values.length}`)

  if (req.body.campaignId !== undefined) {
    values.push(nextCampaignId ?? null)
    setClauses.push(`id_campaign = $${values.length}`)
  }
  if (req.body.projectId !== undefined || req.body.campaignId !== undefined) {
    values.push(association.projectId)
    setClauses.push(`id_proyecto = $${values.length}`)
  }
  if (req.body.scheduledFor !== undefined) {
    values.push(req.body.scheduledFor ?? null)
    setClauses.push(`scheduled_for = $${values.length}::timestamp`)
  }
  if (lifecycle.publishedAt === NOW) {
    setClauses.push('published_at = CURRENT_TIMESTAMP')
  } else if (lifecycle.publishedAt !== undefined) {
    values.push(lifecycle.publishedAt)
    setClauses.push(`published_at = $${values.length}::timestamp`)
  }
  if (req.body.assetUrl !== undefined) {
    values.push(normalizeText(req.body.assetUrl))
    setClauses.push(`asset_url = $${values.length}`)
  }
  if (req.body.publicationUrl !== undefined) {
    values.push(normalizeText(req.body.publicationUrl))
    setClauses.push(`publication_url = $${values.length}`)
  }
  if (req.body.notes !== undefined) {
    values.push(normalizeText(req.body.notes))
    setClauses.push(`notes = $${values.length}`)
  }

  values.push(req.user.id_usuario)
  setClauses.push(`updated_by = $${values.length}`)
  setClauses.push('updated_at = CURRENT_TIMESTAMP')

  values.push(companyId, publicationId)

  await pool.query(
    `UPDATE public.marketing_publication
     SET ${setClauses.join(', ')}
     WHERE id_empresa = $${values.length - 1} AND id_publication = $${values.length}`,
    values
  )

  const publication = await fetchPublicationById(companyId, publicationId)

  return res.json({
    success: true,
    data: mapPublication(publication),
  })
}

export const deleteMarketingPublication = async (req, res) => {
  const companyId = getCompanyId(req)
  const result = await pool.query(
    `DELETE FROM public.marketing_publication
     WHERE id_empresa = $1 AND id_publication = $2
     RETURNING id_publication`,
    [companyId, req.params.publicationId]
  )

  if (!result.rows.length) {
    return res.status(404).json({ success: false, message: 'Publication not found.' })
  }

  return res.json({
    success: true,
    message: 'Publication deleted successfully.',
  })
}

export const getMarketingPublicationMetrics = async (req, res) => {
  const companyId = getCompanyId(req)
  const { publicationId } = req.params

  const publication = await fetchPublicationById(companyId, publicationId)
  if (!publication) {
    return res.status(404).json({ success: false, message: 'Publication not found.' })
  }

  const snapshots = await fetchPublicationMetrics(publicationId)
  const current = snapshots[0] ?? null
  const previous = snapshots[1] ?? null

  return res.json({
    success: true,
    data: {
      publication: mapPublication(publication),
      summary: {
        current,
        previous,
        delta: current && previous ? buildMetricsDelta(current, previous) : null,
      },
      snapshots,
    },
  })
}

export const createMarketingMetricSnapshot = async (req, res) => {
  const companyId = getCompanyId(req)
  const { publicationId } = req.params

  const publication = await getPublicationInCompany(companyId, publicationId)
  if (!publication) {
    return res.status(404).json({ success: false, message: 'Publication not found.' })
  }

  const {
    capturedAt,
    impressions,
    reach,
    likes,
    comments,
    shares,
    saves,
    clicks,
    leads,
    followersGained,
    spend,
    notes,
  } = req.body

  const result = await pool.query(
    `INSERT INTO public.marketing_publication_metric_snapshot
       (
         id_publication,
         captured_at,
         impressions,
         reach,
         likes,
         comments,
         shares,
         saves,
         clicks,
         leads,
         followers_gained,
         spend,
         notes,
         created_by
       )
     VALUES ($1, COALESCE($2::timestamp, CURRENT_TIMESTAMP), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING id_metric_snapshot`,
    [
      publicationId,
      capturedAt ?? null,
      impressions ?? 0,
      reach ?? 0,
      likes ?? 0,
      comments ?? 0,
      shares ?? 0,
      saves ?? 0,
      clicks ?? 0,
      leads ?? 0,
      followersGained ?? 0,
      spend ?? 0,
      normalizeText(notes) ?? null,
      req.user.id_usuario,
    ]
  )

  const snapshot = await fetchMetricSnapshotById(companyId, publicationId, result.rows[0].id_metric_snapshot)

  return res.status(201).json({
    success: true,
    data: mapMetricSnapshot(snapshot),
  })
}

export const updateMarketingMetricSnapshot = async (req, res) => {
  const companyId = getCompanyId(req)
  const { publicationId, snapshotId } = req.params

  const existing = await getMetricSnapshotInCompany(companyId, publicationId, snapshotId)
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Metric snapshot not found.' })
  }

  const setClauses = []
  const values = []

  if (req.body.capturedAt !== undefined) {
    values.push(req.body.capturedAt ?? null)
    setClauses.push(`captured_at = COALESCE($${values.length}::timestamp, CURRENT_TIMESTAMP)`)
  }
  if (req.body.impressions !== undefined) {
    values.push(req.body.impressions)
    setClauses.push(`impressions = $${values.length}`)
  }
  if (req.body.reach !== undefined) {
    values.push(req.body.reach)
    setClauses.push(`reach = $${values.length}`)
  }
  if (req.body.likes !== undefined) {
    values.push(req.body.likes)
    setClauses.push(`likes = $${values.length}`)
  }
  if (req.body.comments !== undefined) {
    values.push(req.body.comments)
    setClauses.push(`comments = $${values.length}`)
  }
  if (req.body.shares !== undefined) {
    values.push(req.body.shares)
    setClauses.push(`shares = $${values.length}`)
  }
  if (req.body.saves !== undefined) {
    values.push(req.body.saves)
    setClauses.push(`saves = $${values.length}`)
  }
  if (req.body.clicks !== undefined) {
    values.push(req.body.clicks)
    setClauses.push(`clicks = $${values.length}`)
  }
  if (req.body.leads !== undefined) {
    values.push(req.body.leads)
    setClauses.push(`leads = $${values.length}`)
  }
  if (req.body.followersGained !== undefined) {
    values.push(req.body.followersGained)
    setClauses.push(`followers_gained = $${values.length}`)
  }
  if (req.body.spend !== undefined) {
    values.push(req.body.spend)
    setClauses.push(`spend = $${values.length}`)
  }
  if (req.body.notes !== undefined) {
    values.push(normalizeText(req.body.notes))
    setClauses.push(`notes = $${values.length}`)
  }

  setClauses.push('updated_at = CURRENT_TIMESTAMP')
  values.push(snapshotId, publicationId)

  await pool.query(
    `UPDATE public.marketing_publication_metric_snapshot
     SET ${setClauses.join(', ')}
     WHERE id_metric_snapshot = $${values.length - 1}
       AND id_publication = $${values.length}`,
    values
  )

  const snapshot = await fetchMetricSnapshotById(companyId, publicationId, snapshotId)

  return res.json({
    success: true,
    data: mapMetricSnapshot(snapshot),
  })
}

export const deleteMarketingMetricSnapshot = async (req, res) => {
  const companyId = getCompanyId(req)
  const { publicationId, snapshotId } = req.params

  const existing = await getMetricSnapshotInCompany(companyId, publicationId, snapshotId)
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Metric snapshot not found.' })
  }

  await pool.query(
    `DELETE FROM public.marketing_publication_metric_snapshot
     WHERE id_metric_snapshot = $1 AND id_publication = $2`,
    [snapshotId, publicationId]
  )

  return res.json({
    success: true,
    message: 'Metric snapshot deleted successfully.',
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
