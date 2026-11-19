/**
 * Tela inicial pública.
 *
 * Quem chega aqui ainda não tem conta. A página tem um trabalho só: explicar o
 * que a ferramenta faz e levar ao cadastro. Por isso uma única ação em
 * destaque, repetida no fim — e nada de formulário no meio do caminho.
 */

import { session } from '../session.js';
import { html, on, renderRoot } from '../ui/dom.js';
import { icons } from '../ui/icons.js';
import { logo, themeButton, toggleTheme } from '../ui/layout.js';

const feature = (icon, title, text) => html`
  <div class="group">
    <span
      class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-brand-600 transition group-hover:border-brand-200 group-hover:bg-brand-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-brand-400 dark:group-hover:border-brand-900 dark:group-hover:bg-brand-950"
      >${icon({ size: 19 })}</span
    >
    <h3 class="text-sm font-semibold">${title}</h3>
    <p class="mt-1.5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
      ${text}
    </p>
  </div>
`;

const step = (number, title, text) => html`
  <li class="flex gap-4">
    <span
      class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-xs font-semibold text-zinc-500 dark:border-zinc-800 dark:text-zinc-400"
      >${number}</span
    >
    <div class="pt-0.5">
      <h3 class="text-sm font-semibold">${title}</h3>
      <p class="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        ${text}
      </p>
    </div>
  </li>
`;

/** Prévia do painel: mostra o produto em vez de descrevê-lo. */
const preview = () => html`
  <div
    class="card overflow-hidden p-1.5 shadow-2xl shadow-zinc-900/10 dark:shadow-black/40"
  >
    <div
      class="rounded-lg border border-zinc-100 bg-zinc-50/80 p-4 dark:border-zinc-800/80 dark:bg-zinc-950"
    >
      <div class="mb-4 flex items-center gap-1.5">
        <span class="h-2.5 w-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800"></span>
        <span class="h-2.5 w-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800"></span>
        <span class="h-2.5 w-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800"></span>
      </div>

      <div class="grid gap-2.5 sm:grid-cols-3">
        ${[
          { name: 'Google DNS', address: '8.8.8.8', ms: '12 ms', ok: true },
          { name: 'Portal', address: 'ifpb.edu.br', ms: '38 ms', ok: true },
          { name: 'Homologação', address: 'homolog.local', ms: '—', ok: false },
        ].map(
          ({ name, address, ms, ok }) => html`
            <div
              class="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="truncate text-xs font-medium">${name}</span>
                <span class="relative flex h-2 w-2 shrink-0">
                  ${ok
                    ? html`<span
                        class="absolute inline-flex h-full w-full animate-ring rounded-full bg-emerald-500"
                      ></span>`
                    : ''}
                  <span
                    class="relative inline-flex h-2 w-2 rounded-full ${ok
                      ? 'bg-emerald-500'
                      : 'bg-rose-500'}"
                  ></span>
                </span>
              </div>
              <p
                class="mt-1 truncate font-mono text-[11px] text-zinc-400 dark:text-zinc-500"
              >
                ${address}
              </p>
              <p class="mt-2.5 text-lg font-semibold tabular-nums">${ms}</p>
            </div>
          `,
        )}
      </div>

      <div
        class="mt-2.5 flex h-16 items-end gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900"
      >
        ${[40, 55, 35, 70, 45, 60, 30, 65, 50, 75, 42, 58, 38, 68, 48].map(
          (height) => html`
            <span
              class="flex-1 rounded-xs bg-brand-500/25 dark:bg-brand-500/30"
              style="height: ${height}%"
            ></span>
          `,
        )}
      </div>
    </div>
  </div>
`;

export function landingView(outlet) {
  const entrar = session.isAuthenticated ? '/app' : '/entrar';
  const rotuloEntrar = session.isAuthenticated ? 'Abrir painel' : 'Entrar';

  const page = renderRoot(
    outlet,
    html`
      <div class="min-h-screen">
        <header
          class="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/80 backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/80"
        >
          <div
            class="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6"
          >
            <a href="#/" class="rounded-lg">${logo()}</a>
            <div class="flex items-center gap-1.5">
              ${themeButton()}
              <a href="#${entrar}" class="btn btn-ghost">${rotuloEntrar}</a>
              ${session.isAuthenticated
                ? ''
                : html`<a href="#/cadastro" class="btn btn-primary"
                    >Criar conta</a
                  >`}
            </div>
          </div>
        </header>

        <main id="conteudo">
          <!-- ---------------------------------------------------- hero --- -->
          <section class="relative overflow-hidden">
            <!-- Um brilho só, bem discreto: dá profundidade sem virar enfeite. -->
            <div
              class="pointer-events-none absolute left-1/2 top-0 -z-10 h-[32rem] w-[64rem] -translate-x-1/2 rounded-full bg-brand-500/10 blur-3xl dark:bg-brand-600/10"
              aria-hidden="true"
            ></div>

            <div
              class="mx-auto max-w-5xl px-4 pb-16 pt-20 text-center sm:px-6 sm:pb-24 sm:pt-28"
            >
              <a
                href="#/cadastro"
                class="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 transition hover:border-brand-200 hover:text-brand-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-brand-900 dark:hover:text-brand-300"
              >
                <span class="relative flex h-1.5 w-1.5">
                  <span
                    class="absolute inline-flex h-full w-full animate-ring rounded-full bg-emerald-500"
                  ></span>
                  <span
                    class="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"
                  ></span>
                </span>
                Medições automáticas a cada minuto
                ${icons.arrowRight({ size: 13 })}
              </a>

              <h1
                class="mx-auto mt-6 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl"
              >
                Saiba que caiu
                <span class="text-zinc-400 dark:text-zinc-600">
                  antes de perguntarem.</span
                >
              </h1>

              <p
                class="mx-auto mt-5 max-w-xl text-base leading-relaxed text-zinc-500 dark:text-zinc-400 sm:text-lg"
              >
                O Monitor mede seus servidores, sites e equipamentos por ping, guarda
                o histórico e mostra a disponibilidade de cada um em um painel só.
              </p>

              <div
                class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
              >
                <a
                  href="#/cadastro"
                  class="btn btn-primary h-11 w-full px-6 sm:w-auto"
                >
                  Começar agora ${icons.arrowRight({ size: 16 })}
                </a>
                <a
                  href="#como-funciona"
                  class="btn btn-outline h-11 w-full px-6 sm:w-auto"
                  >Ver como funciona</a
                >
              </div>

              <p class="mt-4 text-xs text-zinc-400 dark:text-zinc-600">
                Sem cartão, sem instalação. É um projeto de aula.
              </p>
            </div>

            <div class="mx-auto max-w-4xl px-4 pb-20 sm:px-6">${preview()}</div>
          </section>

          <!-- ------------------------------------------------ recursos --- -->
          <section
            class="border-t border-zinc-200 bg-zinc-50/60 py-20 dark:border-zinc-800 dark:bg-zinc-900/30"
          >
            <div class="mx-auto max-w-5xl px-4 sm:px-6">
              <h2 class="max-w-md text-2xl font-semibold tracking-tight sm:text-3xl">
                O suficiente para saber o que está no ar.
              </h2>
              <p class="mt-3 max-w-lg text-sm text-zinc-500 dark:text-zinc-400">
                Nada além disso — porque a pergunta que importa é simples, e a
                resposta deveria caber em uma tela.
              </p>

              <div class="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
                ${feature(
                  icons.zap,
                  'Medição sob demanda',
                  'Clicou, mediu. O resultado entra no histórico na hora, sem esperar o próximo ciclo.',
                )}
                ${feature(
                  icons.clock,
                  'Histórico completo',
                  'Cada medição fica registrada — inclusive as que falharam. É assim que se enxerga um padrão.',
                )}
                ${feature(
                  icons.gauge,
                  'Disponibilidade e latência',
                  'O percentual de respostas e o tempo médio, calculados sobre as medições recentes.',
                )}
                ${feature(
                  icons.tag,
                  'Organização por tags',
                  'Agrupe por ambiente, time ou cliente, e filtre o painel por qualquer um deles.',
                )}
                ${feature(
                  icons.shield,
                  'Cada um vê o seu',
                  'Os hosts são seus. Um host de outra conta responde como se não existisse.',
                )}
                ${feature(
                  icons.layers,
                  'API aberta',
                  'Tudo que o painel faz passa por uma API REST documentada, pronta para outros clientes.',
                )}
              </div>
            </div>
          </section>

          <!-- -------------------------------------------- como funciona --- -->
          <section id="como-funciona" class="scroll-mt-20 py-20">
            <div
              class="mx-auto grid max-w-5xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16"
            >
              <div>
                <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Três passos até o primeiro gráfico.
                </h2>
                <p class="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                  Da conta vazia ao painel cheio, sem configuração.
                </p>
                <a href="#/cadastro" class="btn btn-primary mt-7">
                  Criar minha conta ${icons.arrowRight({ size: 16 })}
                </a>
              </div>

              <ol class="space-y-7">
                ${step(
                  '1',
                  'Crie sua conta',
                  'Nome, e-mail e senha. Nada mais é pedido.',
                )}
                ${step(
                  '2',
                  'Cadastre um host',
                  'Um IP como 8.8.8.8 ou um domínio como ifpb.edu.br. Dê um nome e, se quiser, uma tag.',
                )}
                ${step(
                  '3',
                  'Acompanhe',
                  'O monitor mede sozinho a cada minuto. Você vê a disponibilidade, a latência e o histórico.',
                )}
              </ol>
            </div>
          </section>

          <!-- --------------------------------------------- chamada final --- -->
          <section class="px-4 pb-20 sm:px-6">
            <div
              class="mx-auto max-w-5xl rounded-2xl bg-zinc-900 px-6 py-14 text-center dark:bg-brand-950"
            >
              <h2
                class="mx-auto max-w-lg text-2xl font-semibold tracking-tight text-white sm:text-3xl"
              >
                Comece a monitorar em um minuto.
              </h2>
              <p class="mx-auto mt-3 max-w-md text-sm text-zinc-400">
                Crie a conta, cadastre o primeiro host e veja a primeira medição
                aparecer.
              </p>
              <a href="#/cadastro" class="btn btn-primary mt-7 h-11 px-6">
                Criar conta gratuita ${icons.arrowRight({ size: 16 })}
              </a>
            </div>
          </section>
        </main>

        <footer class="border-t border-zinc-200 py-8 dark:border-zinc-800">
          <div
            class="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 text-sm text-zinc-500 sm:flex-row sm:px-6 dark:text-zinc-400"
          >
            ${logo('text-sm')}
            <p>Projeto de Desenvolvimento Web · IFPB</p>
            <a
              class="link"
              href="http://localhost:3000/api/docs"
              target="_blank"
              rel="noopener"
              >Documentação da API</a
            >
          </div>
        </footer>
      </div>
    `,
  );

  on(page, 'click', '[data-theme-toggle]', toggleTheme);
}
