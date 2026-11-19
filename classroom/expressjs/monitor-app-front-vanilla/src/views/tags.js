/**
 * Tags: o vocabulário que organiza os hosts.
 *
 * Diferente dos hosts, as tags são compartilhadas entre todos os usuários — a
 * tela diz isso em voz alta, porque é uma surpresa se ninguém avisar.
 */

import { api, ApiError } from '../api.js';
import { html, on, qs, qsa, render } from '../ui/dom.js';
import { toast, withLoading } from '../ui/feedback.js';
import { icons } from '../ui/icons.js';
import {
  appShell,
  emptyState,
  errorState,
  pageHeader,
} from '../ui/layout.js';

const CORES = [
  '#6366f1',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
];

const tagCard = (tag, total) => html`
  <a
    href="#/app?tag=${encodeURIComponent(tag.name)}"
    class="card flex items-center gap-3 p-4 transition hover:border-zinc-300 hover:shadow-xs dark:hover:border-zinc-700"
  >
    <span
      class="h-9 w-9 shrink-0 rounded-lg"
      style="background:${/^#[0-9a-f]{6}$/i.test(tag.color)
        ? tag.color
        : '#a1a1aa'}"
      aria-hidden="true"
    ></span>
    <span class="min-w-0 flex-1">
      <span class="block truncate text-sm font-medium">${tag.name}</span>
      <span class="block text-xs text-zinc-400 dark:text-zinc-500">
        ${total === 1 ? '1 host' : `${total} hosts`}
      </span>
    </span>
    <span class="text-zinc-300 dark:text-zinc-600"
      >${icons.arrowRight({ size: 16 })}</span
    >
  </a>
`;

export async function tagsView(outlet) {
  let tags = [];
  let hosts = [];

  const content = appShell(outlet, {
    active: 'tags',
    content: html`
      ${pageHeader({
        title: 'Tags',
        subtitle:
          'Agrupe seus hosts por ambiente, time ou cliente. As tags são compartilhadas entre todas as contas.',
      })}

      <div class="card mb-6 p-5">
        <h2 class="text-sm font-semibold">Nova tag</h2>
        <form class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start" novalidate>
          <div class="flex-1">
            <label class="sr-only" for="tag-name">Nome da tag</label>
            <input
              class="input"
              id="tag-name"
              name="name"
              placeholder="producao"
              aria-describedby="name-erro"
            />
            <p class="hint-error hidden" id="name-erro" role="alert"></p>
          </div>

          <div>
            <label class="sr-only" for="tag-color">Cor</label>
            <div
              class="flex h-10 items-center gap-1.5 rounded-lg border border-zinc-200 px-2 dark:border-zinc-800"
              role="radiogroup"
              aria-label="Cor da tag"
            >
              ${CORES.map(
                (cor, indice) => html`
                  <button
                    type="button"
                    class="h-6 w-6 rounded-md ring-offset-2 ring-offset-white transition dark:ring-offset-zinc-900"
                    style="background:${cor}"
                    data-color="${cor}"
                    role="radio"
                    aria-checked="${indice === 0}"
                    aria-label="Cor ${cor}"
                  ></button>
                `,
              )}
            </div>
            <input type="hidden" name="color" value="${CORES[0]}" />
          </div>

          <button class="btn btn-primary" type="submit">
            ${icons.plus({ size: 16 })} Criar
          </button>
        </form>
        <p
          class="mt-3 hidden text-sm text-rose-600 dark:text-rose-400"
          data-form-error
          role="alert"
        ></p>
      </div>

      <section data-list>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          ${[1, 2, 3].map(() => html`<div class="skeleton h-[4.5rem]"></div>`)}
        </div>
      </section>
    `,
  });

  const lista = qs('[data-list]', content);
  const form = qs('form', content);

  function renderList() {
    if (tags.length === 0) {
      render(
        lista,
        emptyState({
          icon: icons.tag,
          title: 'Nenhuma tag ainda',
          message:
            'Crie a primeira acima, ou escreva o nome de uma tag ao cadastrar um host — ela é criada junto.',
        }),
      );

      return;
    }

    // Quantos hosts seus usam cada tag: a contagem é local, não precisa de rota.
    const total = (nome) =>
      hosts.filter((host) => host.tags?.some((tag) => tag.name === nome)).length;

    render(
      lista,
      html`
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          ${tags.map((tag) => tagCard(tag, total(tag.name)))}
        </div>
      `,
    );
  }

  async function load() {
    try {
      [tags, hosts] = await Promise.all([api.listTags(), api.listHosts()]);
      renderList();
    } catch (error) {
      render(lista, errorState(error.message));
    }
  }

  /* A cor escolhida fica marcada com um anel, e o input escondido acompanha. */
  on(content, 'click', '[data-color]', (_event, button) => {
    qsa('[data-color]', content).forEach((outro) => {
      outro.classList.remove('ring-2', 'ring-zinc-900', 'dark:ring-white');
      outro.setAttribute('aria-checked', 'false');
    });

    button.classList.add('ring-2', 'ring-zinc-900', 'dark:ring-white');
    button.setAttribute('aria-checked', 'true');
    qs('[name="color"]', content).value = button.dataset.color;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const hint = qs('#name-erro', form);
    const box = qs('[data-form-error]', content);

    hint.classList.add('hidden');
    box.classList.add('hidden');
    qs('#tag-name', form).classList.remove('input-error');

    const data = Object.fromEntries(new FormData(form));

    try {
      await withLoading(qs('[type="submit"]', form), 'Criando…', () =>
        api.createTag({ name: data.name.trim(), color: data.color }),
      );

      toast(`Tag “${data.name.trim()}” criada.`);
      form.reset();
      qs('[name="color"]', content).value = CORES[0];
      await load();
    } catch (error) {
      if (!(error instanceof ApiError)) {
        throw error;
      }

      const message = error.fieldError('name');

      if (message) {
        qs('#tag-name', form).classList.add('input-error');
        hint.classList.remove('hidden');
        hint.classList.add('flex');
        hint.textContent = message;
      } else {
        box.classList.remove('hidden');
        box.textContent = error.message;
      }
    }
  });

  on(content, 'click', '[data-retry]', () => load());

  qs('[data-color]', content).classList.add(
    'ring-2',
    'ring-zinc-900',
    'dark:ring-white',
  );

  await load();
}
