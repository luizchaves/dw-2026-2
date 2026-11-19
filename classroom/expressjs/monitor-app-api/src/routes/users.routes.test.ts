import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import app from '@/index.ts';
import {
  createUser,
  PASSWORD,
  request,
  unique,
  uniqueEmail,
} from '@/test/support.ts';

describe('POST /api/users', () => {
  it('cadastra um usuário e devolve 201 com os dados públicos', async () => {
    const email = uniqueEmail('cadastro');

    const response = await request(app)
      .post('/api/users')
      .set('Content-Type', 'application/json')
      .send({ name: 'Carla', email, password: PASSWORD });

    assert.equal(response.status, 201);
    assert.equal(response.body.name, 'Carla');
    assert.equal(response.body.email, email);
    assert.equal(response.body.role, 'user');
    assert.equal(typeof response.body.id, 'string');
    assert.equal(typeof response.body.createdAt, 'string');
  });

  it('nunca devolve a senha, nem o hash', async () => {
    const response = await request(app)
      .post('/api/users')
      .set('Content-Type', 'application/json')
      .send({ name: 'Carla', email: uniqueEmail(), password: PASSWORD });

    assert.equal(response.status, 201);
    assert.equal(response.body.password, undefined);
    assert.ok(!JSON.stringify(response.body).includes(PASSWORD));
  });

  it('normaliza o e-mail para minúsculas', async () => {
    const email = uniqueEmail('maiuscula');

    const response = await request(app)
      .post('/api/users')
      .set('Content-Type', 'application/json')
      .send({ name: 'Carla', email: email.toUpperCase(), password: PASSWORD });

    assert.equal(response.status, 201);
    assert.equal(response.body.email, email);
  });

  it('aceita confirmationPassword igual à senha, sem devolvê-la', async () => {
    const response = await request(app)
      .post('/api/users')
      .set('Content-Type', 'application/json')
      .send({
        name: 'Carla',
        email: uniqueEmail(),
        password: PASSWORD,
        confirmationPassword: PASSWORD,
      });

    assert.equal(response.status, 201);
    assert.equal(response.body.confirmationPassword, undefined);
  });

  it('recusa confirmationPassword diferente da senha', async () => {
    const response = await request(app)
      .post('/api/users')
      .set('Content-Type', 'application/json')
      .send({
        name: 'Carla',
        email: uniqueEmail(),
        password: PASSWORD,
        confirmationPassword: 'outra-senha',
      });

    assert.equal(response.status, 400);
    assert.equal(response.body.error, 'Validation error');
    assert.deepEqual(response.body.issues[0].path, [
      'body',
      'confirmationPassword',
    ]);
  });

  it('recusa e-mail já cadastrado com 409', async () => {
    const payload = {
      name: 'Carla',
      email: uniqueEmail('duplicado'),
      password: PASSWORD,
    };

    const first = await request(app)
      .post('/api/users')
      .set('Content-Type', 'application/json')
      .send(payload);

    const second = await request(app)
      .post('/api/users')
      .set('Content-Type', 'application/json')
      .send(payload);

    assert.equal(first.status, 201);
    assert.equal(second.status, 409);
    assert.deepEqual(second.body, { error: 'Email already exists' });
  });

  it('recusa senha curta, nome curto e e-mail inválido', async () => {
    const cases = [
      { campo: 'password', payload: { password: '123' } },
      { campo: 'name', payload: { name: 'Jo' } },
      { campo: 'email', payload: { email: 'nao-e-email' } },
    ];

    for (const { campo, payload } of cases) {
      const response = await request(app)
        .post('/api/users')
        .set('Content-Type', 'application/json')
        .send({
          name: 'Carla',
          email: uniqueEmail(),
          password: PASSWORD,
          ...payload,
        });

      assert.equal(response.status, 400, `esperado 400 para ${campo}`);
      assert.equal(response.body.error, 'Validation error');
      assert.ok(
        response.body.issues.some((issue: { path: string[] }) =>
          issue.path.includes(campo),
        ),
        `o erro deveria apontar o campo ${campo}`,
      );
    }
  });

  it('recusa campo que o schema não declara (strictObject)', async () => {
    const response = await request(app)
      .post('/api/users')
      .set('Content-Type', 'application/json')
      .send({
        name: 'Carla',
        email: uniqueEmail(),
        password: PASSWORD,
        role: 'admin',
      });

    // Sem `strictObject`, o `role: "admin"` seria ignorado em silêncio — o que
    // é pior do que recusar: o cliente acha que escalou privilégio.
    assert.equal(response.status, 400);
    assert.equal(response.body.error, 'Validation error');
  });

  it('recusa Content-Type diferente de application/json', async () => {
    const response = await request(app)
      .post('/api/users')
      .set('Content-Type', 'text/plain')
      .send('name=Carla');

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      error: 'Content-Type must be application/json',
    });
  });

  it('recusa JSON malformado com 400', async () => {
    const response = await request(app)
      .post('/api/users')
      .set('Content-Type', 'application/json')
      .send('{"name": ');

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { error: 'Invalid JSON body' });
  });
});

describe('GET /api/users/me', () => {
  it('devolve o usuário do token enviado', async () => {
    const user = await createUser('me');

    const response = await request(app).get('/api/users/me').set(user.headers);

    assert.equal(response.status, 200);
    assert.equal(response.body.id, user.id);
    assert.equal(response.body.email, user.email);
    assert.equal(response.body.password, undefined);
  });

  it('devolve 401 sem o cabeçalho Authorization', async () => {
    const response = await request(app).get('/api/users/me');

    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { error: 'Token not provided' });
  });

  it('devolve 401 para cabeçalho fora do formato Bearer', async () => {
    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', unique('token-solto'));

    assert.equal(response.status, 401);
    assert.match(response.body.error, /Bearer/);
  });

  it('devolve 401 para token com assinatura inválida', async () => {
    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer abc.def.ghi');

    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { error: 'Token invalid' });
  });

  it('devolve 401 para token assinado com outro segredo', async () => {
    const user = await createUser('outro-segredo');

    // Mesma estrutura, assinatura trocada: é exatamente o ataque que a
    // verificação HMAC existe para barrar.
    const [header, payload] = user.token.split('.');

    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${header}.${payload}.assinatura-forjada`);

    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { error: 'Token invalid' });
  });
});
