import { Router } from 'express'
import authRoutes from './routes/authRoutes.js'
import userRoutes from './routes/userRoutes.js'
import productRoutes from './routes/productRoutes.js'
import supplierRoutes from './routes/supplierRoutes.js'
import inventoryMovementRoutes from './routes/inventoryMovementRoutes.js'
import projectRoutes from './routes/projectRoutes.js'
import companyRoutes from './routes/companyRoutes.js'
import reportsRoutes from './routes/reportsRoutes.js'
import budgetRoutes from './routes/budgetRoutes.js'
import taskRoutes from './routes/taskRoutes.js'


const router = Router()

router.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

router.use('/auth', authRoutes)
router.use('/users', userRoutes)
router.use('/products', productRoutes)
router.use('/suppliers', supplierRoutes)
router.use('/inventory-movements', inventoryMovementRoutes)
router.use('/projects', projectRoutes)
router.use('/companies', companyRoutes)
router.use('/reports', reportsRoutes)
router.use('/budgets', budgetRoutes)
router.use('/projects/:projectId/tasks', taskRoutes)


export default router
