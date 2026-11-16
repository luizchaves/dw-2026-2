import type { NextFunction, Request, Response } from 'express';

import HttpError from '@/errors/HttpError.ts';
import { bearerSchema } from '@/schemas/auth.schema.ts';
import { verifyJwt } from '@/utils/jwt.ts';

/**
 * Autenticação: descobre *quem* está chamando.
 *
 * O schema confere a *forma* do cabeçalho `Authorization: Bearer <token>`;
 * `verifyJwt` confere a *confiança* (assinatura e expiração). Os dois falham
 * com 401, e não 400: cabeçalho errado é "identifique-se", não "dado inválido".
 * O schema é chamado aqui dentro, e não como `validate(bearerSchema)` na rota,
 * para que nenhuma rota consiga esquecer a checagem.
 */
export const isAuthenticated = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const parsed = bearerSchema.safeParse({ headers: req.headers });

  if (!parsed.success) {
    throw new HttpError(
      parsed.error.issues[0]?.message ?? 'Token not provided',
      401,
    );
  }

  const token = parsed.data.headers.authorization.slice('Bearer '.length);

  try {
    // Só o `sub` fica no request: o resto do payload não é necessário, e o que
    // importa para as consultas é de quem são os dados.
    req.userId = verifyJwt(token).sub;
  } catch {
    throw new HttpError('Token invalid', 401);
  }

  next();
};
