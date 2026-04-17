import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireEmpresa from '../middleware/requireEmpresa.js'
import requireEmpresaRole from '../middleware/requireEmpresaRole.js'
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
import { getProyectsMetrics } from '../controllers/metricasProyectoController.js'

const router = Router()

router.get('/', requireAuth, validate(getProjectsQuerySchema, 'query'), getProjects)
router.get('/:id', requireAuth, validate(projectIdParamSchema, 'params'), getProjectById)
router.post('/', requireAuth, requireRole('admin', 'manager'), validate(createProjectSchema), createProject)
router.put('/:id', requireAuth, requireRole('admin', 'manager'), validate(projectIdParamSchema, 'params'), validate(updateProjectSchema), updateProject)
router.delete('/:id', requireAuth, requireRole('admin'), validate(projectIdParamSchema, 'params'), deleteProject)
router.get("/:id/metrics", getProyectsMetrics)

router.get('/', requireAuth, requireEmpresa, validate(getProjectsQuerySchema, 'query'), getProjects)
router.get('/:id', requireAuth, requireEmpresa, validate(projectIdParamSchema, 'params'), getProjectById)
router.post('/', requireAuth, requireEmpresa, requireEmpresaRole('owner', 'admin', 'manager'), validate(createProjectSchema), createProject)
router.put('/:id', requireAuth, requireEmpresa, requireEmpresaRole('owner', 'admin', 'manager'), validate(projectIdParamSchema, 'params'), validate(updateProjectSchema), updateProject)
router.delete('/:id', requireAuth, requireEmpresa, requireEmpresaRole('owner', 'admin', 'manager'), validate(projectIdParamSchema, 'params'), deleteProject)

export default router
