import { Router } from 'express';

import TagController from '@/controllers/tags.controller.ts';
import { isAuthenticated } from '@/middlewares/isAuthenticated.ts';
import { requireJsonContentType as requireJson } from '@/middlewares/requireJsonContentType.ts';
import { validate } from '@/middlewares/validate.ts';
import {
  createTagSchema,
  readTagsSchema,
  showTagSchema,
} from '@/schemas/tag.schema.ts';

const router = Router();

// As tags são um vocabulário compartilhado entre os usuários, mas só quem está
// autenticado as lê ou cria.
router.use(isAuthenticated);

router.post('/tags', requireJson, validate(createTagSchema), TagController.create);
router.get('/tags', validate(readTagsSchema), TagController.read);
router.get('/tags/:id', validate(showTagSchema), TagController.readById);

export default router;
