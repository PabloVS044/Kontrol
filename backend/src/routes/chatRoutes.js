import { createRouter } from '../middleware/asyncHandler.js'
import requireAuth from '../middleware/requireAuth.js'
import {
  getConversations,
  getMessages,
  getCompanyUsers,
} from '../controllers/chatController.js'

const router = createRouter()
router.use(requireAuth)

router.get('/conversations',           getConversations)
router.get('/conversations/:id/messages', getMessages)
router.get('/users',                   getCompanyUsers)

export default router
