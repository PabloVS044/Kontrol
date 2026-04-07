import { Router } from 'express'
import userRoutes from './routes/userRoutes.js'
import productoRoutes from './routes/productoRoutes.js'
import proveedorRoutes from './routes/proveedorRoutes.js'
import movimientoRoutes from './routes/movimientoRoutes.js'

const router = Router()

router.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

router.use('/users', userRoutes)
router.use('/productos', productoRoutes)
router.use('/proveedores', proveedorRoutes)
router.use('/movimientos', movimientoRoutes)

export default router
