import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import prisma from '@/database/database.ts';

interface Seed {
  tags: { name: string; color: string }[];
  hosts: { name: string; address: string; tags: string[] }[];
}

const LATENCIES = [10, 14, 18, 22];

async function seed() {
  const file = resolve('prisma', 'seeders.json');

  const { tags, hosts } = JSON.parse(readFileSync(file, 'utf-8')) as Seed;

  // O upsert pelo nome torna o seed repetível.
  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: { color: tag.color },
      create: tag,
    });
  }

  for (const host of hosts) {
    await prisma.host.create({
      data: {
        name: host.name,
        address: host.address,
        tags: { connect: host.tags.map((name) => ({ name })) },
        pings: {
          create: LATENCIES.map((latency, index) => ({
            latency,
            success: true,
            // Uma medição por minuto, da mais antiga para a mais recente.
            createdAt: new Date(
              Date.now() - (LATENCIES.length - 1 - index) * 60_000,
            ),
          })),
        },
      },
    });
  }

  console.log('Database seeded');
}

seed()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
