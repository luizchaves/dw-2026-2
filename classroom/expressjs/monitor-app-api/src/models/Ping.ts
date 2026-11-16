import prisma from '@/database/database.ts';
import { ping } from '@/lib/ping.ts';
import type { Ping } from '@/types/Ping.d.ts';

/** Histórico de medições de um host, da mais recente para a mais antiga. */
async function readByHost(hostId: string, limit = 50): Promise<Ping[]> {
  return await prisma.ping.findMany({
    where: { hostId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Mede o host e grava o resultado.
 *
 * A falha também é gravada: um host fora do ar entra como
 * `success: false, latency: null`. É isso que transforma o histórico num
 * registro de disponibilidade, e não só numa lista de sucessos.
 *
 * O `userId` é opcional porque o agendador mede todos os hosts, sem dono
 * no contexto; vindo da API, ele escopa a medição ao dono.
 */
async function check(hostId: string, userId?: string): Promise<Ping> {
  const host = await prisma.host.findFirst({
    where: { id: hostId, ...(userId ? { userId } : {}) },
  });

  if (!host) {
    throw new Error('Host not found');
  }

  const { success, latency } = await ping(host.address);

  return await prisma.ping.create({ data: { hostId, success, latency } });
}

export default { readByHost, check };
