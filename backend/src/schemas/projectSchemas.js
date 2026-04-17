import { z } from 'zod'

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
