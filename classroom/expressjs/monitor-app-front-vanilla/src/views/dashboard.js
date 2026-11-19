/**
 * O painel — a primeira tela depois do login.
 *
 * A ordem da página responde às perguntas na ordem em que elas aparecem:
 * "está tudo bem?" (os números no topo), "o que está fora?" (os cards, com os
 * problemas antes), e só então "o que eu faço agora?" (as ações em cada card).
 */

import { api, ApiError } from '../api.js';
import { session } from '../session.js';
import { html, on, qs, qsa, render } from '../ui/dom.js';
import { confirmDialog, toast } from '../ui/feedback.js';
import {
  availability,
  averageLatency,
  hostStatus,
  latency,
  pluralize,
  timeAgo,
} from '../ui/format.js';
import { icons } from '../ui/icons.js';
import {
  appShell,
  emptyState,
  errorState,
  pageHeader,
  skeletonCards,
} from '../ui/layout.js';
import { hostDialog } from './host-form.js';

const TONES = {
  emerald:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  zinc: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
};

const statusBadge = (status) => html`
  <span class="badge ${TONES[status.tone]}">
    <span class="relative flex h-1.5 w-1.5">
      ${status.key === 'online'
        ? html`<span
            class="absolute inline-flex h-full w-full animate-ring rounded-full bg-emerald-500"
          ></span>`
        : ''}
      <span
        class="relative inline-flex h-1.5 w-1.5 rounded-full ${status.key ===
        'online'
          ? 'bg-emerald-500'
          : status.key === 'offline'
            ? 'bg-rose-500'
            : 'bg-zinc-400'}"
      ></span>
    </span>
    ${status.label}
  </span>
`;

/**
 * Faixas das últimas medições, da mais antiga para a mais recente.
 *
 * Barras em vez de números: a forma do gráfico responde "está estável?" antes
 * de qualquer leitura. A falha vira uma barra vermelha de altura mínima — some
 * do gráfico seria pior do que aparecer.
 */
export function sparkline(pings, { height = 'h-8' } = {}) {
  if (!pings?.length) {
    return html`<div
      class="${height} flex items-center text-xs text-zinc-300 dark:text-zinc-700"
    >
      Sem medições ainda
    </div>`;
  }

  const ordenados = [...pings].reverse();
  const maior = Math.max(...ordenados.map((ping) => ping.latency ?? 0), 1);

  return html`
    <div class="${height} flex items-end gap-0.5" aria-hidden="true">
      ${ordenados.map((ping) => {
        const altura = ping.success
          ? Math.max(12, Math.round(((ping.latency ?? 0) / maior) * 100))
          : 100;

        return html`<span
          class="flex-1 rounded-sm ${ping.success
            ? 'bg-brand-500/30 dark:bg-brand-500/40'
            : 'bg-rose-500/60'}"
          style="height: ${altura}%"
          title="${ping.success ? `${ping.latency} ms` : 'sem resposta'}"
        ></span>`;
      })}
    </div>
  `;
}

const statCard = (icon, label, value, detail) => html`
  <div class="card p-4">
    <div class="flex items-center gap-2 text-zinc-400 dark:text-zinc-500">
      ${icon({ size: 15 })}
      <span class="text-xs font-medium uppercase tracking-wide">${label}</span>
    </div>
    <p class="mt-2 text-2xl font-semibold tabular-nums">${value}</p>
    <p class="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">${detail}</p>
  </div>
`;

const hostCard = (host) => {
  const status = hostStatus(host);
  const disponibilidade = availability(host.pings);
  const media = averageLatency(host.pings);

  return html`
    <article
      class="card group flex flex-col p-5 transition hover:border-zinc-300 hover:shadow-sm dark:hover:border-zinc-700"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="truncate font-medium leading-tight">
            <a
              href="#/app/hosts/${host.id}"
              class="rounded after:absolute after:inset-0"
              >${host.name}</a
            >
          </h3>
          <p
            class="mt-1 truncate font-mono text-xs text-zinc-400 dark:text-zinc-500"
          >
            ${host.address}
          </p>
        </div>
        ${statusBadge(status)}
      </div>

      <div class="mt-4">${sparkline(host.pings)}</div>

      <dl class="mt-4 grid grid-cols-3 gap-2 text-center">
        <div>
          <dt class="text-[11px] uppercase tracking-wide text-zinc-400">
            Disponib.
          </dt>
          <dd class="mt-0.5 text-sm font-semibold tabular-nums">
            ${disponibilidade === null ? '—' : `${disponibilidade}%`}
          </dd>
        </div>
        <div>
          <dt class="text-[11px] uppercase tracking-wide text-zinc-400">
            Latência
          </dt>
          <dd class="mt-0.5 text-sm font-semibold tabular-nums">
            ${latency(media)}
          </dd>
        </div>
        <div>
          <dt class="text-[11px] uppercase tracking-wide text-zinc-400">
            Medição
          </dt>
          <dd class="mt-0.5 text-sm font-semibold">
            ${timeAgo(host.pings?.[0]?.createdAt)}
          </dd>
        </div>
      </dl>

      ${host.tags?.length
        ? html`
            <div class="mt-4 flex flex-wrap gap-1.5">
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
            </div>
          `
        : ''}

      <!-- O z-10 tira os botões de baixo do link que cobre o card inteiro. -->
      <div
        class="relative z-10 mt-5 flex items-center gap-1.5 border-t border-zinc-100 pt-4 dark:border-zinc-800"
      >
        <button
          class="btn btn-outline btn-sm"
          data-check="${host.id}"
          title="Medir este host agora"
        >
          ${icons.zap({ size: 13 })} Medir
        </button>
        <a href="#/app/hosts/${host.id}" class="btn btn-ghost btn-sm">
          Detalhes
        </a>
        <span class="flex-1"></span>
        <button
          class="btn btn-ghost btn-sm btn-icon text-zinc-400 hover:text-rose-600"
          data-delete="${host.id}"
          data-name="${host.name}"
          aria-label="Excluir ${host.name}"
          title="Excluir"
        >
          ${icons.trash({ size: 15 })}
        </button>
      </div>
    </article>
  `;
};

export async function dashboardView(outlet, { query = {} } = {}) {
  // `#/app?tag=producao` — é assim que a tela de tags leva para cá já filtrado.
  const filtros = { name: '', tag: query.tag ?? '' };
  let hosts = [];
  let tags = [];

  const content = appShell(outlet, {
    active: 'dashboard',
    content: html`
      ${pageHeader({
        title: `Olá, ${(session.user?.name ?? '').split(' ')[0]}`,
        subtitle: 'Este é o estado dos seus hosts agora.',
        actions: html`
          <button class="btn btn-outline" data-refresh title="Atualizar">
            ${icons.refresh({ size: 15 })}
            <span class="hidden sm:inline">Atualizar</span>
          </button>
          <button class="btn btn-primary" data-new>
            ${icons.plus({ size: 16 })} Novo host
          </button>
        `,
      })}

      <section
        class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4"
        data-stats
        aria-label="Resumo"
      ></section>

      <div class="mb-5 flex flex-col gap-2 sm:flex-row">
        <div class="relative flex-1">
          <span
            class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            >${icons.search({ size: 16 })}</span
          >
          <input
            class="input pl-9"
            type="search"
            data-search
            placeholder="Buscar por nome…"
            aria-label="Buscar hosts por nome"
          />
        </div>
        <select class="input sm:w-56" data-tag aria-label="Filtrar por tag">
          <option value="">Todas as tags</option>
        </select>
      </div>

      <section data-list>${skeletonCards()}</section>
    `,
  });

  const lista = qs('[data-list]', content);
  const resumo = qs('[data-stats]', content);

  /* ------------------------------------------------------- renderização --- */

  function renderStats() {
    const online = hosts.filter((h) => hostStatus(h).key === 'online').length;
    const offline = hosts.filter((h) => hostStatus(h).key === 'offline').length;
    const medias = hosts
      .map((h) => averageLatency(h.pings))
      .filter((value) => value !== null);

    const media = medias.length
      ? Math.round(medias.reduce((a, b) => a + b, 0) / medias.length)
      : null;

    render(
      resumo,
      html`
        ${statCard(
          icons.server,
          'Hosts',
          hosts.length,
          pluralize(hosts.length, 'monitorado', 'monitorados'),
        )}
        ${statCard(
          icons.check,
          'Online',
          online,
          hosts.length ? `${Math.round((online / hosts.length) * 100)}% do total` : '—',
        )}
        ${statCard(
          icons.alert,
          'Offline',
          offline,
          offline ? 'precisa de atenção' : 'nenhum problema',
        )}
        ${statCard(icons.gauge, 'Latência', latency(media), 'média das medições')}
      `,
    );
  }

  function renderList() {
    if (hosts.length === 0) {
      const filtrando = filtros.name || filtros.tag;

      render(
        lista,
        filtrando
          ? emptyState({
              icon: icons.search,
              title: 'Nenhum host encontrado',
              message: 'Nenhum host combina com esse filtro. Tente outro termo.',
              action: html`<button class="btn btn-outline btn-sm" data-clear>
                Limpar filtros
              </button>`,
            })
          : emptyState({
              icon: icons.server,
              title: 'Nenhum host ainda',
              message:
                'Cadastre o primeiro endereço que você quer acompanhar. Pode ser um IP ou um domínio.',
              action: html`<button class="btn btn-primary" data-new>
                ${icons.plus({ size: 16 })} Cadastrar primeiro host
              </button>`,
            }),
      );

      return;
    }

    /**
     * Quem está fora vem primeiro, depois quem nunca foi medido.
     *
     * Ordenar por nome deixaria o host caído no fim da lista — e o painel
     * existe justamente para mostrá-lo.
     */
    const peso = { offline: 0, unknown: 1, online: 2 };
    const ordenados = [...hosts].sort(
      (a, b) =>
        peso[hostStatus(a).key] - peso[hostStatus(b).key] ||
        a.name.localeCompare(b.name, 'pt-BR'),
    );

    render(
      lista,
      html`
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          ${ordenados.map((host) => html`<div class="relative">${hostCard(host)}</div>`)}
        </div>
      `,
    );
  }

  /* ------------------------------------------------------------- dados --- */

  async function load({ silent = false } = {}) {
    if (!silent) {
      render(lista, skeletonCards());
    }

    try {
      [hosts, tags] = await Promise.all([
        api.listHosts(filtros),
        tags.length ? Promise.resolve(tags) : api.listTags(),
      ]);

      renderStats();
      renderList();
      syncTagOptions();
    } catch (error) {
      if (silent) {
        return;
      }

      render(lista, errorState(error.message));
    }
  }

  function syncTagOptions() {
    const select = qs('[data-tag]', content);

    if (select.options.length > 1) {
      return;
    }

    render(
      select,
      html`
        <option value="">Todas as tags</option>
        ${tags.map((tag) => html`<option value="${tag.name}">${tag.name}</option>`)}
      `,
    );

    // Mantém o controle coerente com o filtro que veio da URL.
    select.value = filtros.tag;
  }

  /* ------------------------------------------------------------- ações --- */

  on(content, 'click', '[data-new]', async () => {
    const criado = await hostDialog({ tags });

    if (criado) {
      await load();
    }
  });

  on(content, 'click', '[data-refresh]', () => load());

  on(content, 'click', '[data-clear]', () => {
    filtros.name = '';
    filtros.tag = '';
    qs('[data-search]', content).value = '';
    qs('[data-tag]', content).value = '';
    load();
  });

  on(content, 'click', '[data-check]', async (_event, button) => {
    const id = button.dataset.check;

    button.disabled = true;
    button.innerHTML =
      '<span class="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></span>';

    try {
      const ping = await api.checkHost(id);

      toast(
        ping.success
          ? `Respondeu em ${ping.latency} ms.`
          : 'Sem resposta. A falha foi registrada no histórico.',
        ping.success ? 'success' : 'error',
      );

      await load({ silent: true });
    } catch (error) {
      toast(error.message, 'error');
      button.disabled = false;
    }
  });

  on(content, 'click', '[data-delete]', async (_event, button) => {
    const { delete: id, name } = button.dataset;

    const confirmado = await confirmDialog({
      title: `Excluir “${name}”?`,
      message:
        'O host sai do painel e todo o histórico de medições dele é apagado. Não dá para desfazer.',
      confirmLabel: 'Excluir host',
    });

    if (!confirmado) {
      return;
    }

    try {
      await api.deleteHost(id);
      toast(`“${name}” foi removido.`);
      await load({ silent: true });
    } catch (error) {
      toast(error.message, 'error');
    }
  });

  /* Busca com atraso: não dispara uma requisição por tecla digitada. */
  let debounce;

  qs('[data-search]', content).addEventListener('input', (event) => {
    clearTimeout(debounce);
    filtros.name = event.target.value.trim();
    debounce = setTimeout(() => load({ silent: true }), 350);
  });

  qs('[data-tag]', content).addEventListener('change', (event) => {
    filtros.tag = event.target.value;
    load();
  });

  on(content, 'click', '[data-retry]', () => load());

  /**
   * O agendador da API mede a cada minuto; o painel busca na mesma cadência.
   * `silent` evita o esqueleto piscando por cima de dados que já estão certos.
   */
  const timer = setInterval(() => load({ silent: true }), 60_000);

  addEventListener('hashchange', () => clearInterval(timer), { once: true });

  await load();
}
