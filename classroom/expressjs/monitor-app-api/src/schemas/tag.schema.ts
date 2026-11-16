import { z } from 'zod';

const createBody = z.strictObject({
  name: z.string().trim().min(2, 'O nome deve ter no mínimo 2 caracteres'),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'A cor deve estar no formato #rrggbb'),
});

const params = z.object({
  id: z.string().uuid('O id deve ser um UUID'),
});

const query = z.object({
  name: z.string().trim().min(1).optional(),
});

export const createTagSchema = z.object({ body: createBody });
export const readTagsSchema = z.object({ query });
export const showTagSchema = z.object({ params });

export type CreateTagBody = z.infer<typeof createBody>;
export type ReadTagsQuery = z.infer<typeof query>;
