import { z } from 'zod';

export const expenseSchema = z.object({
  id_proyecto: z.number().int().positive(),
  nombre_actividad: z.string().min(3),
  monto_gasto: z.number().nonnegative(),
});