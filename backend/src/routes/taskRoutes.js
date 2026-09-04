import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import validate from '../middleware/validate.js'
import {
    projectTaskParamsSchema,
    createTaskSchema,
    updateTaskSchema,
} from '../schemas/taskSchemas.js'
import {
    getTasks,
    getTaskById,
    createTask,
    updateTask,
    closeTask,
} from '../controllers/taskController.js'
import {
    getTaskEvidence,
    deleteTaskEvidence,
} from '../controllers/evidenciaController.js'

const router = Router({ mergeParams: true })

router.use(requireAuth)

router.get('/', getTasks)
router.get('/:id', validate(projectTaskParamsSchema, 'params'), getTaskById)
router.post('/', validate(createTaskSchema), createTask)
router.put('/:id', validate(projectTaskParamsSchema, 'params'), validate(updateTaskSchema), updateTask)
router.patch('/:id/close', validate(projectTaskParamsSchema, 'params'), closeTask)
router.get('/:id/evidence', validate(projectTaskParamsSchema, 'params'), getTaskEvidence)
router.delete('/:id/evidence/:evidenceId', validate(projectTaskParamsSchema, 'params'), deleteTaskEvidence)

export default router
