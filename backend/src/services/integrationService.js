import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16

function getKey() {
  const secret = process.env.INTEGRATION_ENCRYPTION_KEY || process.env.JWT_SECRET
  if (!secret) throw new Error('No encryption key configured for integrations.')
  return crypto.createHash('sha256').update(secret).digest()
}

export function encryptCredentials(obj) {
  if (!obj || Object.keys(obj).length === 0) return null
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decryptCredentials(encoded) {
  if (!encoded) return null
  try {
    const key = getKey()
    const buf = Buffer.from(encoded, 'base64')
    const iv = buf.subarray(0, IV_LENGTH)
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
    const data = buf.subarray(IV_LENGTH + TAG_LENGTH)
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    const plain = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
    return JSON.parse(plain)
  } catch {
    return null
  }
}

export function maskCredentials(credentials) {
  if (!credentials) return {}
  return Object.fromEntries(
    Object.entries(credentials).map(([k, v]) => {
      if (typeof v !== 'string' || v.length <= 8) return [k, v]
      return [k, v.slice(0, 4) + '*'.repeat(Math.min(v.length - 8, 24)) + v.slice(-4)]
    }),
  )
}

export const INTEGRATION_CATALOG = [
  {
    slug: 'slack',
    nombre: 'Slack',
    descripcion: 'Envía notificaciones a canales de Slack para alertas de proyectos e inventario.',
    categoria: 'comunicacion',
    campos_credenciales: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'url', required: true },
      { key: 'channel', label: 'Canal (opcional)', type: 'text', required: false },
    ],
  },
  {
    slug: 'sendgrid',
    nombre: 'SendGrid',
    descripcion: 'Envía emails transaccionales para reportes, alertas y notificaciones automáticas.',
    categoria: 'email',
    campos_credenciales: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'from_email', label: 'Email remitente', type: 'email', required: true },
      { key: 'from_name', label: 'Nombre remitente', type: 'text', required: false },
    ],
  },
]

export const VALID_SLUGS = INTEGRATION_CATALOG.map((i) => i.slug)
