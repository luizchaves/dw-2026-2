import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';

// A partir do Prisma 7 o client exige um driver adapter.
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

export default prisma;
