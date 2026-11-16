import prisma from '@/database/database.ts';
import type { User, UserInput } from '@/types/User.d.ts';
import { hashPassword, verifyPassword } from '@/utils/password.ts';

/**
 * O `select` é a defesa: a coluna `password` nunca sai do banco.
 *
 * Não é "lembrar de remover o campo antes de responder" — ele simplesmente não
 * vem na consulta.
 */
const publicFields = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
} as const;

async function create({ name, email, password }: UserInput): Promise<User> {
  if (!name || !email || !password) {
    throw new Error('Unable to create user');
  }

  return await prisma.user.create({
    // A senha é transformada em hash antes de chegar ao banco.
    data: { name, email, password: hashPassword(password) },
    select: publicFields,
  });
}

async function readById(id: string): Promise<User> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: publicFields,
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}

/**
 * Confere e-mail e senha.
 *
 * Esta é a única função que lê a coluna `password`, e ainda assim a senha nunca
 * sai daqui: o retorno é o usuário público ou `null`.
 */
async function authenticate(
  email: string,
  password: string,
): Promise<User | null> {
  const record = await prisma.user.findUnique({ where: { email } });

  if (!record || !verifyPassword(password, record.password)) {
    return null;
  }

  const { password: _password, ...user } = record;

  return user;
}

export default { create, readById, authenticate };
