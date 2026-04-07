import { Router } from 'express'
import userRoutes from './routes/userRoutes.js'
import projectRoutes from './routes/projectRoutes.js'

const router = Router()

router.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

router.use('/users', userRoutes)
router.use('/projects', projectRoutes)

export default router
