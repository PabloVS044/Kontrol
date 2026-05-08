import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireCompany from '../middleware/requireCompany.js'
import requireCompanyRole from '../middleware/requireCompanyRole.js'
import {
  getReports,
  getReportById,
  createReport,
  updateReport,
  deleteReport,
  getCompanySummary,
} from '../controllers/reportsController.js'

const router = Router()

router.use(requireAuth, requireCompany)

router.get('/summary', getCompanySummary)
router.get('/', getReports)
router.get('/:id', getReportById)
router.post('/', requireCompanyRole('owner', 'admin', 'manager'), createReport)
router.put('/:id', requireCompanyRole('owner', 'admin', 'manager'), updateReport)
router.delete('/:id', requireCompanyRole('owner', 'admin'), deleteReport)

export default router
