import type { Request, Response } from 'express';

import HttpError from '@/errors/HttpError.ts';
import { validated } from '@/middlewares/validate.ts';
import Host from '@/models/Host.ts';
import Ping from '@/models/Ping.ts';
import { readPingsSchema } from '@/schemas/ping.schema.ts';

async function readByHost(req: Request, res: Response) {
  const { params, query } = validated(req, readPingsSchema);

  // O host de outro usuário responde 404; um host sem histórico responde `[]`.
  await Host.readById(params.id, req.userId as string).catch(() => {
    throw new HttpError('Host not found', 404);
  });

  return res.json(await Ping.readByHost(params.id, query.limit));
}

/** Medição sob demanda: mede agora e grava, inclusive se o host não responder. */
async function check(req: Request, res: Response) {
  const { params } = validated(req, readPingsSchema);

  try {
    const ping = await Ping.check(params.id, req.userId as string);

    return res.status(201).json(ping);
  } catch {
    throw new HttpError('Host not found', 404);
  }
}

export default { readByHost, check };
