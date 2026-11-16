import assert from 'node:assert/strict';
import { argon2Sync, randomBytes } from 'node:crypto';
import { describe, it } from 'node:test';

import { hashPassword, verifyPassword } from '@/utils/password.ts';

describe('hashPassword', () => {
  it('não guarda a senha em claro', () => {
    const hash = hashPassword('senha-de-desenvolvimento');

    assert.ok(!hash.includes('senha-de-desenvolvimento'));
    assert.match(hash, /^\$argon2id\$v=19\$m=\d+,t=\d+,p=\d+\$/);
  });

  it('gera hashes diferentes para a mesma senha', () => {
    const [first, second] = [hashPassword('123456789'), hashPassword('123456789')];

    assert.notEqual(first, second);
  });
});

describe('verifyPassword', () => {
  it('aceita a senha correta', () => {
    assert.equal(verifyPassword('senha-correta', hashPassword('senha-correta')), true);
  });

  it('recusa a senha errada', () => {
    assert.equal(verifyPassword('senha-errada', hashPassword('senha-correta')), false);
  });

  it('recusa um hash malformado em vez de lançar', () => {
    assert.equal(verifyPassword('qualquer', 'nao-e-um-hash'), false);
    assert.equal(verifyPassword('qualquer', ''), false);
    assert.equal(verifyPassword('qualquer', '$argon2id$v=19$m=19456,t=2,p=1$'), false);
  });

  it('usa os parâmetros gravados no hash, não as constantes atuais', () => {
    // Deriva um hash com o custo anterior do projeto (m=19456,t=2,p=1), como
    // os que já estariam no banco antes de o custo subir.
    const salt = randomBytes(16);

    const legacyParams = { memory: 19456, passes: 2, parallelism: 1 };

    const digest = argon2Sync('argon2id', {
      message: Buffer.from('senha-antiga', 'utf-8'),
      nonce: salt,
      tagLength: 32,
      ...legacyParams,
    });

    const legacy = `$argon2id$v=19$m=${legacyParams.memory},t=${legacyParams.passes},p=${legacyParams.parallelism}$${salt.toString('base64url')}$${digest.toString('base64url')}`;

    assert.equal(verifyPassword('senha-antiga', legacy), true);
    assert.equal(verifyPassword('senha-errada', legacy), false);
  });

  it('recusa um hash de outra versão do Argon2', () => {
    const wrongVersion = hashPassword('senha').replace('v=19', 'v=16');

    assert.equal(verifyPassword('senha', wrongVersion), false);
  });
});
