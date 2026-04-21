import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import router from './router.js'
import { ensureDatabaseSchema } from './db/bootstrap.js'

const app = express()
const PORT = process.env.PORT || 3000

app.set('trust proxy', true)
app.use(cors())
app.use(express.json())
app.use('/api', router)

try {
  await ensureDatabaseSchema()

  app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`)
  })
} catch (error) {
  console.error('Could not initialize the backend:', error)
  process.exit(1)
}
