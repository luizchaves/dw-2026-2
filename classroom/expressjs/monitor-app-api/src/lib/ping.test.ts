import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ping } from '@/lib/ping.ts';

describe('ping', () => {
  it('mede um host que responde', async () => {
    const { success, latency } = await ping('127.0.0.1');

    assert.equal(success, true);
    assert.equal(typeof latency, 'number');
    assert.ok((latency as number) >= 0);
  });

  it('devolve falha, e não exceção, para um host que não resolve', async () => {
    assert.deepEqual(await ping('nao-existe-xyz.invalid'), {
      success: false,
      latency: null,
    });
  });

  it('não passa pelo shell: injeção de comando falha como endereço', async () => {
    const { success } = await ping('127.0.0.1; touch /tmp/comprometido');

    assert.equal(success, false);
  });

  it('volta dentro do timeout, responda o host ou não', async () => {
    const started = Date.now();

    // Não afirma sucesso nem falha: algumas redes respondem por qualquer IP.
    // O que importa é que a função não fica pendurada além do timeout.
    const result = await ping('192.0.2.1', 1);

    assert.equal(typeof result.success, 'boolean');
    assert.ok(Date.now() - started < 3000);
  });
});
