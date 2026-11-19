/**
 * A sessão do usuário no navegador.
 *
 * O token fica no `localStorage` para sobreviver ao recarregamento da página.
 * Vale saber o que isso significa: `localStorage` é legível por qualquer script
 * da origem, então um XSS leva o token junto. A alternativa — cookie
 * `HttpOnly` — exigiria a API emitindo o cookie e `Allow-Credentials` no CORS.
 * A API deste módulo autentica por cabeçalho `Authorization`, então é esta a
 * escolha coerente; a troca está registrada, não escondida.
 */

const TOKEN_KEY = 'monitor:token';
const USER_KEY = 'monitor:user';

function readUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null');
  } catch {
    return null;
  }
}

/**
 * O payload de um JWT é base64url, não é secreto — dá para ler a expiração sem
 * perguntar à API. Serve para não mostrar uma tela que já vai cair em 401.
 * Quem valida de verdade é a API: isto é conveniência, não segurança.
 */
function isExpired(token) {
  try {
    const [, payload] = token.split('.');
    const { exp } = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));

    return typeof exp === 'number' && exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export const session = {
  token: localStorage.getItem(TOKEN_KEY),
  user: readUser(),

  get isAuthenticated() {
    return Boolean(this.token) && !isExpired(this.token);
  },

  start(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clear() {
    this.token = null;
    this.user = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  /** Iniciais para o avatar, sem precisar de imagem. */
  get initials() {
    return (this.user?.name ?? '?')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  },
};

/* Um token que venceu enquanto a aba estava aberta não vale mais nada. */
if (session.token && isExpired(session.token)) {
  session.clear();
}
