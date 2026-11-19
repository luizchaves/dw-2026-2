# monitor-app-front-vanilla

Front-end da [monitor-app-api](../monitor-app-api) em JavaScript puro — sem
framework. O Vite cuida das dependências e do build; o Tailwind CSS 4 entra
como plugin dele.

## Rodando

Uma vez, as dependências:

```bash
npm install
```

São dois servidores. Primeiro a API, em um terminal:

```bash
cd ../monitor-app-api && npm run dev
```

Depois o front, em outro:

```bash
npm run dev
```

O front sobe em <http://localhost:5173> e fala com a API em
<http://localhost:3000>. Salvar um arquivo atualiza a página na hora, sem
recarregar e sem perder o que estava na tela.

Para gerar a versão de produção em `dist/` e servi-la com o `server.js`:

```bash
npm run build && npm start
```

> **Por que não abrir o `index.html` direto?** Módulos ES são bloqueados em
> `file://` pela política de mesma origem — o navegador recusa o `import` antes
> mesmo de tentar. Era para isso que existia o `server.js`; hoje o Vite faz
> isso e muito mais em desenvolvimento, e o `server.js` ficou com o papel de
> servir o `dist/` compilado.

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
index.html         o esqueleto da página, e só
vite.config.js     o Vite e o plugin do Tailwind
server.js          serve o dist/ compilado (é o que roda no container)
src/
  style.css        tema, classes de componente (.btn, .card, .input) e a fonte
  main.js          registra as rotas e dá a partida
  router.js        roteador por hash, com rotas protegidas
  api.js           a única porta de saída para a API
  session.js       token e usuário no localStorage
  ui/              dom, formatação, ícones, avisos, casco das telas
  views/           uma função por tela
```

Cinco decisões que valem a leitura do código:

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

**As dependências são declaradas, não copiadas.** O Tailwind já foi um
`<script>` de CDN e já foi um arquivo de 400 KB dentro do repositório. As duas
formas quebram de jeitos diferentes: a primeira depende de um servidor de
terceiros continuar no ar e com o mesmo contrato — foi assim que a página
perdeu o estilo quando o `cdn.tailwindcss.com` parou de mandar
`Access-Control-Allow-Origin` —, e a segunda não tem como ser atualizada sem
alguém lembrar de baixar de novo. Com o Vite, a versão está no `package.json`,
fixada no `package-lock.json`, e o build entrega ao navegador só o CSS das
classes que o projeto usa: 54 KB em vez do compilador inteiro. O mesmo vale
para a fonte, que vem do npm em vez do Google Fonts.

## CORS

O navegador trata `localhost:5173` e `localhost:3000` como origens diferentes.
A API traz um middleware de CORS (`src/middlewares/cors.ts`) com a origem
liberada em `ALLOWED_ORIGIN` — `*` em desenvolvimento, a origem exata em
produção.
