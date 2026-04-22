import { z } from 'zod'

const positiveProjectId = z.coerce.number().int().positive('The project id must be valid.')
const positiveAmount = z.number().nonnegative('The amount cannot be negative.')
const activityNameSchema = z.string().min(3, 'The activity name must contain at least 3 characters.').max(200)

export const expenseSchema = z.union([
  z.object({
    projectId: positiveProjectId,
    activityName: activityNameSchema,
    expenseAmount: positiveAmount,
  }),
  z.object({
    id_proyecto: positiveProjectId,
    nombre_actividad: activityNameSchema,
    monto_gasto: positiveAmount,
  }).transform((data) => ({
    projectId: data.id_proyecto,
    activityName: data.nombre_actividad,
    expenseAmount: data.monto_gasto,
  })),
])

export const getActivitiesQuerySchema = z.union([
  z.object({
    projectId: positiveProjectId.optional(),
  }),
  z.object({
    id_proyecto: positiveProjectId.optional(),
  }).transform((data) => ({
    projectId: data.id_proyecto,
  })),
])

export const activityIdParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'The id must be a positive integer.' }),
})

export const projectIdParamSchema = z.union([
  z.object({
    projectId: positiveProjectId,
  }),
  z.object({
    id_proyecto: positiveProjectId,
  }).transform((data) => ({
    projectId: data.id_proyecto,
  })),
])

export const createActivitySchema = z.union([
  z.object({
    nombre: z.string().min(1, 'Name is required.').max(200),
    monto_planificado: z.number().min(0, 'The planned amount cannot be negative.'),
    monto_real: z.number().min(0, 'The actual amount cannot be negative.').nullable().optional(),
    projectId: positiveProjectId,
  }),
  z.object({
    nombre: z.string().min(1, 'Name is required.').max(200),
    monto_planificado: z.number().min(0, 'The planned amount cannot be negative.'),
    monto_real: z.number().min(0, 'The actual amount cannot be negative.').nullable().optional(),
    id_proyecto: positiveProjectId,
  }).transform((data) => ({
    nombre: data.nombre,
    monto_planificado: data.monto_planificado,
    monto_real: data.monto_real,
    projectId: data.id_proyecto,
  })),
])

export const updateActivitySchema = z
  .object({
    nombre: z.string().min(1).max(200).optional(),
    monto_planificado: z.number().min(0, 'The planned amount cannot be negative.').optional(),
    monto_real: z.number().min(0, 'The actual amount cannot be negative.').nullable().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'No fields were provided for update.' }
  )
