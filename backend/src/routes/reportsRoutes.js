import { Router } from "express";
import requireAuth from '../middleware/requireAuth.js'
import requireRole from '../middleware/requireRole.js'
import { getReports, getReportById, createReport, updateReport, deleteReport } from "../controllers/reportsController.js";

const router = Router()
router.use(requireAuth)

router.get("/", getReports)
router.get("/:id", getReportById)
router.post("/", requireRole('admin', 'manager', 'collaborator'), createReport)
router.put("/:id", requireRole('admin', 'manager'), updateReport)
router.delete("/:id", requireRole('admin'), deleteReport)

export default router