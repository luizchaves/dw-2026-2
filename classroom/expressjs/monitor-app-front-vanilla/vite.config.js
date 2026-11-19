/**
 * O Vite faz dois trabalhos aqui.
 *
 * Em desenvolvimento (`npm run dev`), é o servidor: serve os módulos sem
 * empacotar nada e troca o que mudou na página aberta, sem recarregar. Foi o
 * que aposentou o `server.js` desse papel.
 *
 * No build (`npm run build`), junta e minifica tudo em `dist/`, com o nome dos
 * arquivos carimbado por um hash do conteúdo — o que permite cachear para
 * sempre e ainda assim publicar uma versão nova.
 */

import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  /**
   * O Tailwind como plugin do Vite, e não mais como script no navegador.
   *
   * O plugin varre o HTML e o JavaScript atrás de nomes de classe e gera **só
   * o CSS das que existem no projeto**. É a diferença entre entregar 400 KB
   * de compilador para o navegador e entregar alguns KB de CSS pronto.
   *
   * O preço: as classes precisam aparecer inteiras no código-fonte. Um
   * `bg-${cor}` montado em tempo de execução não é encontrado pela varredura e
   * simplesmente não existe no CSS final.
   */
  plugins: [tailwindcss()],

  server: {
    port: 5173,
    // Sem `host`, o Vite escuta só em 127.0.0.1 — de dentro de um container,
    // isso é inalcançável de fora.
    host: true,
  },

  preview: {
    port: 5173,
    host: true,
  },
});
