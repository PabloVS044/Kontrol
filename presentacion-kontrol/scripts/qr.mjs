// Genera el QR del sitio de Kontrol como SVG local (sin depender de internet el día de la presentación).
// Uso: node scripts/qr.mjs
import { writeFile } from 'node:fs/promises'
import QRCode from 'qrcode'

const SITE = 'https://www.kontrol.it.com/'
const svg = await QRCode.toString(SITE, {
  type: 'svg',
  errorCorrectionLevel: 'H',
  margin: 0,
  color: { dark: '#1a1712', light: '#0000' },
})
await writeFile(new URL('../public/media/qr-kontrol.svg', import.meta.url), svg)
console.log('QR →', SITE)
