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

describe('/api/hosts — autenticação', () => {
  // O `router.use(isAuthenticated)` vale para o router inteiro; o teste
  // percorre todos os métodos para garantir que nenhum escapou.
  const rotas = [
    { method: 'get' as const, path: '/api/hosts' },
    { method: 'post' as const, path: '/api/hosts' },
    { method: 'get' as const, path: `/api/hosts/${missingId()}` },
    { method: 'put' as const, path: `/api/hosts/${missingId()}` },
    { method: 'delete' as const, path: `/api/hosts/${missingId()}` },
  ];

  for (const { method, path } of rotas) {
    it(`devolve 401 em ${method.toUpperCase()} ${path} sem token`, async () => {
      const response = await request(app)[method](path);

      assert.equal(response.status, 401);
      assert.deepEqual(response.body, { error: 'Token not provided' });
    });
  }

  it('devolve 401 para token inválido', async () => {
    const response = await request(app)
      .get('/api/hosts')
      .set('Authorization', 'Bearer abc.def.ghi');

    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { error: 'Token invalid' });
  });
});

describe('POST /api/hosts', () => {
  let user: TestUser;

  before(async () => {
    user = await createUser('hosts-create');
  });

  it('cria um host e devolve 201 com o dono vindo do token', async () => {
    const name = unique('Host');

    const response = await request(app)
      .post('/api/hosts')
      .set(user.headers)
      .set('Content-Type', 'application/json')
      .send({ name, address: '127.0.0.1' });

    assert.equal(response.status, 201);
    assert.equal(response.body.name, name);
    assert.equal(response.body.address, '127.0.0.1');
    assert.equal(response.body.userId, user.id);
    assert.deepEqual(response.body.tags, []);
    assert.deepEqual(response.body.pings, []);
    assert.equal(typeof response.body.id, 'string');
  });

  it('ignora o userId enviado no corpo — o dono é o do token', async () => {
    const outro = await createUser('hosts-dono');

    const response = await request(app)
      .post('/api/hosts')
      .set(user.headers)
      .set('Content-Type', 'application/json')
      .send({ name: unique('Host'), address: '127.0.0.1', userId: outro.id });

    // `strictObject` recusa a chave em vez de ignorá-la: o cliente fica sabendo
    // que não manda no dono do recurso.
    assert.equal(response.status, 400);
    assert.equal(response.body.error, 'Validation error');
  });

  it('cria as tags citadas por nome, com uma cor neutra', async () => {
    const tag = unique('tag');

    const response = await request(app)
      .post('/api/hosts')
      .set(user.headers)
      .set('Content-Type', 'application/json')
      .send({ name: unique('Host'), address: '1.1.1.1', tags: [tag] });

    assert.equal(response.status, 201);
    assert.equal(response.body.tags.length, 1);
    assert.equal(response.body.tags[0].name, tag);
    assert.equal(response.body.tags[0].color, '#64748b');
  });

  it('reaproveita uma tag que já existe, em vez de duplicar', async () => {
    const tag = unique('tag-compartilhada');

    const primeiro = await createHost(user, { tags: [tag] });
    const segundo = await createHost(user, { tags: [tag] });

    assert.equal(primeiro.tags[0].id, segundo.tags[0].id);
  });

  it('aceita um nome de domínio como endereço', async () => {
    const response = await request(app)
      .post('/api/hosts')
      .set(user.headers)
      .set('Content-Type', 'application/json')
      .send({ name: unique('Host'), address: 'www.ifpb.edu.br' });

    assert.equal(response.status, 201);
  });

  it('recusa endereço que não é IPv4 nem domínio', async () => {
    // Primeira linha de defesa antes de o endereço virar argumento do `ping`.
    const enderecos = ['nao-e-endereco', '999.999.999.999', '127.0.0.1; rm -rf /'];

    for (const address of enderecos) {
      const response = await request(app)
        .post('/api/hosts')
        .set(user.headers)
        .set('Content-Type', 'application/json')
        .send({ name: unique('Host'), address });

      assert.equal(response.status, 400, `esperado 400 para "${address}"`);
      assert.equal(response.body.error, 'Validation error');
    }
  });

  it('recusa nome com menos de 3 caracteres', async () => {
    const response = await request(app)
      .post('/api/hosts')
      .set(user.headers)
      .set('Content-Type', 'application/json')
      .send({ name: 'ab', address: '127.0.0.1' });

    assert.equal(response.status, 400);
    assert.ok(
      response.body.issues.some((issue: { path: string[] }) =>
        issue.path.includes('name'),
      ),
    );
  });

  it('recusa nome repetido do mesmo usuário com 409', async () => {
    const name = unique('Host-repetido');

    await createHost(user, { name });

    const response = await request(app)
      .post('/api/hosts')
      .set(user.headers)
      .set('Content-Type', 'application/json')
      .send({ name, address: '127.0.0.1' });

    assert.equal(response.status, 409);
    assert.deepEqual(response.body, {
      error: 'Host já cadastrado com esse nome',
    });
  });

  it('permite que dois usuários monitorem hosts de mesmo nome', async () => {
    const outro = await createUser('hosts-mesmo-nome');
    const name = unique('Host-compartilhado');

    const meu = await createHost(user, { name });
    const dele = await createHost(outro, { name });

    assert.equal(meu.name, dele.name);
    assert.notEqual(meu.id, dele.id);
  });

  it('recusa Content-Type diferente de application/json', async () => {
    const response = await request(app)
      .post('/api/hosts')
      .set(user.headers)
      .set('Content-Type', 'text/plain')
      .send('name=Host');

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      error: 'Content-Type must be application/json',
    });
  });
});

describe('GET /api/hosts', () => {
  it('lista apenas os hosts do usuário autenticado', async () => {
    const user = await createUser('hosts-list');
    const outro = await createUser('hosts-list-outro');

    const meu = await createHost(user);
    const dele = await createHost(outro);

    const response = await request(app).get('/api/hosts').set(user.headers);

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(response.body));

    const ids = response.body.map((host: { id: string }) => host.id);

    assert.ok(ids.includes(meu.id));
    assert.ok(!ids.includes(dele.id));
  });

  it('devolve lista vazia para quem ainda não cadastrou nada', async () => {
    const novo = await createUser('hosts-vazio');

    const response = await request(app).get('/api/hosts').set(novo.headers);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, []);
  });

  it('filtra por parte do nome', async () => {
    const user = await createUser('hosts-filtro-nome');
    const alvo = await createHost(user, { name: unique('Roteador') });

    await createHost(user, { name: unique('Switch') });

    const response = await request(app)
      .get('/api/hosts')
      .query({ name: 'Roteador' })
      .set(user.headers);

    assert.equal(response.status, 200);
    assert.equal(response.body.length, 1);
    assert.equal(response.body[0].id, alvo.id);
  });

  it('filtra por tag', async () => {
    const user = await createUser('hosts-filtro-tag');
    const tag = unique('producao');

    const alvo = await createHost(user, { tags: [tag] });

    await createHost(user, { tags: [unique('homologacao')] });

    const response = await request(app)
      .get('/api/hosts')
      .query({ tag })
      .set(user.headers);

    assert.equal(response.status, 200);
    assert.equal(response.body.length, 1);
    assert.equal(response.body[0].id, alvo.id);
  });

  it('combina os filtros de nome e tag', async () => {
    const user = await createUser('hosts-filtro-combinado');
    const tag = unique('infra');
    const name = unique('Servidor');

    const alvo = await createHost(user, { name, tags: [tag] });

    // Mesma tag, outro nome.
    await createHost(user, { tags: [tag] });

    const response = await request(app)
      .get('/api/hosts')
      .query({ name, tag })
      .set(user.headers);

    assert.equal(response.body.length, 1);
    assert.equal(response.body[0].id, alvo.id);
  });

  it('ignora parâmetros de query que o schema não declara', async () => {
    const user = await createUser('hosts-query-extra');

    await createHost(user);

    // A query não é estrita de propósito: `utm_source` de um proxy ou de um
    // cliente não deveria derrubar a rota.
    const response = await request(app)
      .get('/api/hosts')
      .query({ utm_source: 'newsletter' })
      .set(user.headers);

    assert.equal(response.status, 200);
    assert.equal(response.body.length, 1);
  });
});

describe('GET /api/hosts/:id', () => {
  it('devolve o host com tags e as medições recentes', async () => {
    const user = await createUser('hosts-show');
    const tag = unique('tag');
    const host = await createHost(user, { tags: [tag] });

    const response = await request(app)
      .get(`/api/hosts/${host.id}`)
      .set(user.headers);

    assert.equal(response.status, 200);
    assert.equal(response.body.id, host.id);
    assert.equal(response.body.tags[0].name, tag);
    assert.ok(Array.isArray(response.body.pings));
  });

  it('devolve 404 para id que não existe', async () => {
    const user = await createUser('hosts-show-404');

    const response = await request(app)
      .get(`/api/hosts/${missingId()}`)
      .set(user.headers);

    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { error: 'Host not found' });
  });

  it('devolve 404 — e não 403 — para o host de outro usuário', async () => {
    const dono = await createUser('hosts-show-dono');
    const intruso = await createUser('hosts-show-intruso');
    const host = await createHost(dono);

    const response = await request(app)
      .get(`/api/hosts/${host.id}`)
      .set(intruso.headers);

    // 403 confirmaria que o recurso existe. 404 não conta nada a quem não é
    // dono.
    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { error: 'Host not found' });
  });

  it('devolve 400 quando o id não é um UUID', async () => {
    const user = await createUser('hosts-show-uuid');

    const response = await request(app)
      .get('/api/hosts/123')
      .set(user.headers);

    assert.equal(response.status, 400);
    assert.equal(response.body.error, 'Validation error');
    assert.deepEqual(response.body.issues[0].path, ['params', 'id']);
  });
});

describe('PUT /api/hosts/:id', () => {
  it('atualiza nome e endereço', async () => {
    const user = await createUser('hosts-update');
    const host = await createHost(user);
    const name = unique('Host-novo');

    const response = await request(app)
      .put(`/api/hosts/${host.id}`)
      .set(user.headers)
      .set('Content-Type', 'application/json')
      .send({ name, address: '1.1.1.1' });

    assert.equal(response.status, 200);
    assert.equal(response.body.id, host.id);
    assert.equal(response.body.name, name);
    assert.equal(response.body.address, '1.1.1.1');
  });

  it('substitui a lista de tags, desfazendo os vínculos antigos', async () => {
    const user = await createUser('hosts-update-tags');
    const antiga = unique('antiga');
    const nova = unique('nova');

    const host = await createHost(user, { tags: [antiga] });

    const response = await request(app)
      .put(`/api/hosts/${host.id}`)
      .set(user.headers)
      .set('Content-Type', 'application/json')
      .send({ name: host.name, address: host.address, tags: [nova] });

    assert.equal(response.status, 200);
    assert.equal(response.body.tags.length, 1);
    assert.equal(response.body.tags[0].name, nova);
  });

  it('remove todas as tags quando a lista vem vazia', async () => {
    const user = await createUser('hosts-update-sem-tags');
    const host = await createHost(user, { tags: [unique('tag')] });

    const response = await request(app)
      .put(`/api/hosts/${host.id}`)
      .set(user.headers)
      .set('Content-Type', 'application/json')
      .send({ name: host.name, address: host.address, tags: [] });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.tags, []);
  });

  it('devolve 404 para o host de outro usuário, sem alterá-lo', async () => {
    const dono = await createUser('hosts-update-dono');
    const intruso = await createUser('hosts-update-intruso');
    const host = await createHost(dono);

    const response = await request(app)
      .put(`/api/hosts/${host.id}`)
      .set(intruso.headers)
      .set('Content-Type', 'application/json')
      .send({ name: unique('Invadido'), address: '1.1.1.1' });

    assert.equal(response.status, 404);

    const intacto = await request(app)
      .get(`/api/hosts/${host.id}`)
      .set(dono.headers);

    assert.equal(intacto.body.name, host.name);
    assert.equal(intacto.body.address, host.address);
  });

  it('devolve 404 para id que não existe', async () => {
    const user = await createUser('hosts-update-404');

    const response = await request(app)
      .put(`/api/hosts/${missingId()}`)
      .set(user.headers)
      .set('Content-Type', 'application/json')
      .send({ name: unique('Host'), address: '127.0.0.1' });

    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { error: 'Host not found' });
  });

  it('recusa corpo incompleto ou com campo não declarado', async () => {
    const user = await createUser('hosts-update-invalido');
    const host = await createHost(user);

    const semEndereco = await request(app)
      .put(`/api/hosts/${host.id}`)
      .set(user.headers)
      .set('Content-Type', 'application/json')
      .send({ name: unique('Host') });

    const comExtra = await request(app)
      .put(`/api/hosts/${host.id}`)
      .set(user.headers)
      .set('Content-Type', 'application/json')
      .send({ name: unique('Host'), address: '127.0.0.1', userId: user.id });

    assert.equal(semEndereco.status, 400);
    assert.equal(comExtra.status, 400);
  });

  it('devolve 409 ao renomear para o nome de outro host do mesmo dono', async () => {
    const user = await createUser('hosts-update-409');
    const primeiro = await createHost(user);
    const segundo = await createHost(user);

    const response = await request(app)
      .put(`/api/hosts/${segundo.id}`)
      .set(user.headers)
      .set('Content-Type', 'application/json')
      .send({ name: primeiro.name, address: '127.0.0.1' });

    assert.equal(response.status, 409);
    assert.deepEqual(response.body, {
      error: 'Host já cadastrado com esse nome',
    });
  });
});

describe('DELETE /api/hosts/:id', () => {
  it('remove o host e devolve 204 sem corpo', async () => {
    const user = await createUser('hosts-delete');
    const host = await createHost(user);

    const response = await request(app)
      .delete(`/api/hosts/${host.id}`)
      .set(user.headers);

    assert.equal(response.status, 204);
    assert.deepEqual(response.body, {});

    const depois = await request(app)
      .get(`/api/hosts/${host.id}`)
      .set(user.headers);

    assert.equal(depois.status, 404);
  });

  it('apaga o histórico de medições junto (cascade)', async () => {
    const user = await createUser('hosts-delete-cascade');
    const host = await createHost(user);

    await request(app).post(`/api/hosts/${host.id}/pings`).set(user.headers);

    await request(app).delete(`/api/hosts/${host.id}`).set(user.headers);

    // O host some, e com ele o histórico: a rota do histórico passa a 404.
    const historico = await request(app)
      .get(`/api/hosts/${host.id}/pings`)
      .set(user.headers);

    assert.equal(historico.status, 404);
  });

  it('devolve 404 para o host de outro usuário, sem removê-lo', async () => {
    const dono = await createUser('hosts-delete-dono');
    const intruso = await createUser('hosts-delete-intruso');
    const host = await createHost(dono);

    const response = await request(app)
      .delete(`/api/hosts/${host.id}`)
      .set(intruso.headers);

    assert.equal(response.status, 404);

    const intacto = await request(app)
      .get(`/api/hosts/${host.id}`)
      .set(dono.headers);

    assert.equal(intacto.status, 200);
  });

  it('devolve 404 ao remover duas vezes', async () => {
    const user = await createUser('hosts-delete-duas');
    const host = await createHost(user);

    await request(app).delete(`/api/hosts/${host.id}`).set(user.headers);

    const segunda = await request(app)
      .delete(`/api/hosts/${host.id}`)
      .set(user.headers);

    assert.equal(segunda.status, 404);
  });
});
