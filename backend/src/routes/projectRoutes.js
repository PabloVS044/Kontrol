import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireRole from '../middleware/requireRole.js'
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from '../controllers/projectController.js'

const router = Router()

router.get('/', requireAuth, getProjects)
router.get('/:id', requireAuth, getProjectById)
router.post('/', requireAuth, requireRole('admin', 'manager'), createProject)
router.put('/:id', requireAuth, requireRole('admin', 'manager'), updateProject)
router.delete('/:id', requireAuth, requireRole('admin'), deleteProject)

export default router
