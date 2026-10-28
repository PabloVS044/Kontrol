import { createRouter } from '../middleware/asyncHandler.js'
import requireAuth from '../middleware/requireAuth.js'
import requireCompany from '../middleware/requireCompany.js'
import validate from '../middleware/validate.js'
import requirePlanFeature from '../middleware/requirePlanFeature.js'
import { FEATURES } from '../billing/plans.js'
import { agentChatLimiter } from '../middleware/rateLimit.js'
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

const router = createRouter()

// PAY-1 — Birdie (agente de IA) es un módulo del plan Business.
const withCompany = [requireCompany, requirePlanFeature(FEATURES.AI_AGENT)]

router.use(requireAuth)

router.get('/status', status)

// Conversation history (scoped to current company)
router.get('/conversations', ...withCompany, listConversations)
router.get('/conversations/:id/messages', ...withCompany, getConversationMessages)
router.delete('/conversations/:id', ...withCompany, deleteConversation)

// Per-message actions
router.patch('/messages/:id', ...withCompany, validate(agentUpdateMessageSchema), updateMessage)
router.delete('/messages/:id', ...withCompany, deleteMessage)

// Main chat endpoint
router.post('/chat', agentChatLimiter, ...withCompany, validate(agentChatSchema), chat)

export default router
