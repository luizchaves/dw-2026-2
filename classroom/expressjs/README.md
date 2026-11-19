# monitor-app com Docker

As duas aplicações da pasta — a [API](monitor-app-api) e o
[front](monitor-app-front-vanilla) — sobem juntas. Uma vez, a configuração:

```bash
cp monitor-app-api/.env.example monitor-app-api/.env
```

Depois, sempre:

```bash
docker compose up --build
```

| Serviço | Endereço | O que é |
| --- | --- | --- |
| `front` | <http://localhost:5173> | o front em JavaScript puro |
| `api` | <http://localhost:3000/api> | a API Express |
| | <http://localhost:3000/api/docs> | documentação interativa (Swagger) |

Para popular o banco com os dados de exemplo, com os containers no ar:

```bash
docker compose exec api npm run db:seed
```

Comandos do dia a dia:

```bash
docker compose logs -f api
```

```bash
docker compose down
```

```bash
docker compose down -v
```

O `down` para os containers e preserva o banco; o `down -v` remove o volume
junto, e o banco volta vazio na próxima subida.

## Por que Docker aqui

Rodar na máquina exige Node na versão certa, `npm ci` em duas pastas, um `.env`
copiado do exemplo, a migração aplicada e dois terminais abertos na ordem
correta. Cada passo é um lugar onde "na minha máquina funciona". A imagem
carrega tudo isso dentro: a mesma versão do Node, as mesmas dependências e o
mesmo comando de partida em qualquer computador da turma.

## O que cada arquivo faz

```
compose.yaml                      as duas aplicações, as portas e o volume
monitor-app-api/Dockerfile        receita da imagem da API
monitor-app-api/.dockerignore     o que não entra na imagem
monitor-app-front-vanilla/...     o mesmo par, para o front — em dois estágios
```

O Dockerfile do front tem duas etapas: a primeira instala as dependências e
roda o `vite build`; a segunda recebe só o `dist/` e o `server.js`. A imagem
que vai para o ar não tem Vite, não tem Tailwind e não tem `node_modules` —
ferramenta de build é coisa de máquina de construção.

Os três estão comentados linha a linha — vale ler na ordem `Dockerfile` da API,
`Dockerfile` do front, `compose.yaml`.

## Três detalhes que costumam derrubar o setup

**O banco precisa de volume.** O sistema de arquivos do container é
descartável: sem o volume `api-data`, cada `docker compose down` apagaria os
usuários cadastrados em aula. O volume fica montado em `/app/data`, e não em
`/app/prisma`, porque uma montagem ali esconderia as migrações que estão na
imagem.

**A migração roda na partida, não no build.** O banco vive no volume, que pode
estar vazio na primeira execução ou atrasado depois de uma migração nova. Por
isso o `CMD` da API é `prisma migrate deploy && tsx src/index.ts`.

**O segredo não entra na imagem.** O `JWT_SECRET` e as outras variáveis vêm
do `monitor-app-api/.env`, que o Git ignora e o `.dockerignore` mantém fora da
imagem. O Compose lê o arquivo na sua máquina (`env_file`) e repassa as
variáveis ao processo, então a mesma imagem serve para qualquer ambiente — só
o ambiente muda. O `DATABASE_URL` é a exceção declarada em `environment`, que
tem precedência sobre o `env_file`: no container o banco está no volume, não
em `prisma/db.sqlite`.

**A imagem precisa do `ping`.** A `node:24-slim` traz o Node e pouco mais, e a
aplicação mede os hosts chamando o binário do sistema. Sem o
`apt-get install iputils-ping` do Dockerfile, tudo sobe sem erro nenhum e todo
host aparece offline — a falha é silenciosa, porque `src/lib/ping.ts` traduz
qualquer exceção em `{ success: false }`. Vale a pergunta diante de qualquer
imagem enxuta: de que o código depende que não é código?

**O front continua falando com `localhost:3000`.** O `api` da rede do Compose
só existe entre containers, e o `fetch` do front não roda em container nenhum:
roda no seu navegador, fora dessa rede. Quem ele alcança é a porta publicada no
seu computador. Trocar a URL por `http://api:3000/api` quebraria a aplicação.

## "address already in use"

A porta da esquerda em `ports` é a da sua máquina, e duas coisas não ocupam a
mesma. Se a API já estiver rodando fora do container (`npm run dev`), a subida
falha em `0.0.0.0:3000: bind: address already in use`. Pare o processo local ou
publique em outra porta:

```bash
docker compose ps
```

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

## Hot reload

A imagem copia o código para dentro de si: editar um arquivo aqui não muda nada
lá, até reconstruir (`docker compose up --build`). Para desenvolver com o código
montado e o `tsx watch` reiniciando a API a cada salvamento, o caminho é um
`compose.override.yaml` com *bind mount* — vale como exercício depois que o
setup acima estiver claro.
