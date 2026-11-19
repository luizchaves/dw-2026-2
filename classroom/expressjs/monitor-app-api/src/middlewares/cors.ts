import type { NextFunction, Request, Response } from 'express';

/**
 * Libera o acesso de um front-end servido em outra origem.
 *
 * O navegador trata `http://localhost:5173` e `http://localhost:3000` como
 * origens diferentes — porta diferente basta. Sem estes cabeçalhos, o `fetch`
 * do front sai, a API responde, e o navegador **descarta** a resposta antes de
 * o JavaScript vê-la. Não é a API recusando: é a política de mesma origem.
 *
 * `ALLOWED_ORIGIN` concentra a decisão: `*` em desenvolvimento, a origem exata
 * do front em produção. O `*` só é aceitável aqui porque a autenticação é por
 * cabeçalho `Authorization`, e não por cookie — com cookie de sessão, o
 * navegador exigiria uma origem explícita e `Allow-Credentials`.
 */
export const cors = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN ?? '*');

  // Sem `Authorization` aqui, o preflight barra toda rota autenticada.
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS',
  );
  res.setHeader('Access-Control-Max-Age', '86400');

  /**
   * O preflight: antes de um `PUT` com `Authorization`, o navegador manda um
   * `OPTIONS` perguntando se pode. A resposta é só os cabeçalhos acima, com
   * 204 — nenhuma rota precisa saber que essa pergunta existe.
   */
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
};
