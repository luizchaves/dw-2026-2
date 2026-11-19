/**
 * Servidor estático do build, sem nenhuma dependência.
 *
 * Desenvolvimento agora é com o Vite (`npm run dev`), que serve os módulos e
 * troca o que mudou sem recarregar a página. Este arquivo ficou com o outro
 * papel: servir o `dist/` já compilado — é o que o container faz.
 *
 * Serve como demonstração de que o resultado de um build é só um punhado de
 * arquivos estáticos. Em produção de verdade, Nginx, Caddy ou uma CDN fazem
 * o mesmo trabalho melhor.
 */

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const PORT = Number(process.env.PORT ?? 5173);

// A raiz é o `dist/`: sem `npm run build` antes, não há o que servir.
const ROOT = resolve(import.meta.dirname, 'dist');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  // O @fontsource publica os dois formatos; o .woff é o retrato do navegador antigo.
  '.woff': 'font/woff',
};

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://localhost:${PORT}`);

  /**
   * `normalize` resolve os `..` antes de juntar com a raiz, e a checagem
   * seguinte recusa o que escapou dela. Sem isso, um pedido a
   * `/../../.env` serviria arquivos de fora do projeto — a travessia de
   * diretório, que é o erro clássico de servidor de arquivos escrito à mão.
   */
  const unsafe = join(ROOT, normalize(decodeURIComponent(pathname)));
  const path = unsafe.startsWith(ROOT + '/') || unsafe === ROOT ? unsafe : ROOT;

  let file = path;

  try {
    if ((await stat(file)).isDirectory()) {
      file = join(file, 'index.html');
      await stat(file);
    }
  } catch {
    // Aplicação de uma página só: o que não é arquivo é rota do front.
    file = join(ROOT, 'index.html');
  }

  res.writeHead(200, {
    'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });

  createReadStream(file).pipe(res);
}).listen(PORT, () => {
  console.log(`Front (build) rodando em http://localhost:${PORT}`);
  console.log('A API precisa estar no ar em http://localhost:3000');
});
