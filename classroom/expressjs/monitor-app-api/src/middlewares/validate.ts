import type { NextFunction, Request, Response } from 'express';
import type { z, ZodType } from 'zod';

import HttpError from '@/errors/HttpError.ts';
import { parseCookies } from '@/utils/cookies.ts';

/**
 * Recebe um schema e devolve um middleware — o mesmo padrão de fábrica de
 * `express.json()`.
 *
 * O schema valida as cinco fontes de dados de uma vez, por isso cada um declara
 * apenas as chaves (`body`, `query`, `params`, `headers`, `cookies`) que a rota
 * realmente usa. Cabeçalho e cookie são entrada não confiável tanto quanto o
 * corpo: chegam do cliente e podem vir forjados.
 */
export const validate =
  (schema: ZodType) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
      cookies: parseCookies(req.headers.cookie),
    });

    if (!result.success) {
      throw new HttpError('Validation error', 400, result.error.issues);
    }

    req.valid = result.data;

    next();
  };

/**
 * Lê o resultado da validação com o tipo que o próprio schema descreve.
 *
 * `req.params` e `req.query` do Express são sempre `string`; o schema converte
 * (`z.coerce`) e este acessor devolve os dados já no tipo final, sem espalhar
 * conversão pelos controllers.
 */
export function validated<S extends ZodType>(
  req: Request,
  _schema: S,
): z.infer<S> {
  return req.valid as z.infer<S>;
}
