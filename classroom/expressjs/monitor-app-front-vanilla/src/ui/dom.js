/**
 * O mínimo de ferramenta para montar HTML com segurança.
 *
 * Sem framework, a tentação é escrever `elemento.innerHTML = '<h1>' + nome +
 * '</h1>'`. O problema: `nome` vem do usuário. Um host chamado
 * `<img src=x onerror=alert(1)>` vira script executando na página — e, como o
 * token está no `localStorage`, vira token roubado.
 *
 * A tag `html` abaixo escapa **toda** interpolação por padrão. Para inserir
 * HTML que a própria aplicação gerou, é preciso dizer isso explicitamente com
 * `raw()`. O caminho seguro é o curto; o perigoso exige uma palavra a mais.
 */

const ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

/** Marca um texto como HTML já confiável (gerado pela aplicação). */
class Raw {
  constructor(value) {
    this.value = value;
  }

  toString() {
    return this.value;
  }
}

export const raw = (value) => new Raw(value);

function interpolate(value) {
  if (value instanceof Raw) {
    return value.value;
  }

  // Uma lista de pedaços é o caso comum: `${hosts.map(cardDoHost)}`.
  if (Array.isArray(value)) {
    return value.map(interpolate).join('');
  }

  if (value === null || value === undefined || value === false) {
    return '';
  }

  return escapeHtml(value);
}

export function html(strings, ...values) {
  return raw(
    strings.reduce(
      (acc, part, index) => acc + interpolate(values[index - 1]) + part,
    ),
  );
}

/** Troca o conteúdo de um elemento por uma árvore montada com `html`. */
export function render(target, template) {
  target.innerHTML = String(template);

  return target;
}

/**
 * Renderiza e devolve o elemento recém-criado, para pendurar listeners nele.
 *
 * A diferença importa. O container das telas (`#app`) é o mesmo durante toda a
 * vida da página: um `on(app, ...)` a cada navegação vai **empilhando**
 * listeners, e o terceiro clique no mesmo botão dispara três vezes. Pendurar
 * no elemento que acabou de nascer resolve na raiz — ele é descartado junto
 * com os listeners quando a próxima tela renderiza por cima.
 */
export function renderRoot(target, template) {
  render(target, template);

  return target.firstElementChild ?? target;
}

export const qs = (selector, scope = document) => scope.querySelector(selector);
export const qsa = (selector, scope = document) => [
  ...scope.querySelectorAll(selector),
];

/**
 * Delegação de eventos: um listener no container atende os filhos, inclusive
 * os que ainda não existem. Evita religar listeners a cada re-render.
 */
export function on(scope, event, selector, handler) {
  scope.addEventListener(event, (e) => {
    const target = e.target.closest(selector);

    if (target && scope.contains(target)) {
      handler(e, target);
    }
  });
}
