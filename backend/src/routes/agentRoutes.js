import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireCompany from '../middleware/requireCompany.js'
import validate from '../middleware/validate.js'
import { agentChatSchema, agentUpdateMessageSchema } from '../schemas/agentSchemas.js'
import {
  chat,
  status,
  listConversations,
  getConversationMessages,
  deleteConversation,
  updateMessage,
  deleteMessage,
} from '../controllers/agentController.js'

const router = Router()

router.use(requireAuth)

router.get('/status', status)

// Conversation history (scoped to current company)
router.get('/conversations', requireCompany, listConversations)
router.get('/conversations/:id/messages', requireCompany, getConversationMessages)
router.delete('/conversations/:id', requireCompany, deleteConversation)

// Per-message actions
router.patch('/messages/:id', requireCompany, validate(agentUpdateMessageSchema), updateMessage)
router.delete('/messages/:id', requireCompany, deleteMessage)

// Main chat endpoint
router.post('/chat', requireCompany, validate(agentChatSchema), chat)

export default router
