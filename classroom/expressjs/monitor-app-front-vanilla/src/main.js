/**
 * Ponto de entrada: liga o tema, registra as rotas e entrega o controle ao
 * roteador.
 *
 * Cada tela é uma função que recebe onde desenhar. Não há framework nem
 * estado global: o que uma tela precisa, ela busca na API ao abrir.
 */

/*
 * O CSS importado pelo JavaScript parece estranho, e é proposital: é assim que
 * o Vite descobre que o estilo faz parte desta aplicação. Em desenvolvimento
 * ele injeta na página e troca a quente; no build, extrai para um `.css` com
 * hash no nome e pendura o `<link>` no `index.html` gerado.
 */
import './style.css';

import { route, startRouter } from './router.js';
import { session } from './session.js';
import { qs } from './ui/dom.js';
import { toast } from './ui/feedback.js';
import { applyTheme } from './ui/layout.js';
import { signinView, signupView } from './views/auth.js';
import { dashboardView } from './views/dashboard.js';
import { hostView } from './views/host.js';
import { landingView } from './views/landing.js';
import { tagsView } from './views/tags.js';

// Antes do primeiro render, para a página não piscar branca em tema escuro.
applyTheme();

/* Sem escolha salva, a interface acompanha o sistema em tempo real. */
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (localStorage.getItem('monitor:theme') === null) {
    applyTheme();
  }
});

route('/', landingView);
route('/entrar', signinView);
route('/cadastro', signupView);

route('/app', dashboardView, { protected: true });
route('/app/tags', tagsView, { protected: true });
route('/app/hosts/:id', hostView, { protected: true });

startRouter(qs('#app'));

/**
 * Rede de segurança: um erro não previsto em uma tela não pode deixar a
 * página em branco e silenciosa. O usuário fica sabendo, e o detalhe vai para
 * o console de quem está desenvolvendo.
 */
addEventListener('unhandledrejection', (event) => {
  console.error(event.reason);
  toast('Algo deu errado. Tente de novo.', 'error');
});

/* Em aula: `monitor.session` no console ajuda a inspecionar o estado. */
globalThis.monitor = { session };
