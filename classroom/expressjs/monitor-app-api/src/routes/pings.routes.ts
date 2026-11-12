import { Router } from 'express';

import PingController from '@/controllers/pings.controller.ts';

const router = Router();

router.get('/hosts/:id/pings', PingController.readByHost);

export default router;
