import { z } from 'zod'
import { PROJECT_PERMISSION_NAMES } from './companySchemas.js'

export const VALID_ESTADOS = ['PLANIFICADO', 'EN_PROGRESO', 'PAUSADO', 'COMPLETADO', 'CANCELADO']

export const getProjectsQuerySchema = z.object({
  page:       z.coerce.number().int().min(1).optional().default(1),
  limit:      z.coerce.number().int().min(1).max(100).optional().default(20),
  estado:     z.enum(VALID_ESTADOS).optional(),
  id_empresa: z.coerce.number().int().positive().optional(),
})

export const projectIdParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'The id must be a positive integer.' }),
})

export const projectMemberParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'The project id must be a positive integer.' }),
  userId: z.coerce.number().int().positive({ message: 'The user id must be a positive integer.' }),
})

export const projectInvitationTokenParamSchema = z.object({
  token: z.string().min(16, 'Invalid invitation token.').max(255),
})

export const updateProjectMemberAccessSchema = z.object({
  permisos: z.array(
    z.enum(PROJECT_PERMISSION_NAMES, {
      message: `Each permission must be one of: ${PROJECT_PERMISSION_NAMES.join(', ')}.`,
    })
  ).optional().default([]),
})

export const upsertProjectInvitationSchema = z.object({
  permisos: z.array(
    z.enum(PROJECT_PERMISSION_NAMES, {
      message: `Each permission must be one of: ${PROJECT_PERMISSION_NAMES.join(', ')}.`,
    })
  ).optional().default([]),
})

export const createProjectSchema = z.object({
  nombre:               z.string().min(1, 'Project name is required.').max(200),
  descripcion:          z.string().optional(),
  fecha_inicio:         z.string().date('Start date must be a valid date (YYYY-MM-DD).'),
  fecha_fin_planificada: z.string().date('Planned end date must be a valid date (YYYY-MM-DD).').optional(),
  presupuesto_total:    z.number().min(0, 'Budget cannot be negative.'),
  estado:               z.enum(VALID_ESTADOS, { message: `Status must be one of: ${VALID_ESTADOS.join(', ')}.` }).optional(),
})

export const updateProjectSchema = z
  .object({
    nombre:              z.string().min(1).max(200).optional(),
    descripcion:         z.string().nullable().optional(),
    fecha_inicio:        z.string().date('Start date must be a valid date (YYYY-MM-DD).').optional(),
    fecha_fin_planificada: z.string().date('Planned end date must be a valid date (YYYY-MM-DD).').nullable().optional(),
    presupuesto_total:   z.number().min(0, 'Budget cannot be negative.').optional(),
    estado:              z.enum(VALID_ESTADOS, { message: `Status must be one of: ${VALID_ESTADOS.join(', ')}.` }).optional(),
    id_encargado:        z.number().int().positive().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'No fields were provided for update.' }
  )
