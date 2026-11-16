import type { Request, Response } from 'express';

import HttpError from '@/errors/HttpError.ts';
import { validated } from '@/middlewares/validate.ts';
import User from '@/models/User.ts';
import { signinSchema } from '@/schemas/auth.schema.ts';
import { signJwt } from '@/utils/jwt.ts';

async function signin(req: Request, res: Response) {
  const { body } = validated(req, signinSchema);

  const auth = await User.authenticate(body.email, body.password);

  /**
   * A mesma resposta para e-mail inexistente e senha errada.
   *
   * Distinguir os dois casos entrega ao atacante uma lista de e-mails
   * cadastrados — a resposta precisa ser indistinguível.
   */
  if (!auth) {
    throw new HttpError('Invalid credentials', 401);
  }

  const token = signJwt({
    sub: auth.id,
    name: auth.name,
    email: auth.email,
    role: auth.role,
  });

  return res.json({ auth, token });
}

export default { signin };
