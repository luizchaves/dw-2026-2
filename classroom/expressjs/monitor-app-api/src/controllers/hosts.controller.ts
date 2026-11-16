import type { Request, Response } from 'express';

import HttpError from '@/errors/HttpError.ts';
import { validated } from '@/middlewares/validate.ts';
import Host from '@/models/Host.ts';
import {
  createHostSchema,
  readHostsSchema,
  removeHostSchema,
  showHostSchema,
  updateHostSchema,
} from '@/schemas/host.schema.ts';

async function create(req: Request, res: Response) {
  const { body } = validated(req, createHostSchema);

  try {
    // `req.userId` é o dono: o cliente não escolhe de quem é o host.
    const createdHost = await Host.create({ ...body, userId: req.userId as string });

    return res.status(201).json(createdHost);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      throw new HttpError('Host já cadastrado com esse nome', 409);
    }

    throw new HttpError('Unable to create host', 400);
  }
}

async function read(req: Request, res: Response) {
  const { query } = validated(req, readHostsSchema);

  return res.json(await Host.read({ ...query, userId: req.userId as string }));
}

async function readById(req: Request, res: Response) {
  const { params } = validated(req, showHostSchema);

  try {
    return res.json(await Host.readById(params.id, req.userId as string));
  } catch {
    throw new HttpError('Host not found', 404);
  }
}

async function update(req: Request, res: Response) {
  const { params, body } = validated(req, updateHostSchema);

  try {
    const updatedHost = await Host.update({
      ...body,
      id: params.id,
      userId: req.userId as string,
    });

    return res.json(updatedHost);
  } catch (error) {
    if (error instanceof Error && error.message === 'Host not found') {
      throw new HttpError('Host not found', 404);
    }

    if (error instanceof Error && error.message.includes('Unique constraint')) {
      throw new HttpError('Host já cadastrado com esse nome', 409);
    }

    throw new HttpError('Unable to update host', 400);
  }
}

async function remove(req: Request, res: Response) {
  const { params } = validated(req, removeHostSchema);

  try {
    await Host.remove(params.id, req.userId as string);

    return res.sendStatus(204);
  } catch {
    throw new HttpError('Host not found', 404);
  }
}

export default { create, read, readById, update, remove };
