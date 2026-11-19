/** Avisos e confirmações: as duas conversas curtas que a interface tem. */

import { html, qs, render } from './dom.js';
import { icons } from './icons.js';

const TONES = {
  success: {
    icon: icons.check,
    classes: 'text-emerald-600 dark:text-emerald-400',
  },
  error: { icon: icons.alert, classes: 'text-rose-600 dark:text-rose-400' },
  info: { icon: icons.pulse, classes: 'text-brand-600 dark:text-brand-400' },
};

/**
 * Aviso curto no canto da tela.
 *
 * Sai sozinho depois de alguns segundos — e some mais rápido quando é só
 * confirmação de algo que o usuário acabou de fazer, porque ele já sabe.
 */
export function toast(message, tone = 'success', timeout = 4000) {
  const { icon, classes } = TONES[tone] ?? TONES.info;

  const element = document.createElement('div');

  element.className =
    'pointer-events-auto flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-3.5 shadow-lg animate-fade-up dark:border-zinc-800 dark:bg-zinc-900';

  render(
    element,
    html`
      <span class="${classes} mt-0.5 shrink-0">${icon({ size: 18 })}</span>
      <p class="flex-1 text-sm leading-snug text-zinc-700 dark:text-zinc-300">
        ${message}
      </p>
      <button
        class="btn btn-ghost -m-1 h-7 w-7 px-0 shrink-0"
        aria-label="Fechar aviso"
      >
        ${icons.x({ size: 14 })}
      </button>
    `,
  );

  const remove = () => {
    element.style.opacity = '0';
    element.style.transition = 'opacity .15s';
    setTimeout(() => element.remove(), 150);
  };

  qs('button', element).addEventListener('click', remove);
  qs('#toasts').append(element);
  setTimeout(remove, timeout);
}

/**
 * Confirmação antes do que não tem volta.
 *
 * Devolve uma promessa: a tela escreve `if (await confirm(...))` e lê como
 * uma pergunta, não como um emaranhado de callbacks. O botão perigoso recebe
 * o foco só depois que o diálogo aparece — e `Esc` cancela, como todo diálogo
 * do sistema.
 */
export function confirmDialog({
  title,
  message,
  confirmLabel = 'Confirmar',
  tone = 'danger',
}) {
  return new Promise((resolve) => {
    const root = qs('#modal-root');

    render(
      root,
      html`
        <div
          class="fixed inset-0 z-40 flex items-end justify-center bg-zinc-950/40 p-4 backdrop-blur-sm sm:items-center"
          data-overlay
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            class="card w-full max-w-sm p-5 shadow-xl animate-fade-up"
          >
            <h2
              id="dialog-title"
              class="text-base font-semibold text-zinc-900 dark:text-zinc-100"
            >
              ${title}
            </h2>
            <p class="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
              ${message}
            </p>
            <div class="mt-5 flex justify-end gap-2">
              <button class="btn btn-outline" data-cancel>Cancelar</button>
              <button
                class="btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}"
                data-confirm
              >
                ${confirmLabel}
              </button>
            </div>
          </div>
        </div>
      `,
    );

    const close = (answer) => {
      root.innerHTML = '';
      document.removeEventListener('keydown', onKey);
      resolve(answer);
    };

    function onKey(event) {
      if (event.key === 'Escape') {
        close(false);
      }
    }

    document.addEventListener('keydown', onKey);
    qs('[data-cancel]', root).addEventListener('click', () => close(false));
    qs('[data-confirm]', root).addEventListener('click', () => close(true));
    qs('[data-overlay]', root).addEventListener('click', (event) => {
      if (event.target.dataset.overlay !== undefined) {
        close(false);
      }
    });

    qs('[data-confirm]', root).focus();
  });
}

/** Desabilita o botão e troca o rótulo enquanto a promessa não resolve. */
export async function withLoading(button, label, action) {
  const original = button.innerHTML;

  button.disabled = true;
  button.innerHTML = `<span class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>${label}`;

  try {
    return await action();
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}
