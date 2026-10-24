// PAY-1 — Crea los productos y precios de Kontrol en la cuenta de PRUEBA de
// Stripe. Uso: npm run stripe:seed -w backend (lee STRIPE_SECRET_KEY de .env).
// Rechaza claves de producción.
import 'dotenv/config'
import { seedStripeCatalog } from '../src/billing/stripeProvider.js'

try {
  const summary = await seedStripeCatalog({
    secretKey: process.env.STRIPE_SECRET_KEY,
    log: (line) => console.log(line),
  })
  console.table(summary)
} catch (error) {
  console.error(`stripe:seed failed: ${error.message}`)
  process.exit(1)
}
