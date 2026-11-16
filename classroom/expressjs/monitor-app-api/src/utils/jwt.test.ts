import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { signJwt, verifyJwt } from '@/utils/jwt.ts';

const payload = {
  sub: 'd3b07384-d9a0-4f1b-9f1a-000000000001',
  name: 'Ana',
  email: 'ana@example.com',
  role: 'admin',
};

afterEach(() => {
  delete process.env.JWT_EXPIRES_IN;
});

describe('signJwt', () => {
  it('gera as três partes e preserva o payload', () => {
    const token = signJwt(payload);

    assert.equal(token.split('.').length, 3);
    assert.deepEqual(
      { ...verifyJwt(token), iat: undefined, exp: undefined },
      { ...payload, iat: undefined, exp: undefined },
    );
  });

  it('grava iat e exp conforme JWT_EXPIRES_IN', () => {
    process.env.JWT_EXPIRES_IN = '60';

    const { iat, exp } = verifyJwt(signJwt(payload));

    assert.equal(exp - iat, 60);
  });
});

describe('verifyJwt', () => {
  it('recusa assinatura adulterada', () => {
    const [header, body] = signJwt(payload).split('.');

    assert.throws(() => verifyJwt(`${header}.${body}.assinatura-falsa`));
  });

  it('recusa payload adulterado', () => {
    const [header, , signature] = signJwt(payload).split('.');

    const forged = Buffer.from(
      JSON.stringify({ ...payload, role: 'admin', iat: 0, exp: 9_999_999_999 }),
    ).toString('base64url');

    assert.throws(() => verifyJwt(`${header}.${forged}.${signature}`));
  });

  it('recusa token expirado', () => {
    process.env.JWT_EXPIRES_IN = '-1';

    assert.throws(() => verifyJwt(signJwt(payload)), /Expired/);
  });

  it('recusa token malformado', () => {
    assert.throws(() => verifyJwt('nao.e-um-token'));
    assert.throws(() => verifyJwt(''));
  });
});
