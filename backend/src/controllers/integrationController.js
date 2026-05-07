import pool from '../db/pool.js'
import {
  INTEGRATION_CATALOG,
  VALID_SLUGS,
  encryptCredentials,
  decryptCredentials,
  maskCredentials,
} from '../services/integrationService.js'
import { testSlackConnection } from '../services/slackService.js'
import { testSendGridConnection } from '../services/sendgridService.js'

export const listIntegrations = async (req, res) => {
  const { id_empresa } = req.empresa

  const result = await pool.query(
    `SELECT slug, status, config, updated_at
     FROM public.integracion
     WHERE id_empresa = $1`,
    [id_empresa],
  )

  const savedBySlug = Object.fromEntries(result.rows.map((r) => [r.slug, r]))

  const data = INTEGRATION_CATALOG.map((integration) => {
    const saved = savedBySlug[integration.slug]
    return {
      ...integration,
      status: saved?.status ?? 'inactive',
      config: saved?.config ?? {},
      updated_at: saved?.updated_at ?? null,
      is_configured: !!saved,
    }
  })

  return res.json({ success: true, data })
}

export const getIntegrationConfig = async (req, res) => {
  const { id_empresa } = req.empresa
  const { slug } = req.params

  if (!VALID_SLUGS.includes(slug)) {
    return res.status(404).json({ success: false, message: 'Integración no encontrada.' })
  }

  const result = await pool.query(
    `SELECT slug, status, credentials_enc, config, updated_at
     FROM public.integracion
     WHERE id_empresa = $1 AND slug = $2`,
    [id_empresa, slug],
  )

  if (!result.rows.length) {
    return res.json({
      success: true,
      data: { slug, status: 'inactive', credentials: {}, config: {}, is_configured: false },
    })
  }

  const row = result.rows[0]
  const credentials = decryptCredentials(row.credentials_enc)

  return res.json({
    success: true,
    data: {
      slug: row.slug,
      status: row.status,
      credentials: maskCredentials(credentials),
      config: row.config,
      updated_at: row.updated_at,
      is_configured: true,
    },
  })
}

export const saveIntegrationConfig = async (req, res) => {
  const { id_empresa } = req.empresa
  const { slug } = req.params
  const { credentials, config } = req.body

  if (!VALID_SLUGS.includes(slug)) {
    return res.status(404).json({ success: false, message: 'Integración no encontrada.' })
  }

  // If updating, merge new credentials over the existing ones so masked fields aren't overwritten
  const existingResult = await pool.query(
    `SELECT credentials_enc FROM public.integracion WHERE id_empresa = $1 AND slug = $2`,
    [id_empresa, slug],
  )

  const existing = existingResult.rows.length
    ? decryptCredentials(existingResult.rows[0].credentials_enc) ?? {}
    : {}

  // Only overwrite fields that are not masked (i.e. the user actually typed a new value)
  const merged = { ...existing }
  for (const [k, v] of Object.entries(credentials ?? {})) {
    if (v && !v.includes('****')) merged[k] = v
  }

  const encrypted = encryptCredentials(merged)

  await pool.query(
    `INSERT INTO public.integracion (id_empresa, slug, credentials_enc, config, creado_por, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (id_empresa, slug) DO UPDATE SET
       credentials_enc = EXCLUDED.credentials_enc,
       config          = EXCLUDED.config,
       updated_at      = NOW()`,
    [id_empresa, slug, encrypted, JSON.stringify(config ?? {}), req.user.id_usuario],
  )

  return res.json({ success: true, message: 'Integración guardada correctamente.' })
}

export const toggleIntegration = async (req, res) => {
  const { id_empresa } = req.empresa
  const { slug } = req.params
  const { status } = req.body

  if (!VALID_SLUGS.includes(slug)) {
    return res.status(404).json({ success: false, message: 'Integración no encontrada.' })
  }

  const existing = await pool.query(
    `SELECT id_integracion FROM public.integracion WHERE id_empresa = $1 AND slug = $2`,
    [id_empresa, slug],
  )

  if (!existing.rows.length) {
    return res.status(400).json({
      success: false,
      message: 'Configura la integración antes de activarla.',
    })
  }

  await pool.query(
    `UPDATE public.integracion SET status = $1, updated_at = NOW()
     WHERE id_empresa = $2 AND slug = $3`,
    [status, id_empresa, slug],
  )

  return res.json({ success: true, data: { slug, status } })
}

export const testIntegration = async (req, res) => {
  const { id_empresa } = req.empresa
  const { slug } = req.params

  if (!VALID_SLUGS.includes(slug)) {
    return res.status(404).json({ success: false, message: 'Integración no encontrada.' })
  }

  const result = await pool.query(
    `SELECT credentials_enc FROM public.integracion WHERE id_empresa = $1 AND slug = $2`,
    [id_empresa, slug],
  )

  if (!result.rows.length) {
    return res.status(400).json({ success: false, message: 'Integración no configurada.' })
  }

  const credentials = decryptCredentials(result.rows[0].credentials_enc)

  try {
    if (slug === 'slack') await testSlackConnection(credentials)
    else if (slug === 'sendgrid') await testSendGridConnection(credentials)

    await pool.query(
      `UPDATE public.integracion SET status = 'active', updated_at = NOW()
       WHERE id_empresa = $1 AND slug = $2`,
      [id_empresa, slug],
    )

    return res.json({ success: true, message: 'Conexión exitosa.' })
  } catch (error) {
    await pool.query(
      `UPDATE public.integracion SET status = 'error', updated_at = NOW()
       WHERE id_empresa = $1 AND slug = $2`,
      [id_empresa, slug],
    )

    return res.status(400).json({ success: false, message: error.message })
  }
}
