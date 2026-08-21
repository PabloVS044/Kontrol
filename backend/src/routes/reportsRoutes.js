import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireCompany from '../middleware/requireCompany.js'
import requireCompanyRole from '../middleware/requireCompanyRole.js'
import validate from '../middleware/validate.js'
import {
  createReportSchema,
  updateReportSchema,
  registerExportSchema,
  reportIdParamSchema,
} from '../schemas/reportsSchemas.js'
import {
  getReports,
  getReportById,
  createReport,
  updateReport,
  deleteReport,
  getCompanySummary,
  registerReportExport,
} from '../controllers/reportsController.js'

const router = Router()

router.use(requireAuth, requireCompany)

router.get('/summary', getCompanySummary)
router.get('/', getReports)
// Exporting is a read of data the user can already see, so it is not gated
// behind the management roles that creating/editing a report requires.
router.post('/exports', validate(registerExportSchema), registerReportExport)
router.get('/:id', validate(reportIdParamSchema, 'params'), getReportById)
router.post('/', requireCompanyRole('owner', 'admin', 'manager'), validate(createReportSchema), createReport)
router.put('/:id', requireCompanyRole('owner', 'admin', 'manager'), validate(reportIdParamSchema, 'params'), validate(updateReportSchema), updateReport)
router.delete('/:id', requireCompanyRole('owner', 'admin'), validate(reportIdParamSchema, 'params'), deleteReport)

export default router
