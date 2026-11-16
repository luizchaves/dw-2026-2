import { Router } from 'express';

import HostController from '@/controllers/hosts.controller.ts';
import { isAuthenticated } from '@/middlewares/isAuthenticated.ts';
import { requireJsonContentType as requireJson } from '@/middlewares/requireJsonContentType.ts';
import { validate } from '@/middlewares/validate.ts';
import {
  createHostSchema,
  readHostsSchema,
  removeHostSchema,
  showHostSchema,
  updateHostSchema,
} from '@/schemas/host.schema.ts';

const router = Router();

// Aplicado ao router inteiro: nenhuma rota de /hosts é pública, e não existe o
// risco de esquecer o middleware ao acrescentar uma rota nova.
router.use(isAuthenticated);

// A validação entra antes do controller: nenhum dado inválido chega lá dentro.
router.post('/hosts', requireJson, validate(createHostSchema), HostController.create);
router.get('/hosts', validate(readHostsSchema), HostController.read);
router.get('/hosts/:id', validate(showHostSchema), HostController.readById);
router.put('/hosts/:id', requireJson, validate(updateHostSchema), HostController.update);
router.delete('/hosts/:id', validate(removeHostSchema), HostController.remove);

export default router;
