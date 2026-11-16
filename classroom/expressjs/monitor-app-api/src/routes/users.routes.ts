import { Router } from 'express';

import UserController from '@/controllers/users.controller.ts';
import { isAuthenticated } from '@/middlewares/isAuthenticated.ts';
import { requireJsonContentType as requireJson } from '@/middlewares/requireJsonContentType.ts';
import { validate } from '@/middlewares/validate.ts';
import { createUserSchema } from '@/schemas/user.schema.ts';

const router = Router();

// Pública: quem se cadastra ainda não tem conta.
router.post('/users', requireJson, validate(createUserSchema), UserController.create);

router.get('/users/me', isAuthenticated, UserController.me);

export default router;
