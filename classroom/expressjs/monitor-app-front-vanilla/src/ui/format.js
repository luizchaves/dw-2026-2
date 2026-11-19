/** Formatação e as contas de disponibilidade, longe das telas. */

const relative = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
const dateTime = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'medium',
});

const UNITS = [
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
  ['second', 1],
];

/** "há 2 minutos" — mais legível que um horário absoluto para algo recente. */
export function timeAgo(value) {
  if (!value) {
    return 'nunca';
  }

  const seconds = (new Date(value).getTime() - Date.now()) / 1000;

  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size || unit === 'second') {
      return relative.format(Math.round(seconds / size), unit);
    }
  }
}

export const fullDate = (value) => dateTime.format(new Date(value));

export const latency = (ms) => (ms === null || ms === undefined ? '—' : `${ms} ms`);

/**
 * Estado atual do host: a medição mais recente manda.
 *
 * Sem nenhuma medição o host não está "offline" — ele é desconhecido. Tratar
 * os dois casos como a mesma coisa mostraria um host recém-criado em vermelho,
 * como se estivesse com problema.
 */
export function hostStatus(host) {
  const last = host.pings?.[0];

  if (!last) {
    return { key: 'unknown', label: 'Sem medições', tone: 'zinc' };
  }

  return last.success
    ? { key: 'online', label: 'Online', tone: 'emerald' }
    : { key: 'offline', label: 'Offline', tone: 'rose' };
}

/** Percentual de medições bem-sucedidas na janela que veio do servidor. */
export function availability(pings = []) {
  if (pings.length === 0) {
    return null;
  }

  const ok = pings.filter((ping) => ping.success).length;

  return Math.round((ok / pings.length) * 100);
}

/** Latência média, ignorando as medições sem resposta. */
export function averageLatency(pings = []) {
  const values = pings
    .filter((ping) => ping.success && typeof ping.latency === 'number')
    .map((ping) => ping.latency);

  if (values.length === 0) {
    return null;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export const pluralize = (count, singular, plural) =>
  `${count} ${count === 1 ? singular : plural}`;
