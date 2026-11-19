import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';

import app from '@/index.ts';
import {
  createHost,
  createUser,
  missingId,
  request,
  unique,
  type TestUser,
} from '@/test/support.ts';

describe('/api/tags — autenticação', () => {
  const rotas = [
    { method: 'get' as const, path: '/api/tags' },
    { method: 'post' as const, path: '/api/tags' },
    { method: 'get' as const, path: `/api/tags/${missingId()}` },
  ];

  for (const { method, path } of rotas) {
    it(`devolve 401 em ${method.toUpperCase()} ${path} sem token`, async () => {
      const response = await request(app)[method](path);

      assert.equal(response.status, 401);
    });
  }
});

describe('POST /api/tags', () => {
  let user: TestUser;

  before(async () => {
    user = await createUser('tags-create');
  });

  it('cria uma tag com nome e cor', async () => {
    const name = unique('producao');

    const response = await request(app)
      .post('/api/tags')
      .set(user.headers)
      .set('Content-Type', 'application/json')
      .send({ name, color: '#2563eb' });

    assert.equal(response.status, 201);
    assert.equal(response.body.name, name);
    assert.equal(response.body.color, '#2563eb');
    assert.equal(typeof response.body.id, 'string');
  });

  it('recusa nome repetido com 409', async () => {
    const payload = { name: unique('duplicada'), color: '#2563eb' };

    const primeira = await request(app)
      .post('/api/tags')
      .set(user.headers)
      .set('Content-Type', 'application/json')
      .send(payload);

    const segunda = await request(app)
      .post('/api/tags')
      .set(user.headers)
      .set('Content-Type', 'application/json')
      .send(payload);

    assert.equal(primeira.status, 201);
    assert.equal(segunda.status, 409);
    assert.deepEqual(segunda.body, { error: 'Tag already exists' });
  });

  it('recusa cor fora do formato #rrggbb', async () => {
    for (const color of ['azul', '#fff', '2563eb', '#2563eZ']) {
      const response = await request(app)
        .post('/api/tags')
        .set(user.headers)
        .set('Content-Type', 'application/json')
        .send({ name: unique('cor'), color });

      assert.equal(response.status, 400, `esperado 400 para "${color}"`);
      assert.ok(
        response.body.issues.some((issue: { path: string[] }) =>
          issue.path.includes('color'),
        ),
      );
    }
  });

  it('recusa nome com menos de 2 caracteres e campo não declarado', async () => {
    const curto = await request(app)
      .post('/api/tags')
      .set(user.headers)
      .set('Content-Type', 'application/json')
      .send({ name: 'a', color: '#2563eb' });

    const comExtra = await request(app)
      .post('/api/tags')
      .set(user.headers)
      .set('Content-Type', 'application/json')
      .send({ name: unique('tag'), color: '#2563eb', hosts: [] });

    assert.equal(curto.status, 400);
    assert.equal(comExtra.status, 400);
  });

  it('recusa Content-Type diferente de application/json', async () => {
    const response = await request(app)
      .post('/api/tags')
      .set(user.headers)
      .set('Content-Type', 'text/plain')
      .send('name=producao');

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      error: 'Content-Type must be application/json',
    });
  });
});

describe('GET /api/tags', () => {
  it('lista as tags em ordem alfabética', async () => {
    const user = await createUser('tags-list');

    await request(app)
      .post('/api/tags')
      .set(user.headers)
      .set('Content-Type', 'application/json')
      .send({ name: unique('zeta'), color: '#2563eb' });

    const response = await request(app).get('/api/tags').set(user.headers);

    assert.equal(response.status, 200);
    assert.ok(response.body.length > 0);

    const nomes = response.body.map((tag: { name: string }) => tag.name);

    assert.deepEqual(nomes, [...nomes].sort());
  });

  it('é um vocabulário compartilhado: todo usuário vê a mesma lista', async () => {
    const autor = await createUser('tags-autor');
    const outro = await createUser('tags-outro');
    const name = unique('compartilhada');

    await request(app)
      .post('/api/tags')
      .set(autor.headers)
      .set('Content-Type', 'application/json')
      .send({ name, color: '#2563eb' });

    const response = await request(app)
      .get('/api/tags')
      .query({ name })
      .set(outro.headers);

    assert.equal(response.status, 200);
    assert.equal(response.body.length, 1);
    assert.equal(response.body[0].name, name);
  });

  it('filtra por parte do nome', async () => {
    const user = await createUser('tags-filtro');
    const prefixo = unique('banco');

    await request(app)
      .post('/api/tags')
      .set(user.headers)
      .set('Content-Type', 'application/json')
      .send({ name: prefixo, color: '#2563eb' });

    const response = await request(app)
      .get('/api/tags')
      .query({ name: prefixo })
      .set(user.headers);

    assert.equal(response.body.length, 1);
    assert.equal(response.body[0].name, prefixo);
  });

  it('devolve lista vazia quando nada casa com o filtro', async () => {
    const user = await createUser('tags-filtro-vazio');

    const response = await request(app)
      .get('/api/tags')
      .query({ name: unique('inexistente') })
      .set(user.headers);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, []);
  });

  it('inclui a tag criada de passagem no cadastro de um host', async () => {
    const user = await createUser('tags-do-host');
    const name = unique('criada-pelo-host');

    await createHost(user, { tags: [name] });

    const response = await request(app)
      .get('/api/tags')
      .query({ name })
      .set(user.headers);

    assert.equal(response.body.length, 1);
    assert.equal(response.body[0].color, '#64748b');
  });
});

describe('GET /api/tags/:id', () => {
  it('devolve a tag pelo id', async () => {
    const user = await createUser('tags-show');

    const criada = await request(app)
      .post('/api/tags')
      .set(user.headers)
      .set('Content-Type', 'application/json')
      .send({ name: unique('infra'), color: '#0ea5e9' });

    const response = await request(app)
      .get(`/api/tags/${criada.body.id}`)
      .set(user.headers);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, criada.body);
  });

  it('devolve 404 para id que não existe', async () => {
    const user = await createUser('tags-show-404');

    const response = await request(app)
      .get(`/api/tags/${missingId()}`)
      .set(user.headers);

    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { error: 'Tag not found' });
  });

  it('devolve 400 quando o id não é um UUID', async () => {
    const user = await createUser('tags-show-uuid');

    const response = await request(app).get('/api/tags/123').set(user.headers);

    assert.equal(response.status, 400);
    assert.deepEqual(response.body.issues[0].path, ['params', 'id']);
  });
});
