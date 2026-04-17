import { Router } from 'express'
import { z } from 'zod'
import requireAuth from '../middleware/requireAuth.js'
import validate from '../middleware/validate.js'
import { createEmpresa, getMisEmpresas } from '../controllers/empresaController.js'

const createEmpresaSchema = z.object({
  nombre:    z.string().min(1, 'nombre es requerido.').max(255),
  industria: z.string().max(100).optional(),
  telefono:  z.string().max(20).optional(),
  direccion: z.string().optional(),
})

const router = Router()

router.get('/mis-empresas', requireAuth, getMisEmpresas)
router.post('/', requireAuth, validate(createEmpresaSchema), createEmpresa)

export default router
