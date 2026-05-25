import { z } from 'zod'

export const saveIntegrationSchema = z.object({
  credentials: z.record(z.string(), z.string()).optional().default({}),
  config: z.record(z.string(), z.any()).optional().default({}),
})

export const toggleIntegrationSchema = z.object({
  status: z.enum(['active', 'inactive']),
})
