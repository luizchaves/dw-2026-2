/**
 * *Declaration merging*: reabre a interface `Request` do Express para declarar
 * os campos que os middlewares acrescentam.
 *
 * `valid` é `unknown` de propósito — quem sabe o formato é o schema, e o
 * acessor `validated()` faz a ponte entre os dois.
 */
declare global {
  namespace Express {
    interface Request {
      /** Dados já validados e convertidos pelo middleware `validate`. */
      valid?: unknown;
      /** Id do usuário autenticado, preenchido pelo `isAuthenticated`. */
      userId?: string;
    }
  }
}

export {};
