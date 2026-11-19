/**
 * Roteador por hash.
 *
 * `#/app/hosts/abc` não vai ao servidor: o navegador só dispara `hashchange`.
 * É o que permite uma aplicação de uma página só a partir de um arquivo
 * estático, sem nenhuma configuração de servidor — um `/app/hosts/abc` de
 * verdade exigiria o servidor devolvendo o `index.html` para qualquer caminho.
 */

import { session } from './session.js';

const routes = [];

/**
 * `'#/app/hosts/:id'` vira uma expressão regular com um grupo nomeado, para a
 * tela receber `{ id }` sem recortar string na mão.
 */
function toPattern(path) {
  return new RegExp(
    `^${path.replace(/:(\w+)/g, '(?<$1>[^/]+)').replace(/\//g, '\\/')}$`,
  );
}

export function route(path, view, { protected: isProtected = false } = {}) {
  routes.push({ pattern: toPattern(path), view, isProtected });
}

function parse() {
  const [path = '/', queryString = ''] = location.hash.slice(1).split('?');

  return {
    path: path || '/',
    query: Object.fromEntries(new URLSearchParams(queryString)),
  };
}

export function navigate(path, { replace = false } = {}) {
  if (replace) {
    location.replace(`#${path}`);
  } else {
    location.hash = path;
  }
}

async function resolve(outlet) {
  const { path, query } = parse();
  const match = routes
    .map((item) => ({ ...item, result: item.pattern.exec(path) }))
    .find((item) => item.result);

  if (!match) {
    navigate(session.isAuthenticated ? '/app' : '/', { replace: true });

    return;
  }

  /**
   * A proteção aqui é de **experiência**, não de segurança: esconder a tela
   * não protege dado nenhum. Quem protege é a API, que exige o token em toda
   * rota. Isto só evita mostrar um painel vazio que cairia em 401.
   */
  if (match.isProtected && !session.isAuthenticated) {
    navigate('/entrar', { replace: true });

    return;
  }

  // Já autenticado não tem o que fazer no login nem no cadastro.
  if (!match.isProtected && session.isAuthenticated && path !== '/') {
    navigate('/app', { replace: true });

    return;
  }

  window.scrollTo({ top: 0 });

  await match.view(outlet, { params: match.result.groups ?? {}, query });
}

export function startRouter(outlet) {
  const run = () => {
    resolve(outlet).catch((error) => {
      console.error(error);
    });
  };

  addEventListener('hashchange', run);

  if (!location.hash) {
    navigate('/', { replace: true });
  }

  run();
}
