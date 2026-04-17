import { Router } from 'express'
import authRoutes from './routes/authRoutes.js'
import userRoutes from './routes/userRoutes.js'
import productoRoutes from './routes/productoRoutes.js'
import proveedorRoutes from './routes/proveedorRoutes.js'
import movimientoRoutes from './routes/movimientoRoutes.js'
import projectRoutes from './routes/projectRoutes.js'
import empresaRoutes from './routes/empresaRoutes.js'
import budgetRoutes from './routes/budgetRoutes.js'

const router = Router()

router.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

router.use('/auth', authRoutes)
router.use('/users', userRoutes)
router.use('/productos', productoRoutes)
router.use('/proveedores', proveedorRoutes)
router.use('/movimientos', movimientoRoutes)
router.use('/projects', projectRoutes)
router.use('/empresas', empresaRoutes)
router.use('/budgets', budgetRoutes)

export default router
