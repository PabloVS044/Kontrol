import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import router from './router.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())
app.use('/api', router)

app.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`)
})
