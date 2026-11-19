import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import app from '@/index.ts';
import { createHost, createUser, missingId, request } from '@/test/support.ts';

describe('POST /api/hosts/:id/pings', () => {
  it('mede o host e devolve 201 com a medição gravada', async () => {
    const user = await createUser('ping-check');
    // `127.0.0.1` responde sem depender da rede da máquina que roda a suíte.
    const host = await createHost(user, { address: '127.0.0.1' });

    const response = await request(app)
      .post(`/api/hosts/${host.id}/pings`)
      .set(user.headers);

    assert.equal(response.status, 201);
    assert.equal(response.body.hostId, host.id);
    assert.equal(response.body.success, true);
    assert.equal(typeof response.body.latency, 'number');
    assert.equal(typeof response.body.createdAt, 'string');
  });

  it('grava também a falha, com latency nula', async () => {
    const user = await createUser('ping-falha');
    const host = await createHost(user, { address: 'nao-existe-xyz.invalid' });

    const response = await request(app)
      .post(`/api/hosts/${host.id}/pings`)
      .set(user.headers);

    // É isso que transforma o histórico num registro de disponibilidade, e não
    // numa lista de sucessos: a falha também é um dado.
    assert.equal(response.status, 201);
    assert.equal(response.body.success, false);
    assert.equal(response.body.latency, null);
  });

  it('a medição aparece no histórico logo depois', async () => {
    const user = await createUser('ping-historico');
    const host = await createHost(user);

    const medicao = await request(app)
      .post(`/api/hosts/${host.id}/pings`)
      .set(user.headers);

    const historico = await request(app)
      .get(`/api/hosts/${host.id}/pings`)
      .set(user.headers);

    assert.equal(historico.status, 200);
    assert.equal(historico.body.length, 1);
    assert.equal(historico.body[0].id, medicao.body.id);
  });

  it('não exige Content-Type: a medição não tem corpo', async () => {
    const user = await createUser('ping-sem-corpo');
    const host = await createHost(user);

    const response = await request(app)
      .post(`/api/hosts/${host.id}/pings`)
      .set(user.headers);

    assert.equal(response.status, 201);
  });

  it('devolve 404 para host inexistente ou de outro usuário', async () => {
    const dono = await createUser('ping-dono');
    const intruso = await createUser('ping-intruso');
    const host = await createHost(dono);

    const inexistente = await request(app)
      .post(`/api/hosts/${missingId()}/pings`)
      .set(dono.headers);

    const deOutro = await request(app)
      .post(`/api/hosts/${host.id}/pings`)
      .set(intruso.headers);

    assert.equal(inexistente.status, 404);
    assert.equal(deOutro.status, 404);
    assert.deepEqual(deOutro.body, { error: 'Host not found' });
  });

  it('devolve 401 sem token', async () => {
    const response = await request(app).post(
      `/api/hosts/${missingId()}/pings`,
    );

    assert.equal(response.status, 401);
  });
});

describe('GET /api/hosts/:id/pings', () => {
  it('devolve lista vazia para host sem histórico', async () => {
    const user = await createUser('ping-vazio');
    const host = await createHost(user);

    const response = await request(app)
      .get(`/api/hosts/${host.id}/pings`)
      .set(user.headers);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, []);
  });

  it('devolve as medições da mais recente para a mais antiga', async () => {
    const user = await createUser('ping-ordem');
    const host = await createHost(user);

    for (let i = 0; i < 3; i += 1) {
      await request(app).post(`/api/hosts/${host.id}/pings`).set(user.headers);
    }

    const response = await request(app)
      .get(`/api/hosts/${host.id}/pings`)
      .set(user.headers);

    assert.equal(response.body.length, 3);

    const datas = response.body.map((ping: { createdAt: string }) =>
      new Date(ping.createdAt).getTime(),
    );

    assert.deepEqual(datas, [...datas].sort((a, b) => b - a));
  });

  it('respeita o parâmetro limit', async () => {
    const user = await createUser('ping-limit');
    const host = await createHost(user);

    for (let i = 0; i < 3; i += 1) {
      await request(app).post(`/api/hosts/${host.id}/pings`).set(user.headers);
    }

    const response = await request(app)
      .get(`/api/hosts/${host.id}/pings`)
      .query({ limit: 2 })
      .set(user.headers);

    assert.equal(response.status, 200);
    assert.equal(response.body.length, 2);
  });

  it('recusa limit fora da faixa aceita', async () => {
    const user = await createUser('ping-limit-invalido');
    const host = await createHost(user);

    for (const limit of ['0', '-1', '201', 'muitos']) {
      const response = await request(app)
        .get(`/api/hosts/${host.id}/pings`)
        .query({ limit })
        .set(user.headers);

      assert.equal(response.status, 400, `esperado 400 para limit=${limit}`);
      assert.equal(response.body.error, 'Validation error');
    }
  });

  it('devolve 404 para o host de outro usuário', async () => {
    const dono = await createUser('ping-hist-dono');
    const intruso = await createUser('ping-hist-intruso');
    const host = await createHost(dono);

    await request(app).post(`/api/hosts/${host.id}/pings`).set(dono.headers);

    const response = await request(app)
      .get(`/api/hosts/${host.id}/pings`)
      .set(intruso.headers);

    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { error: 'Host not found' });
  });

  it('devolve 400 quando o id não é um UUID', async () => {
    const user = await createUser('ping-uuid');

    const response = await request(app)
      .get('/api/hosts/123/pings')
      .set(user.headers);

    assert.equal(response.status, 400);
    assert.deepEqual(response.body.issues[0].path, ['params', 'id']);
  });

  it('as medições do host aparecem no detalhe do host', async () => {
    const user = await createUser('ping-no-host');
    const host = await createHost(user);

    await request(app).post(`/api/hosts/${host.id}/pings`).set(user.headers);

    const response = await request(app)
      .get(`/api/hosts/${host.id}`)
      .set(user.headers);

    assert.equal(response.body.pings.length, 1);
    assert.equal(response.body.pings[0].hostId, host.id);
  });
});
