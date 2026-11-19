/**
 * Apoio para os testes de API.
 *
 * Quase todo teste precisa de um usuário autenticado antes de chegar ao que
 * realmente quer verificar. Em vez de repetir cadastro e login em cada arquivo,
 * as funções daqui fazem isso pela porta da frente — pelas próprias rotas da
 * API, e não escrevendo direto no banco.
 *
 * A diferença importa: um atalho pelo Prisma testaria o banco, não a API. Assim
 * o próprio preparo do teste já exercita `POST /users` e `POST /signin`.
 *
 * Este arquivo não termina em `.test.ts`, então o test runner não tenta
 * executá-lo como uma suíte.
 */

import { randomUUID } from 'node:crypto';

import request from 'supertest';

import app from '@/index.ts';

/** Senha única da suíte: longa o bastante para passar no schema. */
export const PASSWORD = 'senha-de-teste-123';

/**
 * Nomes de usuário e de tag são únicos no banco, e o banco é um só para toda a
 * suíte: um valor fixo faria o segundo teste a usá-lo falhar com 409 sem que
 * houvesse nada de errado com a rota.
 */
export function unique(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

export function uniqueEmail(prefix = 'user'): string {
  return `${unique(prefix)}@example.com`;
}

export interface TestUser {
  id: string;
  name: string;
  email: string;
  token: string;
  /** Pronto para `.set(user.headers)` no supertest. */
  headers: Record<string, string>;
}

/** Cadastra um usuário e já faz login, devolvendo o token pronto para uso. */
export async function createUser(prefix = 'user'): Promise<TestUser> {
  const email = uniqueEmail(prefix);
  const name = unique('Usuário');

  const created = await request(app)
    .post('/api/users')
    .set('Content-Type', 'application/json')
    .send({ name, email, password: PASSWORD });

  if (created.status !== 201) {
    throw new Error(
      `Falha ao criar usuário de teste: ${created.status} ${JSON.stringify(created.body)}`,
    );
  }

  const session = await request(app)
    .post('/api/signin')
    .set('Content-Type', 'application/json')
    .send({ email, password: PASSWORD });

  if (session.status !== 200) {
    throw new Error(
      `Falha no login de teste: ${session.status} ${JSON.stringify(session.body)}`,
    );
  }

  const token = session.body.token as string;

  return {
    id: created.body.id as string,
    name,
    email,
    token,
    headers: { Authorization: `Bearer ${token}` },
  };
}

/** Cria um host do usuário informado e devolve o corpo da resposta. */
export async function createHost(
  user: TestUser,
  payload: Partial<{ name: string; address: string; tags: string[] }> = {},
) {
  const response = await request(app)
    .post('/api/hosts')
    .set(user.headers)
    .set('Content-Type', 'application/json')
    .send({
      name: unique('Host'),
      // Endereço local: o ping real responde rápido e não depende da rede.
      address: '127.0.0.1',
      ...payload,
    });

  if (response.status !== 201) {
    throw new Error(
      `Falha ao criar host de teste: ${response.status} ${JSON.stringify(response.body)}`,
    );
  }

  return response.body;
}

/** Um UUID válido que não corresponde a nenhum registro: o caso de 404. */
export function missingId(): string {
  return randomUUID();
}

export { app, request };
