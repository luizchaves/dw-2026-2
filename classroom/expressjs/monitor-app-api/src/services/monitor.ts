import prisma from '@/database/database.ts';
import Ping from '@/models/Ping.ts';

const DEFAULT_INTERVAL = 60;

/**
 * Uma rodada mede todos os hosts.
 *
 * `Promise.allSettled` isola as falhas: um host que não responde não
 * interrompe a medição dos outros.
 */
async function runRound() {
  const hosts = await prisma.host.findMany({ select: { id: true } });

  const results = await Promise.allSettled(
    hosts.map((host) => Ping.check(host.id)),
  );

  const failed = results.filter((result) => result.status === 'rejected').length;

  console.log(
    `[monitor] rodada concluída: ${hosts.length} hosts, ${failed} erros`,
  );
}

/**
 * Agendador do processo.
 *
 * `setInterval` só funciona com uma instância: com duas, cada rodada mede os
 * hosts duas vezes. Em produção a coleta sairia daqui para um worker, uma fila
 * ou um agendador com trava distribuída.
 */
export function startMonitor() {
  if (process.env.MONITOR_ENABLED === 'false') {
    console.log('[monitor] desligado por MONITOR_ENABLED=false');

    return;
  }

  const interval = Number(process.env.MONITOR_INTERVAL ?? DEFAULT_INTERVAL);

  void runRound();

  const timer = setInterval(() => void runRound(), interval * 1000);

  // `unref` deixa o Ctrl+C encerrar o processo sem esperar o próximo ciclo.
  timer.unref();

  console.log(`[monitor] ligado, uma rodada a cada ${interval}s`);
}
