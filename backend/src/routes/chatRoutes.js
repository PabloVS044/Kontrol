import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import {
  getConversations,
  getMessages,
  getCompanyUsers,
} from '../controllers/chatController.js'

const router = Router()
router.use(requireAuth)

router.get('/conversations',           getConversations)
router.get('/conversations/:id/messages', getMessages)
router.get('/users',                   getCompanyUsers)

export default router
