import { z } from 'zod'
import { PROJECT_PERMISSION_NAMES } from './empresaSchemas.js'

export const VALID_ESTADOS = ['PLANIFICADO', 'EN_PROGRESO', 'PAUSADO', 'COMPLETADO', 'CANCELADO']

export const getProjectsQuerySchema = z.object({
  page:       z.coerce.number().int().min(1).optional().default(1),
  limit:      z.coerce.number().int().min(1).max(100).optional().default(20),
  estado:     z.enum(VALID_ESTADOS).optional(),
  id_empresa: z.coerce.number().int().positive().optional(),
})

export const projectIdParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'El id debe ser un entero positivo.' }),
})

export const projectMemberParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'El id del proyecto debe ser un entero positivo.' }),
  id_usuario: z.coerce.number().int().positive({ message: 'El id del usuario debe ser un entero positivo.' }),
})

export const projectInvitationTokenParamSchema = z.object({
  token: z.string().min(16, 'Token de invitación inválido.').max(255),
})

export const updateProjectMemberAccessSchema = z.object({
  permisos: z.array(
    z.enum(PROJECT_PERMISSION_NAMES, {
      message: `Cada permiso debe ser uno de: ${PROJECT_PERMISSION_NAMES.join(', ')}.`,
    })
  ).optional().default([]),
})

export const upsertProjectInvitationSchema = z.object({
  permisos: z.array(
    z.enum(PROJECT_PERMISSION_NAMES, {
      message: `Cada permiso debe ser uno de: ${PROJECT_PERMISSION_NAMES.join(', ')}.`,
    })
  ).optional().default([]),
})

export const createProjectSchema = z.object({
  nombre:               z.string().min(1, 'nombre es requerido.').max(200),
  descripcion:          z.string().optional(),
  fecha_inicio:         z.string().date('fecha_inicio debe ser una fecha válida (YYYY-MM-DD).'),
  fecha_fin_planificada: z.string().date('fecha_fin_planificada debe ser una fecha válida (YYYY-MM-DD).').optional(),
  presupuesto_total:    z.number().min(0, 'presupuesto_total no puede ser negativo.'),
  estado:               z.enum(VALID_ESTADOS, { message: `estado debe ser uno de: ${VALID_ESTADOS.join(', ')}.` }).optional(),
})

export const updateProjectSchema = z
  .object({
    nombre:              z.string().min(1).max(200).optional(),
    descripcion:         z.string().nullable().optional(),
    fecha_inicio:        z.string().date('fecha_inicio debe ser una fecha válida (YYYY-MM-DD).').optional(),
    fecha_fin_planificada: z.string().date('fecha_fin_planificada debe ser una fecha válida (YYYY-MM-DD).').nullable().optional(),
    presupuesto_total:   z.number().min(0, 'presupuesto_total no puede ser negativo.').optional(),
    estado:              z.enum(VALID_ESTADOS, { message: `estado debe ser uno de: ${VALID_ESTADOS.join(', ')}.` }).optional(),
    id_encargado:        z.number().int().positive().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'No se proporcionaron campos para actualizar.' }
  )
