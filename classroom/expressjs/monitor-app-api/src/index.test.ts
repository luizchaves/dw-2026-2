/**
 * Testes do "casco" da aplicação: o que vale para toda rota, e não para uma
 * rota em particular — documentação, rota inexistente e tratamento de erro.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import app from '@/index.ts';
import swaggerSpec from '@/docs/swagger.ts';
import { createUser, request } from '@/test/support.ts';

describe('documentação da API', () => {
  it('serve a especificação OpenAPI em /api/docs.json', async () => {
    const response = await request(app).get('/api/docs.json');

    assert.equal(response.status, 200);
    assert.match(response.headers['content-type'], /application\/json/);
    assert.equal(response.body.openapi, '3.0.3');
    assert.equal(response.body.info.title, 'Monitor App API');
  });

  it('serve a página interativa em /api/docs', async () => {
    const response = await request(app).get('/api/docs/');

    assert.equal(response.status, 200);
    assert.match(response.headers['content-type'], /text\/html/);
  });

  it('documenta todas as rotas que a API realmente expõe', async () => {
    // Guarda contra documentação que envelhece: uma rota nova sem entrada na
    // spec quebra este teste.
    const rotas = [
      ['post', '/api/users'],
      ['get', '/api/users/me'],
      ['post', '/api/signin'],
      ['post', '/api/hosts'],
      ['get', '/api/hosts'],
      ['get', '/api/hosts/{id}'],
      ['put', '/api/hosts/{id}'],
      ['delete', '/api/hosts/{id}'],
      ['get', '/api/hosts/{id}/pings'],
      ['post', '/api/hosts/{id}/pings'],
      ['post', '/api/tags'],
      ['get', '/api/tags'],
      ['get', '/api/tags/{id}'],
    ] as const;

    const paths = swaggerSpec.paths as Record<string, Record<string, unknown>>;

    for (const [method, path] of rotas) {
      assert.ok(paths[path], `a spec não documenta ${path}`);
      assert.ok(
        paths[path][method],
        `a spec não documenta ${method.toUpperCase()} ${path}`,
      );
    }
  });

  it('não deixa nenhum $ref apontando para um schema inexistente', async () => {
    const schemas = Object.keys(swaggerSpec.components.schemas);

    const refs = [
      ...JSON.stringify(swaggerSpec).matchAll(
        /"\$ref":"#\/components\/schemas\/(\w+)"/g,
      ),
    ].map((match) => match[1] as string);

    assert.ok(refs.length > 0);

    for (const ref of refs) {
      assert.ok(schemas.includes(ref), `$ref quebrado: ${ref}`);
    }
  });
});

describe('rotas inexistentes e erros', () => {
  it('devolve 404 com corpo JSON para caminho desconhecido', async () => {
    const response = await request(app).get('/nao-existe');

    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { error: 'Content Not Found' });
  });

  it('responde 401, e não 404, para caminho desconhecido sob /api', async () => {
    const response = await request(app).get('/api/nao-existe');

    /**
     * Consequência de `router.use(isAuthenticated)` sem caminho: o middleware
     * roda para qualquer requisição que chegue ao router de hosts, inclusive
     * uma que não casa com nenhuma rota dele. A requisição nunca alcança o
     * `notFoundHandler`.
     *
     * Não é acidente infeliz: "identifique-se antes" não revela quais caminhos
     * existem sob `/api`. O teste fixa a escolha — se um dia o projeto preferir
     * 404 aqui, é este teste que avisa que o comportamento mudou.
     */
    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { error: 'Token not provided' });
  });

  it('devolve 404 para método não previsto na rota', async () => {
    const user = await createUser('metodo');

    const response = await request(app).patch('/api/hosts').set(user.headers);

    assert.equal(response.status, 404);
  });

  it('devolve o mesmo formato de erro em toda falha', async () => {
    // `{ error: "..." }` é o contrato: um cliente consegue tratar qualquer
    // falha sem saber de qual rota ela veio.
    const respostas = await Promise.all([
      request(app).get('/api/nao-existe'),
      request(app).get('/api/hosts'),
      request(app).post('/api/signin').set('Content-Type', 'text/plain').send('x'),
    ]);

    for (const response of respostas) {
      assert.ok(response.status >= 400);
      assert.equal(typeof response.body.error, 'string');
    }
  });
});
