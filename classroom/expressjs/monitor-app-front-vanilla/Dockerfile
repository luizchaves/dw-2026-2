# Duas etapas: uma que compila, outra que serve.
#
# Com o Vite no caminho, o front passou a ter build — e ferramenta de build é
# coisa de máquina de construção, não de máquina de produção. O primeiro
# estágio instala as dependências e gera o `dist/`; o segundo recebe só o
# resultado. A imagem final não tem Vite, não tem Tailwind e não tem
# `node_modules`: tem arquivos estáticos e um servidor de 60 linhas.

FROM node:24-slim AS build

WORKDIR /app

# Mesma ordem da API, e pelo mesmo motivo: o cache das dependências não se
# perde a cada mudança no código.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Aqui o Tailwind varre o HTML e o JavaScript, descobre as classes usadas e
# escreve o CSS; o Vite junta tudo em `dist/`, com hash no nome dos arquivos.
RUN npm run build

# --- a imagem que vai para o ar --------------------------------------------

FROM node:24-slim

WORKDIR /app

# Só o build e o servidor. Nada do que foi preciso para chegar até eles.
COPY --from=build /app/dist ./dist
COPY server.js ./

USER node

# O server.js lê a porta do ambiente (`process.env.PORT ?? 5173`).
ENV PORT=5173

EXPOSE 5173

CMD ["node", "server.js"]
