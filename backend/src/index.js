import 'dotenv/config'
import { createServer } from 'http'
import express from 'express'
import cors from 'cors'
import router from './router.js'
import helmet from 'helmet';
import { ensureDatabaseSchema } from './db/bootstrap.js'
import { connectMongo, isMongoReady } from './db/mongo.js'
import { setupSocket } from './socket/index.js'
import { securityMiddleware } from './middleware/security.middleware.js'
import { errorHandler } from './middleware/errorHandler.js'

const app        = express()
const httpServer = createServer(app)
const PORT       = process.env.PORT || 3000

const isDev = process.env.NODE_ENV !== 'production'
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

const LAN_DEV_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/

function corsOriginFn(origin, cb) {
  if (!origin) return cb(null, true)
  if (allowedOrigins.includes('*')) return cb(null, true)
  if (allowedOrigins.includes(origin)) return cb(null, true)
  if (isDev && LAN_DEV_ORIGIN.test(origin)) return cb(null, true)
  return cb(new Error(`Origin ${origin} not allowed by CORS`))
}

app.set('trust proxy', true)
securityMiddleware(app);
app.use(cors({
  origin: corsOriginFn,
  credentials: true,
}))
app.use(
  helmet({
    xFrameOptions: { action: 'deny' },
    strictTransportSecurity: {
      maxAge: 15552000, // 180 días en segundos
      includeSubDomains: true,
      preload: true,
    },
  })
);
app.locals.corsOriginFn = corsOriginFn
app.locals.allowedOrigins = allowedOrigins
app.use(express.json())
app.use('/api', router)
// DT-01 — último de la cadena: recibe todo lo que llegue a next(err).
app.use(errorHandler)
setupSocket(httpServer, {
  isChatAvailable: isMongoReady,
  corsOrigin: corsOriginFn,
})

// Se conecta a DB y levanta el puerto cuando no está en entorno de prueba
if (process.env.NODE_ENV !== 'test') {
  try {
    await ensureDatabaseSchema()
  } catch (error) {
    console.error('Could not initialize the backend:', error)
    process.exit(1)
  }

  try {
    await connectMongo()
  } catch (error) {
    console.error('MongoDB is unavailable. Chat and realtime features are disabled:', error)
  }

  httpServer.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`)
  })
}

export default app