import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import app from '@/index.ts';
import { createUser, PASSWORD, request, uniqueEmail } from '@/test/support.ts';

describe('POST /api/signin', () => {
  it('autentica e devolve um JWT de três segmentos', async () => {
    const user = await createUser('signin');

    const response = await request(app)
      .post('/api/signin')
      .set('Content-Type', 'application/json')
      .send({ email: user.email, password: PASSWORD });

    assert.equal(response.status, 200);
    assert.equal(response.body.auth.email, user.email);
    assert.equal(response.body.auth.id, user.id);
    assert.equal(typeof response.body.token, 'string');
    assert.equal(response.body.token.split('.').length, 3);
  });

  it('não devolve a senha junto com o usuário autenticado', async () => {
    const user = await createUser('signin-sem-senha');

    const response = await request(app)
      .post('/api/signin')
      .set('Content-Type', 'application/json')
      .send({ email: user.email, password: PASSWORD });

    assert.equal(response.body.auth.password, undefined);
    assert.ok(!JSON.stringify(response.body.auth).includes(PASSWORD));
  });

  it('aceita o e-mail em maiúsculas', async () => {
    const user = await createUser('signin-maiuscula');

    const response = await request(app)
      .post('/api/signin')
      .set('Content-Type', 'application/json')
      .send({ email: user.email.toUpperCase(), password: PASSWORD });

    assert.equal(response.status, 200);
  });

  it('devolve o token que abre as rotas autenticadas', async () => {
    const user = await createUser('signin-token');

    const signin = await request(app)
      .post('/api/signin')
      .set('Content-Type', 'application/json')
      .send({ email: user.email, password: PASSWORD });

    const me = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${signin.body.token}`);

    assert.equal(me.status, 200);
    assert.equal(me.body.id, user.id);
  });

  it('responde igual para senha errada e para e-mail inexistente', async () => {
    const user = await createUser('signin-erro');

    const senhaErrada = await request(app)
      .post('/api/signin')
      .set('Content-Type', 'application/json')
      .send({ email: user.email, password: 'senha-que-nao-e-a-dele' });

    const emailInexistente = await request(app)
      .post('/api/signin')
      .set('Content-Type', 'application/json')
      .send({ email: uniqueEmail('nao-cadastrado'), password: PASSWORD });

    assert.equal(senhaErrada.status, 401);
    assert.equal(emailInexistente.status, 401);
    // Respostas indistinguíveis: distinguir entregaria ao atacante a lista de
    // e-mails cadastrados.
    assert.deepEqual(senhaErrada.body, emailInexistente.body);
    assert.deepEqual(senhaErrada.body, { error: 'Invalid credentials' });
  });

  it('trata senha curta como 401, e não como erro de validação', async () => {
    const user = await createUser('signin-curta');

    const response = await request(app)
      .post('/api/signin')
      .set('Content-Type', 'application/json')
      .send({ email: user.email, password: '123' });

    // Uma conta antiga pode ter senha curta: ela merece "credenciais
    // inválidas", e não "dado inválido".
    assert.equal(response.status, 401);
  });

  it('recusa e-mail inválido e senha vazia com 400', async () => {
    const semEmail = await request(app)
      .post('/api/signin')
      .set('Content-Type', 'application/json')
      .send({ email: 'nao-e-email', password: PASSWORD });

    const semSenha = await request(app)
      .post('/api/signin')
      .set('Content-Type', 'application/json')
      .send({ email: uniqueEmail(), password: '' });

    assert.equal(semEmail.status, 400);
    assert.equal(semSenha.status, 400);
    assert.equal(semEmail.body.error, 'Validation error');
  });

  it('recusa Content-Type diferente de application/json', async () => {
    const response = await request(app)
      .post('/api/signin')
      .set('Content-Type', 'text/plain')
      .send('email=carla@example.com');

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      error: 'Content-Type must be application/json',
    });
  });
});
