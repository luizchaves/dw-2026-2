import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

import app from '@/index.ts';
import { startMonitor } from '@/services/monitor.ts';
import { createHost, createUser, request } from '@/test/support.ts';

/**
 * O agendador é a parte mais difícil de testar do projeto: ele depende de
 * tempo (`setInterval`) e de rede (o ping real de *todos* os hosts do banco).
 *
 * O que dá para fixar aqui é a decisão de ligar ou não ligar — e é justamente
 * ela que a suíte precisa garantir, porque é dela que depende o banco de teste
 * não ser medido no meio dos outros testes. O miolo, `Ping.check`, já está
 * coberto pela rota `POST /hosts/:id/pings`.
 */
describe('startMonitor', () => {
  const original = process.env.MONITOR_ENABLED;

  afterEach(() => {
    process.env.MONITOR_ENABLED = original;
  });

  it('não mede nada quando MONITOR_ENABLED=false', async () => {
    const user = await createUser('monitor');
    const host = await createHost(user);

    process.env.MONITOR_ENABLED = 'false';

    startMonitor();

    // Tempo de sobra para uma rodada imediata acontecer, se ela existisse.
    await delay(300);

    const historico = await request(app)
      .get(`/api/hosts/${host.id}/pings`)
      .set(user.headers);

    assert.equal(historico.status, 200);
    assert.deepEqual(historico.body, []);
  });

  it('é desligado no ambiente de teste pelo .env.test', () => {
    // Se esta linha falhar, o agendador estaria medindo hosts durante a suíte
    // inteira — e os testes de histórico passariam a encontrar medições que
    // não foram eles que criaram.
    assert.equal(process.env.MONITOR_ENABLED, 'false');
  });
});
