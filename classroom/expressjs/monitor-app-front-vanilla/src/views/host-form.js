/**
 * O diálogo de cadastro e edição de host.
 *
 * Um formulário só para as duas operações: os campos são os mesmos, e a API
 * recebe o mesmo corpo em `POST` e `PUT`. O que muda é o título, o rótulo do
 * botão e o que acontece no envio.
 */

import { api, ApiError } from '../api.js';
import { html, qs, qsa, render } from '../ui/dom.js';
import { toast, withLoading } from '../ui/feedback.js';
import { icons } from '../ui/icons.js';

/**
 * Abre o diálogo e resolve com o host salvo — ou `null` se o usuário desistiu.
 * Quem chamou decide o que fazer com o resultado.
 */
export function hostDialog({ host = null, tags = [] } = {}) {
  const editando = host !== null;

  return new Promise((resolve) => {
    const root = qs('#modal-root');

    render(
      root,
      html`
        <div
          class="fixed inset-0 z-40 flex items-end justify-center overflow-y-auto bg-zinc-950/40 p-4 backdrop-blur-xs sm:items-center"
          data-overlay
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="host-dialog-title"
            class="card w-full max-w-md p-5 shadow-xl animate-fade-up"
          >
            <div class="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="host-dialog-title" class="text-base font-semibold">
                  ${editando ? 'Editar host' : 'Novo host'}
                </h2>
                <p class="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                  ${editando
                    ? 'As alterações valem a partir da próxima medição.'
                    : 'Um endereço IP ou um domínio que responda a ping.'}
                </p>
              </div>
              <button
                class="btn btn-ghost btn-icon -mr-1.5 -mt-1"
                data-cancel
                aria-label="Fechar"
              >
                ${icons.x({ size: 16 })}
              </button>
            </div>

            <form class="space-y-4" novalidate>
              <div>
                <label class="label" for="host-name">Nome</label>
                <input
                  class="input"
                  id="host-name"
                  name="name"
                  value="${host?.name ?? ''}"
                  placeholder="Servidor de produção"
                  aria-describedby="name-erro"
                />
                <p class="hint-error hidden" id="name-erro" role="alert"></p>
              </div>

              <div>
                <label class="label" for="host-address">Endereço</label>
                <input
                  class="input font-mono text-[13px]"
                  id="host-address"
                  name="address"
                  value="${host?.address ?? ''}"
                  placeholder="8.8.8.8 ou exemplo.com.br"
                  spellcheck="false"
                  autocapitalize="off"
                  aria-describedby="address-erro"
                />
                <p class="hint-error hidden" id="address-erro" role="alert"></p>
              </div>

              <div>
                <label class="label" for="host-tags">Tags</label>
                <input
                  class="input"
                  id="host-tags"
                  name="tags"
                  value="${(host?.tags ?? []).map((tag) => tag.name).join(', ')}"
                  placeholder="producao, dns"
                  list="tags-existentes"
                  aria-describedby="tags-ajuda"
                />
                <!-- Sugere as que já existem sem impedir uma nova. -->
                <datalist id="tags-existentes">
                  ${tags.map((tag) => html`<option value="${tag.name}"></option>`)}
                </datalist>
                <p
                  class="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500"
                  id="tags-ajuda"
                >
                  Separe por vírgula. As que não existirem serão criadas.
                </p>
                <p class="hint-error hidden" id="tags-erro" role="alert"></p>
              </div>

              <p
                class="hidden items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
                data-form-error
                role="alert"
              ></p>

              <div class="flex justify-end gap-2 pt-1">
                <button type="button" class="btn btn-outline" data-cancel>
                  Cancelar
                </button>
                <button type="submit" class="btn btn-primary">
                  ${editando ? 'Salvar' : 'Cadastrar host'}
                </button>
              </div>
            </form>
          </div>
        </div>
      `,
    );

    const form = qs('form', root);

    const close = (value) => {
      root.innerHTML = '';
      document.removeEventListener('keydown', onKey);
      resolve(value);
    };

    function onKey(event) {
      if (event.key === 'Escape') {
        close(null);
      }
    }

    document.addEventListener('keydown', onKey);

    qsa('[data-cancel]', root).forEach((button) =>
      button.addEventListener('click', () => close(null)),
    );

    qs('[data-overlay]', root).addEventListener('click', (event) => {
      if (event.target.dataset.overlay !== undefined) {
        close(null);
      }
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      qsa('.hint-error', form).forEach((element) => {
        element.classList.add('hidden');
        element.textContent = '';
      });
      qsa('.input', form).forEach((input) =>
        input.classList.remove('input-error'),
      );
      qs('[data-form-error]', form).classList.add('hidden');

      const data = Object.fromEntries(new FormData(form));

      const body = {
        name: data.name.trim(),
        address: data.address.trim(),
        // "producao, dns, " vira ['producao', 'dns']: o schema recusa nome vazio.
        tags: data.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      };

      try {
        const saved = await withLoading(
          qs('[type="submit"]', form),
          'Salvando…',
          () =>
            editando ? api.updateHost(host.id, body) : api.createHost(body),
        );

        toast(editando ? 'Host atualizado.' : `“${saved.name}” está sendo monitorado.`);
        close(saved);
      } catch (error) {
        if (!(error instanceof ApiError)) {
          throw error;
        }

        let apontado = false;

        for (const campo of ['name', 'address', 'tags']) {
          const message = error.fieldError(campo);

          if (!message) {
            continue;
          }

          const input = qs(`[name="${campo}"]`, form);
          const hint = qs(`#${campo}-erro`, form);

          input.classList.add('input-error');
          hint.classList.remove('hidden');
          hint.classList.add('flex');
          hint.textContent = message;

          if (!apontado) {
            input.focus();
            apontado = true;
          }
        }

        if (!apontado) {
          const box = qs('[data-form-error]', form);

          box.classList.remove('hidden');
          box.classList.add('flex');
          box.textContent = error.message;
        }
      }
    });

    qs('#host-name', root).focus();
  });
}
