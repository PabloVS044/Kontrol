import 'dotenv/config'
import { createServer } from 'http'
import express from 'express'
import cors from 'cors'
import router from './router.js'
import { ensureDatabaseSchema } from './db/bootstrap.js'
import { connectMongo, isMongoReady } from './db/mongo.js'
import { setupSocket } from './socket/index.js'

const app        = express()
const httpServer = createServer(app)
const PORT       = process.env.PORT || 3000

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

function corsOriginFn(origin, cb) {
  if (!origin) return cb(null, true)
  if (allowedOrigins.includes('*')) return cb(null, true)
  if (allowedOrigins.includes(origin)) return cb(null, true)
  return cb(new Error(`Origin ${origin} not allowed by CORS`))
}

app.set('trust proxy', true)
app.use(cors({
  origin: corsOriginFn,
  credentials: true,
}))
app.locals.corsOriginFn = corsOriginFn
app.locals.allowedOrigins = allowedOrigins
app.use(express.json())
app.use('/api', router)
setupSocket(httpServer, {
  isChatAvailable: isMongoReady,
  corsOrigin: corsOriginFn,
})

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
