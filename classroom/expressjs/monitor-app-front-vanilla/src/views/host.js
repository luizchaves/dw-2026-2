/**
 * Detalhe de um host: o histórico inteiro, não só as últimas medições.
 *
 * O painel responde "como está agora"; esta tela responde "como tem estado".
 */

import { api } from '../api.js';
import { navigate } from '../router.js';
import { html, on, qs, render } from '../ui/dom.js';
import { confirmDialog, toast } from '../ui/feedback.js';
import {
  availability,
  averageLatency,
  fullDate,
  hostStatus,
  latency,
  pluralize,
  timeAgo,
} from '../ui/format.js';
import { icons } from '../ui/icons.js';
import { appShell, emptyState, errorState } from '../ui/layout.js';
import { sparkline } from './dashboard.js';
import { hostDialog } from './host-form.js';

const TONES = {
  emerald:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  zinc: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
};

const stat = (label, value, detail = '') => html`
  <div class="card p-4">
    <p class="text-xs font-medium uppercase tracking-wide text-zinc-400">
      ${label}
    </p>
    <p class="mt-1.5 text-2xl font-semibold tabular-nums">${value}</p>
    ${detail
      ? html`<p class="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
          ${detail}
        </p>`
      : ''}
  </div>
`;

const historyRow = (ping) => html`
  <tr
    class="border-t border-zinc-100 transition hover:bg-zinc-50/80 dark:border-zinc-800 dark:hover:bg-zinc-800/40"
  >
    <td class="py-2.5 pl-4 pr-3">
      <span
        class="badge ${ping.success
          ? TONES.emerald
          : TONES.rose} py-0.5 text-[11px]"
      >
        ${ping.success ? 'Respondeu' : 'Sem resposta'}
      </span>
    </td>
    <td class="px-3 py-2.5 text-right font-mono text-sm tabular-nums">
      ${latency(ping.latency)}
    </td>
    <td
      class="px-3 py-2.5 text-right text-sm text-zinc-500 dark:text-zinc-400"
    >
      ${timeAgo(ping.createdAt)}
    </td>
    <td
      class="hidden py-2.5 pl-3 pr-4 text-right font-mono text-xs text-zinc-400 sm:table-cell dark:text-zinc-500"
    >
      ${fullDate(ping.createdAt)}
    </td>
  </tr>
`;

export async function hostView(outlet, { params }) {
  let host = null;
  let pings = [];
  let limite = 50;

  const content = appShell(outlet, {
    active: 'dashboard',
    content: html`<div data-screen>
      <div class="skeleton h-9 w-56"></div>
      <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        ${[1, 2, 3, 4].map(() => html`<div class="skeleton h-24"></div>`)}
      </div>
    </div>`,
  });

  const screen = qs('[data-screen]', content);

  function renderScreen() {
    const status = hostStatus({ pings });
    const disponibilidade = availability(pings);
    const media = averageLatency(pings);
    const respondidos = pings.filter((ping) => ping.success);
    const minima = respondidos.length
      ? Math.min(...respondidos.map((ping) => ping.latency))
      : null;
    const maxima = respondidos.length
      ? Math.max(...respondidos.map((ping) => ping.latency))
      : null;

    render(
      screen,
      html`
        <a
          href="#/app"
          class="mb-5 inline-flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ${icons.arrowLeft({ size: 15 })} Todos os hosts
        </a>

        <div
          class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div class="min-w-0">
            <div class="flex items-center gap-3">
              <h1 class="truncate text-xl font-semibold tracking-tight">
                ${host.name}
              </h1>
              <span class="badge ${TONES[status.tone]} shrink-0"
                >${status.label}</span
              >
            </div>
            <p
              class="mt-1 font-mono text-sm text-zinc-400 dark:text-zinc-500"
            >
              ${host.address}
            </p>
            ${host.tags?.length
              ? html`<div class="mt-3 flex flex-wrap gap-1.5">
                  ${host.tags.map(
                    (tag) => html`
                      <span
                        class="badge border border-zinc-200 bg-transparent py-0.5 text-[11px] font-normal text-zinc-500 dark:border-zinc-800 dark:text-zinc-400"
                      >
                        <span
                          class="h-1.5 w-1.5 rounded-full"
                          style="background:${/^#[0-9a-f]{6}$/i.test(tag.color)
                            ? tag.color
                            : '#a1a1aa'}"
                        ></span>
                        ${tag.name}
                      </span>
                    `,
                  )}
                </div>`
              : ''}
          </div>

          <div class="flex shrink-0 items-center gap-2">
            <button class="btn btn-primary" data-check>
              ${icons.zap({ size: 15 })} Medir agora
            </button>
            <button class="btn btn-outline btn-icon" data-edit aria-label="Editar host">
              ${icons.pencil({ size: 15 })}
            </button>
            <button
              class="btn btn-outline btn-icon text-zinc-500 hover:text-rose-600"
              data-delete
              aria-label="Excluir host"
            >
              ${icons.trash({ size: 15 })}
            </button>
          </div>
        </div>

        <div class="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          ${stat(
            'Disponibilidade',
            disponibilidade === null ? '—' : `${disponibilidade}%`,
            `em ${pluralize(pings.length, 'medição', 'medições')}`,
          )}
          ${stat('Latência média', latency(media), 'quando respondeu')}
          ${stat('Mais rápida', latency(minima))}
          ${stat('Mais lenta', latency(maxima))}
        </div>

        <div class="card mt-3 p-5">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold">Latência ao longo do tempo</h2>
            <span class="text-xs text-zinc-400"
              >última: ${timeAgo(pings[0]?.createdAt)}</span
            >
          </div>
          <div class="mt-4">${sparkline(pings, { height: 'h-28' })}</div>
          <div
            class="mt-2 flex justify-between text-[11px] text-zinc-400 dark:text-zinc-500"
          >
            <span>mais antiga</span>
            <span>mais recente</span>
          </div>
        </div>

        <div class="mt-6 flex items-center justify-between">
          <h2 class="text-sm font-semibold">Histórico</h2>
          <label class="flex items-center gap-2 text-xs text-zinc-500">
            Mostrar
            <select class="input h-8 w-20 py-0 text-xs" data-limit>
              ${[20, 50, 100, 200].map(
                (valor) =>
                  html`<option value="${valor}" ${valor === limite ? 'selected' : ''}>
                    ${valor}
                  </option>`,
              )}
            </select>
          </label>
        </div>

        <div class="card mt-3 overflow-hidden">
          ${pings.length === 0
            ? emptyState({
                icon: icons.clock,
                title: 'Nenhuma medição ainda',
                message:
                  'O monitor mede automaticamente a cada minuto — ou use “Medir agora” para não esperar.',
              })
            : html`
                <table class="w-full">
                  <caption class="sr-only">
                    Medições de ${host.name}, da mais recente para a mais antiga
                  </caption>
                  <thead>
                    <tr
                      class="text-[11px] uppercase tracking-wide text-zinc-400"
                    >
                      <th scope="col" class="py-2.5 pl-4 pr-3 text-left font-medium">
                        Resultado
                      </th>
                      <th scope="col" class="px-3 py-2.5 text-right font-medium">
                        Latência
                      </th>
                      <th scope="col" class="px-3 py-2.5 text-right font-medium">
                        Quando
                      </th>
                      <th
                        scope="col"
                        class="hidden py-2.5 pl-3 pr-4 text-right font-medium sm:table-cell"
                      >
                        Data
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    ${pings.map(historyRow)}
                  </tbody>
                </table>
              `}
        </div>
      `,
    );
  }

  async function load() {
    try {
      [host, pings] = await Promise.all([
        api.getHost(params.id),
        api.listPings(params.id, limite),
      ]);

      renderScreen();
    } catch (error) {
      if (error.status === 404) {
        toast('Esse host não existe ou não é seu.', 'error');
        navigate('/app', { replace: true });

        return;
      }

      render(screen, errorState(error.message));
    }
  }

  on(content, 'click', '[data-check]', async (_event, button) => {
    button.disabled = true;

    try {
      const ping = await api.checkHost(params.id);

      toast(
        ping.success
          ? `Respondeu em ${ping.latency} ms.`
          : 'Sem resposta. A falha entrou no histórico.',
        ping.success ? 'success' : 'error',
      );

      await load();
    } catch (error) {
      toast(error.message, 'error');
      button.disabled = false;
    }
  });

  on(content, 'click', '[data-edit]', async () => {
    const tags = await api.listTags().catch(() => []);
    const salvo = await hostDialog({ host, tags });

    if (salvo) {
      await load();
    }
  });

  on(content, 'click', '[data-delete]', async () => {
    const confirmado = await confirmDialog({
      title: `Excluir “${host.name}”?`,
      message:
        'Todo o histórico de medições deste host é apagado junto. Não dá para desfazer.',
      confirmLabel: 'Excluir host',
    });

    if (!confirmado) {
      return;
    }

    try {
      await api.deleteHost(params.id);
      toast(`“${host.name}” foi removido.`);
      navigate('/app');
    } catch (error) {
      toast(error.message, 'error');
    }
  });

  on(content, 'change', '[data-limit]', (event) => {
    limite = Number(event.target.value);
    load();
  });

  on(content, 'click', '[data-retry]', () => load());

  const timer = setInterval(load, 60_000);

  addEventListener('hashchange', () => clearInterval(timer), { once: true });

  await load();
}
