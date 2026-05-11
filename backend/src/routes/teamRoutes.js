import { Router } from 'express'
import {
  addTeamMember,
  assignTeamProject,
  createTeam,
  deleteTeam,
  getTeamsContext,
  listTeams,
  removeTeamMember,
  removeTeamProject,
  updateTeam,
} from '../controllers/teamController.js'
import requireAuth from '../middleware/requireAuth.js'
import requireCompany from '../middleware/requireCompany.js'
import requireCompanyRole from '../middleware/requireCompanyRole.js'
import validate from '../middleware/validate.js'
import {
  teamMemberParamSchema,
  teamParamSchema,
  teamProjectParamSchema,
  teamSchema,
} from '../schemas/teamSchema.js'

const router = Router()
const canManageTeams = requireCompanyRole('owner', 'admin', 'manager')

router.use(requireAuth, requireCompany, canManageTeams)

router.get('/context', getTeamsContext)
router.get('/', listTeams)
router.post('/', validate(teamSchema), createTeam)
router.put('/:teamId', validate(teamParamSchema, 'params'), validate(teamSchema), updateTeam)
router.delete('/:teamId', validate(teamParamSchema, 'params'), deleteTeam)
router.post('/:teamId/members/:userId', validate(teamMemberParamSchema, 'params'), addTeamMember)
router.delete('/:teamId/members/:userId', validate(teamMemberParamSchema, 'params'), removeTeamMember)
router.post('/:teamId/projects/:projectId', validate(teamProjectParamSchema, 'params'), assignTeamProject)
router.delete('/:teamId/projects/:projectId', validate(teamProjectParamSchema, 'params'), removeTeamProject)

export default router
