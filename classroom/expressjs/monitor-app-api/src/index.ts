import { pathToFileURL } from 'node:url';

import express from 'express';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import swaggerSpec from '@/docs/swagger.ts';
import { errorHandler, notFoundHandler } from '@/middlewares/errorHandlers.ts';
import authRoutes from '@/routes/auth.routes.ts';
import hostRoutes from '@/routes/hosts.routes.ts';
import pingRoutes from '@/routes/pings.routes.ts';
import tagRoutes from '@/routes/tags.routes.ts';
import userRoutes from '@/routes/users.routes.ts';
import { startMonitor } from '@/services/monitor.ts';

const app = express();

// Nos testes o log de cada requisição só polui a saída do test runner.
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.use(express.json());

/**
 * A especificação crua, para importar em outras ferramentas (Insomnia,
 * Postman, geradores de cliente).
 */
app.get('/api/docs.json', (_req, res) => {
  res.json(swaggerSpec);
});

/**
 * A documentação interativa.
 *
 * Vem antes das rotas da API só por organização — `/api/docs` não colide com
 * nenhuma delas. `persistAuthorization` mantém o token entre recarregamentos
 * da página, para não precisar colar de novo a cada teste.
 */
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Monitor App API',
    swaggerOptions: { persistAuthorization: true },
  }),
);

app.use('/api', userRoutes);
app.use('/api', authRoutes);
app.use('/api', hostRoutes);
app.use('/api', pingRoutes);
app.use('/api', tagRoutes);

app.use(notFoundHandler);

app.use(errorHandler);

/**
 * Só sobe o servidor quando este arquivo é o ponto de entrada do processo.
 *
 * É o que permite `import app from '@/index.ts'` nos testes: o supertest
 * precisa do `app` montado, mas não de uma porta ocupada nem do agendador
 * medindo hosts no meio da suíte.
 */
const isMainModule =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  app.listen(3000, () => {
    console.log('Monitor API listening on port 3000');

    // O agendador sobe depois do servidor: a API responde mesmo que a primeira
    // rodada de medições ainda esteja em curso.
    startMonitor();
  });
}

export default app;
