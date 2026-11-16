import { z } from 'zod';

const params = z.object({
  id: z.string().uuid('O id deve ser um UUID'),
});

/**
 * `query` chega sempre como string: `coerce` converte antes de validar, e o
 * `default` garante que o controller receba um número mesmo sem o parâmetro.
 */
const query = z.object({
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export const readPingsSchema = z.object({ params, query });

export type ReadPingsQuery = z.infer<typeof query>;
