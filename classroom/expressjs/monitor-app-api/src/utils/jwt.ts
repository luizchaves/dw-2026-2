import { createHmac, timingSafeEqual } from 'node:crypto';

export interface JwtPayload {
  /** `subject`: o id do usuário. */
  sub: string;
  name: string;
  email: string;
  role: string;
  /** `issued at`, em segundos. */
  iat: number;
  /** `expiration`, em segundos. */
  exp: number;
}

const HEADER = { alg: 'HS256', typ: 'JWT' } as const;

function secret(): string {
  return process.env.JWT_SECRET ?? 'segredo-de-desenvolvimento';
}

function expiresIn(): number {
  return Number(process.env.JWT_EXPIRES_IN ?? 3600);
}

function encode(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function decode(segment: string): unknown {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf-8'));
}

function sign(content: string): string {
  return createHmac('sha256', secret()).update(content).digest('base64url');
}

/**
 * O payload é **assinado, não criptografado**: qualquer um lê o conteúdo de um
 * token. A assinatura garante que ninguém o alterou, não que ele é secreto —
 * então nada de senha ou dado sensível aqui dentro.
 */
export function signJwt(
  payload: Omit<JwtPayload, 'iat' | 'exp'>,
): string {
  const iat = Math.floor(Date.now() / 1000);

  const content = `${encode(HEADER)}.${encode({ ...payload, iat, exp: iat + expiresIn() })}`;

  return `${content}.${sign(content)}`;
}

/** Devolve o payload ou lança: assinatura inválida, formato errado ou expirado. */
export function verifyJwt(token: string): JwtPayload {
  const [header, body, signature] = token.split('.');

  if (!header || !body || !signature) {
    throw new Error('Malformed token');
  }

  const expected = Buffer.from(sign(`${header}.${body}`), 'base64url');
  const actual = Buffer.from(signature, 'base64url');

  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error('Invalid signature');
  }

  const { alg, typ } = decode(header) as Partial<typeof HEADER>;

  if (alg !== HEADER.alg || typ !== HEADER.typ) {
    throw new Error('Unsupported token');
  }

  const payload = decode(body) as JwtPayload;

  if (!payload.sub) {
    throw new Error('Token without subject');
  }

  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error('Expired token');
  }

  return payload;
}
