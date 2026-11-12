import { Router } from 'express';

import TagController from '@/controllers/tags.controller.ts';
import { requireJsonContentType as requireJson } from '@/middlewares/requireJsonContentType.ts';

const router = Router();

router.post('/tags', requireJson, TagController.create);
router.get('/tags', TagController.read);
router.get('/tags/:id', TagController.readById);

export default router;
