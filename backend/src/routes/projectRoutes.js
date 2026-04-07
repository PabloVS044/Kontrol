import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireRole from '../middleware/requireRole.js'
import validate from '../middleware/validate.js'
import {
  getProjectsQuerySchema,
  projectIdParamSchema,
  createProjectSchema,
  updateProjectSchema,
} from '../schemas/projectSchemas.js'
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from '../controllers/projectController.js'

const router = Router()

router.get('/', requireAuth, validate(getProjectsQuerySchema, 'query'), getProjects)
router.get('/:id', requireAuth, validate(projectIdParamSchema, 'params'), getProjectById)
router.post('/', requireAuth, requireRole('admin', 'manager'), validate(createProjectSchema), createProject)
router.put('/:id', requireAuth, requireRole('admin', 'manager'), validate(projectIdParamSchema, 'params'), validate(updateProjectSchema), updateProject)
router.delete('/:id', requireAuth, requireRole('admin'), validate(projectIdParamSchema, 'params'), deleteProject)

export default router
