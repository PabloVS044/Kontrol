import { z } from 'zod';

export const teamSchema = z.object({
  nombre: z.string().min(3, "Team name is too short"),
  descripcion: z.string().optional(),
  id_lider: z.number().int().positive()
});