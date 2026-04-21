import { z } from 'zod'

export const PROJECT_PROGRESS_ENTRY_TYPES = ['UPDATE', 'MILESTONE', 'BLOCKER']

const progressPercentageSchema = z.coerce
  .number()
  .min(0, 'Progress percentage cannot be negative.')
  .max(100, 'Progress percentage cannot exceed 100.')

const happenedAtSchema = z.string().min(1, 'The date of the update is required.').optional()

export const projectProgressEntryParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'The project id must be a positive integer.' }),
  entryId: z.coerce.number().int().positive({ message: 'The progress entry id must be a positive integer.' }),
})

export const createProjectProgressEntrySchema = z.object({
  title: z.string().min(1, 'Title is required.').max(200),
  details: z.string().max(5000).optional(),
  updateType: z.enum(PROJECT_PROGRESS_ENTRY_TYPES, {
    message: `Update type must be one of: ${PROJECT_PROGRESS_ENTRY_TYPES.join(', ')}.`,
  }).optional().default('UPDATE'),
  progressPercentage: progressPercentageSchema,
  happenedAt: happenedAtSchema,
})

export const updateProjectProgressEntrySchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    details: z.string().max(5000).nullable().optional(),
    updateType: z.enum(PROJECT_PROGRESS_ENTRY_TYPES, {
      message: `Update type must be one of: ${PROJECT_PROGRESS_ENTRY_TYPES.join(', ')}.`,
    }).optional(),
    progressPercentage: progressPercentageSchema.optional(),
    happenedAt: happenedAtSchema,
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'No fields were provided for update.' }
  )
