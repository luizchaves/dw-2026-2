import { z } from 'zod';

/**
 * No login a senha não tem mínimo: uma senha antiga e curta deve receber 401
 * ("credenciais inválidas"), e não 422 ("dado inválido").
 */
const signinBody = z.strictObject({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  password: z.string().min(1, 'A senha é obrigatória'),
});

/** `Bearer ` seguido dos três segmentos base64url de um JWT. */
const JWT = /^[\w-]+\.[\w-]+\.[\w-]+$/;

export const bearerSchema = z.object({
  headers: z.object({
    authorization: z
      .string({ error: 'Token not provided' })
      .regex(
        /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/,
        'O cabeçalho deve ter o formato `Authorization: Bearer <token>`',
      ),
  }),
});

/** Sessão por cookie. Nenhuma rota usa ainda, mas o formato já está descrito. */
export const cookieSessionSchema = z.object({
  cookies: z.object({
    token: z.string().regex(JWT, 'Cookie de sessão inválido'),
  }),
});

export const signinSchema = z.object({ body: signinBody });

export type SigninBody = z.infer<typeof signinBody>;
