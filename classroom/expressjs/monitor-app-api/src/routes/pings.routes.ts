import { Router } from 'express';

import PingController from '@/controllers/pings.controller.ts';
import { isAuthenticated } from '@/middlewares/isAuthenticated.ts';
import { validate } from '@/middlewares/validate.ts';
import { readPingsSchema } from '@/schemas/ping.schema.ts';

const router = Router();

router.use(isAuthenticated);

router.get(
  '/hosts/:id/pings',
  validate(readPingsSchema),
  PingController.readByHost,
);

// A rota de medição não tem corpo, então reusa o mesmo schema (params) e
// dispensa o `requireJson`.
router.post(
  '/hosts/:id/pings',
  validate(readPingsSchema),
  PingController.check,
);

export default router;
