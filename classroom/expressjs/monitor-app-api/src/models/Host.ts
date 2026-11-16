import prisma from '@/database/database.ts';
import type { Host, HostInput } from '@/types/Host.d.ts';

/**
 * Substitui o SQL escrito à mão da etapa anterior: pede ao Prisma que traga
 * as tags e as últimas medições resolvidas na mesma ida ao banco.
 */
const include = {
  tags: true,
  pings: { orderBy: { createdAt: 'desc' }, take: 10 },
} as const;

/** Tag existente é conectada; tag nova nasce com uma cor neutra. */
function connectTags(tags: string[] = []) {
  return {
    connectOrCreate: tags.map((name) => ({
      where: { name },
      create: { name, color: '#64748b' },
    })),
  };
}

async function create({
  userId,
  name,
  address,
  tags,
}: HostInput & { userId: string }): Promise<Host> {
  if (!name || !address) {
    throw new Error('Unable to create host');
  }

  return (await prisma.host.create({
    data: { userId, name, address, tags: connectTags(tags) },
    include,
  })) as Host;
}

/** Toda consulta é escopada pelo dono: ninguém vê o host de outro usuário. */
async function read(where: {
  userId: string;
  name?: string;
  tag?: string;
}): Promise<Host[]> {
  const filters = {
    userId: where.userId,
    ...(where.name ? { name: { contains: where.name } } : {}),
    // O filtro por tag atravessa a tabela de junção sem uma linha de SQL.
    ...(where.tag ? { tags: { some: { name: where.tag } } } : {}),
  };

  return (await prisma.host.findMany({ where: filters, include })) as Host[];
}

/**
 * O `userId` entra no `where`, e não num `if` depois da consulta: o host de
 * outro usuário responde 404, como se não existisse.
 */
async function readById(id: string, userId: string): Promise<Host> {
  const host = await prisma.host.findFirst({ where: { id, userId }, include });

  if (!host) {
    throw new Error('Host not found');
  }

  return host as Host;
}

async function update({
  id,
  userId,
  name,
  address,
  tags,
}: HostInput & { id?: string; userId: string }): Promise<Host> {
  if (!id || !name || !address) {
    throw new Error('Unable to update host');
  }

  await readById(id, userId);

  return (await prisma.host.update({
    where: { id },
    // `set: []` desfaz os vínculos antigos antes de gravar a nova lista.
    data: { name, address, tags: { set: [], ...connectTags(tags) } },
    include,
  })) as Host;
}

async function remove(id: string, userId: string): Promise<boolean> {
  await readById(id, userId);

  // `onDelete: Cascade` no schema apaga o histórico de pings junto.
  await prisma.host.delete({ where: { id } });

  return true;
}

export default { create, read, readById, update, remove };
