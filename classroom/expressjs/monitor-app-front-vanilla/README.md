# monitor-app-front-vanilla

Front-end da [monitor-app-api](../monitor-app-api) em JavaScript puro — sem
framework, sem bundler, sem etapa de build. Tailwind CSS pelo CDN.

## Rodando

São dois servidores. Primeiro a API, em um terminal:

```bash
cd ../monitor-app-api && npm run dev
```

Depois o front, em outro:

```bash
npm run dev
```

O front sobe em <http://localhost:5173> e fala com a API em
<http://localhost:3000>.

> **Por que não abrir o `index.html` direto?** Módulos ES são bloqueados em
> `file://` pela política de mesma origem — o navegador recusa o `import` antes
> mesmo de tentar. O `server.js` existe só para isso: servir os arquivos por
> HTTP. São 60 linhas e nenhuma dependência.

Para apontar para outra API, sem editar código, no console do navegador:

```js
localStorage.apiUrl = 'http://192.168.0.10:3000/api';
```

## Telas

| Rota | Tela |
| --- | --- |
| `#/` | Landing page pública |
| `#/entrar`, `#/cadastro` | Autenticação |
| `#/app` | Dashboard — a tela inicial depois do login |
| `#/app/hosts/:id` | Detalhe do host, com histórico |
| `#/app/tags` | Tags |

## Como está organizado

```
index.html         tema do Tailwind e classes de componente (.btn, .card, .input)
server.js          servidor estático de desenvolvimento
src/
  main.js          registra as rotas e dá a partida
  router.js        roteador por hash, com rotas protegidas
  api.js           a única porta de saída para a API
  session.js       token e usuário no localStorage
  ui/              dom, formatação, ícones, avisos, casco das telas
  views/           uma função por tela
```

Quatro decisões que valem a leitura do código:

**Nenhuma tela chama `fetch`.** Tudo passa pelo `api.js`, que é onde o token é
anexado, o erro `{ error, issues }` vira um `ApiError` e o 401 encerra a
sessão. Se cada tela tratasse o 401 por conta própria, uma delas esqueceria.

**O HTML é escapado por padrão.** A tag `html` do `ui/dom.js` escapa toda
interpolação; inserir HTML confiável exige dizer `raw()` explicitamente. Sem
isso, um host chamado `<img src=x onerror=...>` viraria script na página — e,
com o token no `localStorage`, viraria token roubado.

**Os listeners nascem e morrem com a tela.** O container `#app` vive enquanto a
página existir: pendurar listeners nele a cada navegação os empilha, e o
terceiro clique dispara três vezes. O `renderRoot` devolve o elemento recém-criado
para que os listeners sejam descartados junto com ele.

**A rota protegida é conforto, não segurança.** Esconder a tela não protege
dado nenhum — quem protege é a API, que exige o token em toda rota. O roteador
só evita mostrar um painel que cairia em 401.

## CORS

O navegador trata `localhost:5173` e `localhost:3000` como origens diferentes.
A API traz um middleware de CORS (`src/middlewares/cors.ts`) com a origem
liberada em `ALLOWED_ORIGIN` — `*` em desenvolvimento, a origem exata em
produção.
