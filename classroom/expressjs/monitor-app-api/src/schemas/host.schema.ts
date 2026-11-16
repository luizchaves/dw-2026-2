import { z } from 'zod';

/**
 * O endereço vira argumento de um comando de sistema na etapa do ping real:
 * recusar aqui o que não é IPv4 nem nome de domínio é a primeira linha de
 * defesa, antes do `execFile`.
 */
const address = z
  .string()
  .trim()
  .min(1, 'O endereço é obrigatório')
  .refine(
    (value) =>
      z.ipv4().safeParse(value).success ||
      /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(value),
    'O endereço deve ser um IPv4 ou um nome de domínio',
  );

const createBody = z.strictObject({
  name: z.string().trim().min(3, 'O nome deve ter no mínimo 3 caracteres'),
  address,
  /** Nomes das tags. Uma tag que não existe é criada na hora. */
  tags: z.array(z.string().trim().min(1)).default([]),
});

/**
 * `strictObject` recusa chaves que o schema não declara: um `PUT` com
 * `"userId": "..."` vira 422, em vez de ser silenciosamente ignorado.
 */
const updateBody = createBody;

const params = z.object({
  id: z.string().uuid('O id deve ser um UUID'),
});

/**
 * A query não é estrita de propósito: proxies e clientes acrescentam
 * parâmetros próprios (utm_source, _cache) que não deveriam quebrar a rota.
 */
const query = z.object({
  name: z.string().trim().min(1).optional(),
  tag: z.string().trim().min(1).optional(),
});

export const createHostSchema = z.object({ body: createBody });
export const readHostsSchema = z.object({ query });
export const showHostSchema = z.object({ params });
export const updateHostSchema = z.object({ params, body: updateBody });
export const removeHostSchema = z.object({ params });

export type CreateHostBody = z.infer<typeof createBody>;
export type UpdateHostBody = z.infer<typeof updateBody>;
export type ReadHostsQuery = z.infer<typeof query>;
