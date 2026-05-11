import { z } from 'zod'

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(8000),
})

export const agentChatSchema = z.object({
  messages: z.array(messageSchema).min(1).max(40),
  conversationId: z.string().min(1).max(64).optional(),
})

export const agentUpdateMessageSchema = z.object({
  content: z.string().min(1).max(8000),
})
