/**
 * Ícones em SVG embutido.
 *
 * Nenhuma biblioteca e nenhuma requisição: o ícone herda a cor do texto
 * (`currentColor`) e o tamanho vem da classe. São poucos e todos do mesmo
 * traçado, o que é metade do trabalho de parecer um conjunto coerente.
 */

import { raw } from './dom.js';

const svg = (path, { size = 20, stroke = 1.75 } = {}) =>
  raw(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`,
  );

export const icons = {
  pulse: (o) => svg('<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>', o),
  plus: (o) => svg('<path d="M5 12h14M12 5v14"/>', o),
  search: (o) =>
    svg('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>', o),
  refresh: (o) =>
    svg(
      '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
      o,
    ),
  trash: (o) =>
    svg(
      '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6"/><path d="M10 11v6M14 11v6"/>',
      o,
    ),
  pencil: (o) =>
    svg(
      '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
      o,
    ),
  tag: (o) =>
    svg(
      '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.2 8.2a2 2 0 0 0 2.8 0l7.2-7.2a2 2 0 0 0 0-2.8Z"/><circle cx="7" cy="7" r="1.2" fill="currentColor"/>',
      o,
    ),
  server: (o) =>
    svg(
      '<rect x="2" y="3" width="20" height="8" rx="2"/><rect x="2" y="13" width="20" height="8" rx="2"/><path d="M6 7h.01M6 17h.01"/>',
      o,
    ),
  logout: (o) =>
    svg(
      '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
      o,
    ),
  check: (o) => svg('<path d="M20 6 9 17l-5-5"/>', o),
  alert: (o) =>
    svg(
      '<circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16h.01"/>',
      o,
    ),
  x: (o) => svg('<path d="M18 6 6 18M6 6l12 12"/>', o),
  arrowLeft: (o) => svg('<path d="M19 12H5M12 19l-7-7 7-7"/>', o),
  arrowRight: (o) => svg('<path d="M5 12h14M12 5l7 7-7 7"/>', o),
  sun: (o) =>
    svg(
      '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
      o,
    ),
  moon: (o) => svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>', o),
  clock: (o) => svg('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>', o),
  gauge: (o) =>
    svg('<path d="M12 14 16 10"/><path d="M3.3 17a10 10 0 1 1 17.4 0"/>', o),
  shield: (o) =>
    svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>', o),
  zap: (o) => svg('<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>', o),
  layers: (o) =>
    svg(
      '<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 17 9 5 9-5"/><path d="m3 12 9 5 9-5"/>',
      o,
    ),
  github: (o) =>
    svg(
      '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3-.3 6.2-1.5 6.2-6.7A5.2 5.2 0 0 0 19.9 5a4.9 4.9 0 0 0-.1-3.6s-1.1-.3-3.7 1.4a12.7 12.7 0 0 0-6.6 0C6.9 1.1 5.8 1.4 5.8 1.4A4.9 4.9 0 0 0 5.7 5a5.2 5.2 0 0 0-1.4 3.8c0 5.2 3.2 6.4 6.2 6.7a3.4 3.4 0 0 0-.9 2.6V22"/>',
      o,
    ),
};
