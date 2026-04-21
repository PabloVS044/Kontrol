import { z } from 'zod'

// Schema original (commit a9c8551): registrar un gasto sobre una actividad (por nombre).
export const expenseSchema = z.object({
  id_proyecto:      z.number().int().positive(),
  nombre_actividad: z.string().min(3, 'nombre_actividad debe tener al menos 3 caracteres.').max(200),
  monto_gasto:      z.number().nonnegative('monto_gasto no puede ser negativo.'),
})

// Listado de actividades de presupuesto del proyecto
export const getActividadesQuerySchema = z.object({
  id_proyecto: z.coerce.number().int().positive().optional(),
})

// Params
export const actividadIdParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'El id debe ser un entero positivo.' }),
})

export const proyectoIdParamSchema = z.object({
  id_proyecto: z.coerce.number().int().positive({ message: 'id_proyecto debe ser un entero positivo.' }),
})

// Crear actividad planificada
export const createActividadSchema = z.object({
  nombre:            z.string().min(1, 'nombre es requerido.').max(200),
  monto_planificado: z.number().min(0, 'monto_planificado no puede ser negativo.'),
  monto_real:        z.number().min(0, 'monto_real no puede ser negativo.').nullable().optional(),
  id_proyecto:       z.number().int().positive(),
})

// Actualizar actividad
export const updateActividadSchema = z
  .object({
    nombre:            z.string().min(1).max(200).optional(),
    monto_planificado: z.number().min(0, 'monto_planificado no puede ser negativo.').optional(),
    monto_real:        z.number().min(0, 'monto_real no puede ser negativo.').nullable().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'No se proporcionaron campos para actualizar.' }
  )
