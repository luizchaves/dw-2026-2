import type { Request, Response } from 'express';

import HttpError from '@/errors/HttpError.ts';
import { validated } from '@/middlewares/validate.ts';
import User from '@/models/User.ts';
import { createUserSchema } from '@/schemas/user.schema.ts';

async function create(req: Request, res: Response) {
  const { body } = validated(req, createUserSchema);

  // `confirmationPassword` fica de fora: é regra de tela, não de domínio.
  const { confirmationPassword: _confirmation, ...data } = body;

  try {
    // O cadastro não autentica: o usuário criado ainda precisa fazer login.
    return res.status(201).json(await User.create(data));
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      throw new HttpError('Email already exists', 409);
    }

    throw new HttpError('Unable to create user', 400);
  }
}

/** Quem sou eu, segundo o token que acabei de mandar. */
async function me(req: Request, res: Response) {
  try {
    return res.json(await User.readById(req.userId as string));
  } catch {
    throw new HttpError('Token invalid', 401);
  }
}

export default { create, me };
