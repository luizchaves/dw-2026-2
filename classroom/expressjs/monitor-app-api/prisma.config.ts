import { defineConfig, env } from 'prisma/config';

/**
 * Em teste o CLI lê `.env.test`: é o que faz `npm run db:test` migrar o banco
 * da suíte, e não o de desenvolvimento.
 *
 * O try/catch existe por causa do container: lá não há arquivo `.env` — as
 * variáveis chegam prontas no ambiente do processo, pelo Compose. Sem ele,
 * `loadEnvFile` lança ENOENT e todo comando do Prisma morre antes de começar.
 */
try {
  process.loadEnvFile(process.env.NODE_ENV === 'test' ? '.env.test' : '.env');
} catch {
  // Sem arquivo, segue com o que já estiver em `process.env`.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx src/database/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
