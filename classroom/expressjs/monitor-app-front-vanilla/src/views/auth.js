/**
 * Entrar e criar conta.
 *
 * As duas telas compartilham o mesmo casco porque são a mesma tarefa com
 * campos diferentes — e porque o usuário troca de uma para a outra o tempo
 * todo; mudar o layout no caminho seria ruído.
 */

import { api, ApiError } from '../api.js';
import { navigate } from '../router.js';
import { session } from '../session.js';
import { html, on, qs, qsa, renderRoot } from '../ui/dom.js';
import { toast, withLoading } from '../ui/feedback.js';
import { icons } from '../ui/icons.js';
import { logo, themeButton, toggleTheme } from '../ui/layout.js';

const field = ({ name, label, type = 'text', placeholder, hint, autocomplete }) => html`
  <div>
    <label class="label" for="${name}">${label}</label>
    <div class="relative">
      <input
        class="input ${type === 'password' ? 'pr-11' : ''}"
        id="${name}"
        name="${name}"
        type="${type}"
        placeholder="${placeholder ?? ''}"
        autocomplete="${autocomplete ?? 'off'}"
        aria-describedby="${name}-erro"
      />
      ${type === 'password'
        ? html`
            <button
              type="button"
              class="absolute right-1 top-1 btn btn-ghost btn-icon h-8 w-8"
              data-toggle-password="${name}"
              aria-label="Mostrar senha"
              tabindex="-1"
            >
              ${icons.sun({ size: 15 })}
            </button>
          `
        : ''}
    </div>
    ${hint
      ? html`<p class="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500" data-hint>
          ${hint}
        </p>`
      : ''}
    <p class="hint-error hidden" id="${name}-erro" role="alert"></p>
  </div>
`;

function shell(outlet, { title, subtitle, form, footer, notice = '' }) {
  const page = renderRoot(
    outlet,
    html`
      <div class="flex min-h-screen flex-col">
        <header class="flex items-center justify-between px-4 py-5 sm:px-6">
          <a href="#/" class="rounded-lg">${logo()}</a>
          ${themeButton()}
        </header>

        <main
          id="conteudo"
          class="flex flex-1 items-center justify-center px-4 py-8"
        >
          <div class="w-full max-w-sm animate-fade-up">
            ${notice}
            <h1 class="text-2xl font-semibold tracking-tight">${title}</h1>
            <p class="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              ${subtitle}
            </p>

            <form class="mt-7 space-y-4" novalidate>
              ${form}
              <p
                class="hidden items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
                data-form-error
                role="alert"
              ></p>
            </form>

            <p class="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
              ${footer}
            </p>
          </div>
        </main>
      </div>
    `,
  );

  on(page, 'click', '[data-theme-toggle]', toggleTheme);

  on(page, 'click', '[data-toggle-password]', (_event, button) => {
    const input = qs(`#${button.dataset.togglePassword}`, page);
    const showing = input.type === 'text';

    input.type = showing ? 'password' : 'text';
    button.setAttribute('aria-label', showing ? 'Mostrar senha' : 'Ocultar senha');
  });

  return qs('form', page);
}

/** Limpa os erros de campo e o aviso do topo antes de cada envio. */
function clearErrors(form) {
  qsa('[data-form-error]', form.parentElement).forEach((element) => {
    element.classList.add('hidden');
    element.classList.remove('flex');
  });

  qsa('.hint-error', form).forEach((element) => {
    element.classList.add('hidden');
    element.classList.remove('flex');
    element.textContent = '';
  });

  qsa('.input', form).forEach((input) => input.classList.remove('input-error'));
}

/**
 * Mostra o erro onde ele aconteceu.
 *
 * Quando a API aponta o campo (`issues`), a mensagem vai embaixo do campo e o
 * foco vai para lá. Quando o erro é da requisição inteira — 401, 409 — ele vai
 * para o topo do formulário, porque não é de um campo só.
 */
function showError(form, error) {
  clearErrors(form);

  const campos = qsa('.input', form).map((input) => input.name);
  let primeiro = null;

  for (const campo of campos) {
    const message = error.fieldError?.(campo);

    if (!message) {
      continue;
    }

    const input = qs(`[name="${campo}"]`, form);
    const hint = qs(`#${campo}-erro`, form);

    input.classList.add('input-error');
    hint.classList.remove('hidden');
    hint.classList.add('flex');
    hint.textContent = message;

    primeiro ??= input;
  }

  if (primeiro) {
    primeiro.focus();

    return;
  }

  const box = qs('[data-form-error]', form);

  box.classList.remove('hidden');
  box.classList.add('flex');
  box.textContent = error.message;
}

/* ------------------------------------------------------------- entrar --- */

export function signinView(outlet, { query }) {
  const notice =
    query.expirado === '1'
      ? html`<p
          class="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
          role="status"
        >
          Sua sessão expirou. Entre de novo para continuar.
        </p>`
      : '';

  const form = shell(outlet, {
    title: 'Entrar',
    subtitle: 'Use a conta que você criou para acessar seu painel.',
    notice,
    form: html`
      ${field({
        name: 'email',
        label: 'E-mail',
        type: 'email',
        placeholder: 'voce@exemplo.com',
        autocomplete: 'email',
      })}
      ${field({
        name: 'password',
        label: 'Senha',
        type: 'password',
        placeholder: '••••••••',
        autocomplete: 'current-password',
      })}
      <button class="btn btn-primary w-full" type="submit">Entrar</button>
    `,
    footer: html`Ainda não tem conta?
      <a href="#/cadastro" class="link">Criar conta</a>`,
  });

  qs('#email', form).focus();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors(form);

    const data = Object.fromEntries(new FormData(form));

    try {
      await withLoading(qs('[type="submit"]', form), 'Entrando…', async () => {
        const { auth, token } = await api.signin(data);

        session.start(token, auth);
      });

      toast(`Bem-vindo de volta, ${session.user.name.split(' ')[0]}.`);
      navigate('/app');
    } catch (error) {
      if (error instanceof ApiError) {
        showError(form, error);
      } else {
        throw error;
      }
    }
  });
}

/* ----------------------------------------------------------- cadastro --- */

export function signupView(outlet) {
  const form = shell(outlet, {
    title: 'Criar conta',
    subtitle: 'Leva menos de um minuto. Depois é só cadastrar o primeiro host.',
    form: html`
      ${field({
        name: 'name',
        label: 'Nome',
        placeholder: 'Como podemos te chamar',
        autocomplete: 'name',
      })}
      ${field({
        name: 'email',
        label: 'E-mail',
        type: 'email',
        placeholder: 'voce@exemplo.com',
        autocomplete: 'email',
      })}
      ${field({
        name: 'password',
        label: 'Senha',
        type: 'password',
        placeholder: '••••••••',
        hint: 'No mínimo 8 caracteres.',
        autocomplete: 'new-password',
      })}
      ${field({
        name: 'confirmationPassword',
        label: 'Confirme a senha',
        type: 'password',
        placeholder: '••••••••',
        autocomplete: 'new-password',
      })}
      <button class="btn btn-primary w-full" type="submit">Criar conta</button>
    `,
    footer: html`Já tem conta? <a href="#/entrar" class="link">Entrar</a>`,
  });

  qs('#name', form).focus();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors(form);

    const data = Object.fromEntries(new FormData(form));

    try {
      await withLoading(qs('[type="submit"]', form), 'Criando…', async () => {
        await api.signup(data);

        /**
         * A API não autentica no cadastro — e fazer o usuário digitar as mesmas
         * credenciais de novo, dois segundos depois, seria burocracia. O front
         * faz o login por ele.
         */
        const { auth, token } = await api.signin({
          email: data.email,
          password: data.password,
        });

        session.start(token, auth);
      });

      toast('Conta criada. Vamos cadastrar seu primeiro host?');
      navigate('/app');
    } catch (error) {
      if (error instanceof ApiError) {
        showError(form, error);
      } else {
        throw error;
      }
    }
  });
}
