import type { NextFunction, Request, Response } from 'express';

import HttpError from '@/errors/HttpError.ts';
import User from '@/models/User.ts';

/**
 * Autorização: descobre *o que* quem está chamando pode fazer.
 *
 * Sem token é 401 ("identifique-se"); com token e sem permissão é 403 ("sei
 * quem você é, e ainda assim não pode").
 *
 * O perfil vem do banco, e não do token: um usuário rebaixado perde o acesso
 * na hora, sem esperar o token antigo expirar.
 */
export const requireRole =
  (...roles: string[]) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.userId) {
      throw new HttpError('Token not provided', 401);
    }

    const user = await User.readById(req.userId).catch(() => {
      throw new HttpError('Token invalid', 401);
    });

    if (!roles.includes(user.role)) {
      throw new HttpError('Acesso não permitido para o seu perfil', 403);
    }

    next();
  };
