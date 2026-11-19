/** O casco das telas autenticadas: cabeçalho, navegação e tema. */

import { session } from '../session.js';
import { html, on, qs, renderRoot } from './dom.js';
import { icons } from './icons.js';

const THEME_KEY = 'monitor:theme';

/**
 * O tema combina a preferência do sistema com a escolha explícita do usuário.
 * Sem escolha salva, o site segue o sistema — é o padrão que ninguém precisa
 * configurar.
 */
export function applyTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const dark =
    saved === 'dark' ||
    (saved === null && matchMedia('(prefers-color-scheme: dark)').matches);

  document.documentElement.classList.toggle('dark', dark);

  return dark;
}

export function toggleTheme() {
  const dark = !document.documentElement.classList.contains('dark');

  localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  applyTheme();

  return dark;
}

export const themeButton = () => html`
  <button
    class="btn btn-ghost btn-icon"
    data-theme-toggle
    aria-label="Alternar entre tema claro e escuro"
    title="Alternar tema"
  >
    <span class="hidden dark:block">${icons.sun({ size: 18 })}</span>
    <span class="dark:hidden">${icons.moon({ size: 18 })}</span>
  </button>
`;

export const logo = (size = 'text-base') => html`
  <span class="flex items-center gap-2">
    <span
      class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white"
      >${icons.pulse({ size: 18 })}</span
    >
    <span class="${size} font-semibold tracking-tight">Monitor</span>
  </span>
`;

const navLink = (href, label, icon, active) => html`
  <a
    href="#${href}"
    class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${active
      ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
      : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100'}"
    ${active ? 'aria-current="page"' : ''}
  >
    ${icon({ size: 17 })} ${label}
  </a>
`;

/**
 * Monta a tela autenticada inteira e devolve o elemento onde o conteúdo vive.
 *
 * As telas não repetem cabeçalho nem navegação: pedem o casco e preenchem o
 * miolo.
 */
export function appShell(outlet, { active = 'dashboard', content }) {
  const shell = renderRoot(
    outlet,
    html`
      <div class="min-h-screen bg-zinc-50/60 dark:bg-zinc-950">
        <header
          class="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80"
        >
          <div
            class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6"
          >
            <div class="flex items-center gap-6">
              <a href="#/app" class="rounded-lg">${logo()}</a>
              <nav class="hidden items-center gap-1 sm:flex">
                ${navLink('/app', 'Hosts', icons.server, active === 'dashboard')}
                ${navLink('/app/tags', 'Tags', icons.tag, active === 'tags')}
              </nav>
            </div>

            <div class="flex items-center gap-1.5">
              ${themeButton()}
              <div class="mx-1 h-6 w-px bg-zinc-200 dark:bg-zinc-800"></div>
              <div class="flex items-center gap-2.5 pl-1">
                <span
                  class="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-200"
                  aria-hidden="true"
                  >${session.initials}</span
                >
                <span class="hidden text-sm font-medium md:block"
                  >${session.user?.name ?? ''}</span
                >
              </div>
              <button
                class="btn btn-ghost btn-icon"
                data-logout
                aria-label="Sair da conta"
                title="Sair"
              >
                ${icons.logout({ size: 18 })}
              </button>
            </div>
          </div>

          <!-- Navegação do celular: a mesma coisa, embaixo do cabeçalho. -->
          <nav
            class="flex items-center gap-1 border-t border-zinc-200 px-4 py-2 sm:hidden dark:border-zinc-800"
          >
            ${navLink('/app', 'Hosts', icons.server, active === 'dashboard')}
            ${navLink('/app/tags', 'Tags', icons.tag, active === 'tags')}
          </nav>
        </header>

        <main id="conteudo" class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          ${content}
        </main>
      </div>
    `,
  );

  on(shell, 'click', '[data-theme-toggle]', toggleTheme);
  on(shell, 'click', '[data-logout]', () => {
    session.clear();
    location.hash = '#/';
  });

  return qs('#conteudo', shell);
}

/** Cabeçalho de página: título à esquerda, ações à direita. */
export const pageHeader = ({ title, subtitle, actions = '' }) => html`
  <div
    class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
  >
    <div class="min-w-0">
      <h1 class="truncate text-xl font-semibold tracking-tight">${title}</h1>
      ${subtitle
        ? html`<p class="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            ${subtitle}
          </p>`
        : ''}
    </div>
    <div class="flex shrink-0 items-center gap-2">${actions}</div>
  </div>
`;

/**
 * Estado vazio.
 *
 * Uma lista vazia sem explicação parece erro. Dizer o que aconteceu e oferecer
 * a próxima ação transforma o vazio em começo.
 */
export const emptyState = ({ icon, title, message, action = '' }) => html`
  <div
    class="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 px-6 py-14 text-center dark:border-zinc-800"
  >
    <span
      class="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500"
      >${icon({ size: 20 })}</span
    >
    <h3 class="text-sm font-semibold">${title}</h3>
    <p class="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
      ${message}
    </p>
    ${action ? html`<div class="mt-5">${action}</div>` : ''}
  </div>
`;

/** Esqueleto de carregamento: mostra a forma do que vem, não um spinner solto. */
export const skeletonCards = (count = 4) => html`
  <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    ${Array.from(
      { length: count },
      () => html`
        <div class="card space-y-3 p-5">
          <div class="flex items-center justify-between">
            <div class="skeleton h-4 w-28"></div>
            <div class="skeleton h-5 w-16 rounded-full"></div>
          </div>
          <div class="skeleton h-3 w-20"></div>
          <div class="skeleton h-8 w-full"></div>
        </div>
      `,
    )}
  </div>
`;

/** Erro de carregamento com a saída óbvia: tentar de novo. */
export const errorState = (message) => html`
  <div
    class="flex flex-col items-center rounded-xl border border-rose-200 bg-rose-50/60 px-6 py-10 text-center dark:border-rose-900/50 dark:bg-rose-950/20"
  >
    <span class="mb-2 text-rose-600 dark:text-rose-400"
      >${icons.alert({ size: 22 })}</span
    >
    <p class="text-sm font-medium text-rose-900 dark:text-rose-200">
      ${message}
    </p>
    <button class="btn btn-outline btn-sm mt-4" data-retry>
      ${icons.refresh({ size: 14 })} Tentar de novo
    </button>
  </div>
`;
