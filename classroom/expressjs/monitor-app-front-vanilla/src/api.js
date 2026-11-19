/**
 * A única porta de saída para a API.
 *
 * Nenhuma tela chama `fetch` direto: todas passam por aqui. É o que permite
 * tratar em um lugar só o token, o `Content-Type`, o formato de erro e o que
 * fazer quando o token expira.
 */

import { session } from './session.js';

/** Trocável em aula sem editar o código: `localStorage.apiUrl = '...'`. */
export const API_URL =
  localStorage.getItem('apiUrl') ?? 'http://localhost:3000/api';

/**
 * Erro com o que a interface precisa saber: o status e os detalhes por campo.
 *
 * A API responde `{ error, issues? }`. Guardar `issues` é o que permite
 * destacar exatamente o campo errado no formulário, em vez de mostrar um aviso
 * genérico no topo.
 */
export class ApiError extends Error {
  constructor(message, status, issues = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.issues = issues;
  }

  /** Mensagem do primeiro problema de um campo, para colar embaixo do input. */
  fieldError(field) {
    const issue = this.issues.find((item) => item.path?.includes(field));

    return issue?.message;
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth && session.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // `fetch` só rejeita quando a requisição não chegou: API fora do ar, DNS,
    // CORS. Um 500 é uma resposta, e cai no tratamento abaixo.
    throw new ApiError('Não foi possível falar com a API. Ela está rodando?', 0);
  }

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    /**
     * Token expirado ou inválido: encerra a sessão aqui, no caminho por onde
     * toda requisição passa. Sem isso, cada tela precisaria lembrar de tratar
     * o 401 — e uma delas esqueceria.
     */
    if (response.status === 401 && session.token) {
      session.clear();
      location.hash = '#/entrar?expirado=1';
    }

    throw new ApiError(
      data.error ?? 'Erro inesperado',
      response.status,
      data.issues ?? [],
    );
  }

  return data;
}

export const api = {
  /* ----------------------------------------------------------- sessão --- */

  signup: (body) => request('/users', { method: 'POST', body, auth: false }),

  signin: (body) => request('/signin', { method: 'POST', body, auth: false }),

  me: () => request('/users/me'),

  /* ------------------------------------------------------------ hosts --- */

  listHosts: (filters = {}) => {
    // Parâmetros vazios ficam de fora: `?name=` filtraria por string vazia.
    const query = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => value),
    );

    return request(`/hosts${query.size ? `?${query}` : ''}`);
  },

  getHost: (id) => request(`/hosts/${id}`),

  createHost: (body) => request('/hosts', { method: 'POST', body }),

  updateHost: (id, body) => request(`/hosts/${id}`, { method: 'PUT', body }),

  deleteHost: (id) => request(`/hosts/${id}`, { method: 'DELETE' }),

  /* ------------------------------------------------------------ pings --- */

  listPings: (id, limit = 50) => request(`/hosts/${id}/pings?limit=${limit}`),

  checkHost: (id) => request(`/hosts/${id}/pings`, { method: 'POST' }),

  /* ------------------------------------------------------------- tags --- */

  listTags: (name) => request(`/tags${name ? `?name=${encodeURIComponent(name)}` : ''}`),

  createTag: (body) => request('/tags', { method: 'POST', body }),
};
