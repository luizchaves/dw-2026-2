import type { Request, Response } from 'express';

import HttpError from '@/errors/HttpError.ts';
import { validated } from '@/middlewares/validate.ts';
import Tag from '@/models/Tag.ts';
import {
  createTagSchema,
  readTagsSchema,
  showTagSchema,
} from '@/schemas/tag.schema.ts';

async function create(req: Request, res: Response) {
  const { body } = validated(req, createTagSchema);

  try {
    return res.status(201).json(await Tag.create(body));
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      throw new HttpError('Tag already exists', 409);
    }

    throw new HttpError('Unable to create tag', 400);
  }
}

async function read(req: Request, res: Response) {
  const { query } = validated(req, readTagsSchema);

  return res.json(await Tag.read(query));
}

async function readById(req: Request, res: Response) {
  const { params } = validated(req, showTagSchema);

  try {
    return res.json(await Tag.readById(params.id));
  } catch {
    throw new HttpError('Tag not found', 404);
  }
}

export default { create, read, readById };
