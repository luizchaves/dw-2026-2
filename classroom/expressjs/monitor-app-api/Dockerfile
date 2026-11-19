# Uma imagem, um estágio: o projeto roda TypeScript direto com o tsx, então não
# existe etapa de build para separar em dois.
#
# Node 24 é a versão usada em aula. O `-slim` é o Debian enxuto: muito menor
# que a imagem cheia e, diferente da `-alpine`, com a glibc — para a qual o
# better-sqlite3 já distribui binário pronto. Em Alpine (musl) ele teria que
# ser compilado aqui dentro, o que exigiria python3, make e g++ na imagem.
FROM node:24-slim

# O `ping`, que a imagem do Node não traz.
#
# A aplicação mede os hosts chamando o binário do sistema (`src/lib/ping.ts`),
# e a `node:24-slim` é enxuta justamente por não ter o que não é Node. Sem
# esta linha tudo sobe, a API responde, e cada medição falha em silêncio: o
# `execFile` não acha o programa, o erro vira `{ success: false }` e todo host
# aparece offline. É o "na minha máquina funciona" ao contrário — no macOS e
# no Linux de mesa o `ping` já está lá.
#
# O `rm` das listas do apt na mesma instrução não é frescura: cada instrução
# é uma camada, e o que for apagado em uma camada seguinte continua ocupando
# espaço na imagem.
RUN apt-get update \
  && apt-get install -y --no-install-recommends iputils-ping \
  && rm -rf /var/lib/apt/lists/*

# Dentro do container a aplicação é a única coisa que existe: um diretório basta.
WORKDIR /app

# O manifesto antes do código, e não tudo de uma vez.
#
# Cada instrução do Dockerfile gera uma camada em cache, e o Docker refaz a
# partir da primeira que mudou. Dependências mudam uma vez por semestre;
# código muda a cada aula. Nesta ordem, editar uma linha de TypeScript
# aproveita o `npm ci` já instalado; na ordem inversa, reinstalaria tudo.
COPY package.json package-lock.json ./

# `ci` em vez de `install`: instala exatamente as versões do lock e falha se o
# lock estiver desatualizado — é o que faz a imagem de hoje ser igual à de
# amanhã. As devDependencies ficam, porque o CLI do Prisma (que aplica as
# migrações na partida) é uma delas.
RUN npm ci

# O generate precisa do schema e da config, não do resto do código.
COPY prisma ./prisma
COPY prisma.config.ts ./

# Caminho absoluto, e não o `file:./prisma/db.sqlite` do `.env` de
# desenvolvimento: aqui o banco fica no volume montado em /app/data. As outras
# variáveis (JWT_SECRET, ALLOWED_ORIGIN...) chegam do Compose em tempo de
# execução — segredo não se escreve no Dockerfile.
#
# Vem antes do `generate` porque o `prisma.config.ts` exige a variável para
# carregar: sem ela, o CLI para com `Cannot resolve environment variable`
# mesmo em um comando que nem abre conexão.
ENV DATABASE_URL="file:/app/data/db.sqlite"

# O client do Prisma não vem no pacote: é gerado a partir do schema, dentro de
# node_modules. Sem isto, o `import { PrismaClient }` do src não acha nada.
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src

# O banco fica em /app/data, fora de /app/prisma, de propósito.
#
# O arquivo SQLite precisa sobreviver ao container — isso é trabalho de volume
# (veja o compose.yaml). Se o volume fosse montado em /app/prisma, ele
# esconderia as migrações que acabamos de copiar para lá.
#
# O chown é por causa do USER abaixo: um volume nomeado nasce com o dono que o
# diretório tem na imagem, e o processo precisa poder escrever nele.
RUN mkdir -p /app/data && chown -R node:node /app

# As imagens do Node já trazem o usuário `node`. Rodar como root dentro do
# container é desnecessário: se a aplicação for comprometida, o atacante
# começa com menos poder.
USER node

# Documenta a porta para quem lê o Dockerfile e para as ferramentas; quem
# realmente publica a porta é o `ports` do Compose.
EXPOSE 3000

# A migração roda na partida, não no build: o banco mora no volume, que pode
# estar vazio (primeira execução) ou atrasado (migração nova). `migrate
# deploy` aplica só o que falta e não apaga nada — é o comando de produção,
# diferente do `migrate dev`, que recria o banco quando acha divergência.
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx src/index.ts"]
