import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import validate from '../middleware/validate.js'
import {
    projectTareaParamsSchema,
    tareaIdParamSchema,
    createTareaSchema,
    updateTareaSchema,
} from '../schemas/tareaSchemas.js'
import {
    getTareas,
    getTareaById,
    createTarea,
    updateTarea,
    cerrarTarea,
} from '../controllers/tareaController.js'

const router = Router({ mergeParams: true })

router.use(requireAuth)

router.get('/', getTareas)
router.get('/:id', validate(projectTareaParamsSchema, 'params'), getTareaById)
router.post('/', validate(createTareaSchema), createTarea)
router.put('/:id', validate(projectTareaParamsSchema, 'params'), validate(updateTareaSchema), updateTarea)
router.patch('/:id/cerrar', validate(projectTareaParamsSchema, 'params'), cerrarTarea)

export default router
