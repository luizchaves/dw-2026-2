import { argon2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Parâmetros de custo do Argon2id. São gravados dentro do próprio hash, então
 * aumentá-los no futuro não invalida as senhas já cadastradas: a verificação
 * usa os parâmetros de cada hash, e não estas constantes.
 */
const MEMORY = 65536; // 64 MiB
const PASSES = 3;
const PARALLELISM = 4;
const TAG_LENGTH = 32;
const SALT_LENGTH = 16;
const VERSION = 19;

/** Formato PHC: `$argon2id$v=19$m=65536,t=3,p=4$<sal>$<hash>` */
const PHC =
  /^\$argon2id\$v=(\d+)\$m=(\d+),t=(\d+),p=(\d+)\$([\w+/=-]+)\$([\w+/=-]+)$/;

/**
 * Devolve uma string no formato PHC, que guarda algoritmo, versão, parâmetros,
 * sal e hash num único campo.
 *
 * Cada senha recebe um sal novo, então duas senhas iguais geram hashes
 * diferentes.
 */
export function hashPassword(password: string): string {
  const nonce = randomBytes(SALT_LENGTH);

  const digest = argon2Sync('argon2id', {
    message: Buffer.from(password, 'utf-8'),
    nonce,
    parallelism: PARALLELISM,
    tagLength: TAG_LENGTH,
    memory: MEMORY,
    passes: PASSES,
  });

  const parameters = `m=${MEMORY},t=${PASSES},p=${PARALLELISM}`;

  return [
    '',
    'argon2id',
    `v=${VERSION}`,
    parameters,
    nonce.toString('base64url'),
    digest.toString('base64url'),
  ].join('$');
}

/**
 * Confere a senha refazendo o hash com os parâmetros gravados no hash
 * armazenado — e não com as constantes acima, que podem já ter mudado.
 *
 * A comparação usa `timingSafeEqual`: o tempo de resposta não revela quantos
 * bytes do hash estavam certos. Qualquer falha devolve `false`, nunca um erro.
 */
export function verifyPassword(password: string, stored: string): boolean {
  try {
    const match = PHC.exec(stored);

    if (!match) {
      return false;
    }

    const [, version, memory, passes, parallelism, salt, digest] = match;

    if (Number(version) !== VERSION) {
      return false;
    }

    const expected = Buffer.from(digest as string, 'base64url');

    const actual = argon2Sync('argon2id', {
      message: Buffer.from(password, 'utf-8'),
      nonce: Buffer.from(salt as string, 'base64url'),
      parallelism: Number(parallelism),
      tagLength: expected.length,
      memory: Number(memory),
      passes: Number(passes),
    });

    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  } catch {
    return false;
  }
}
