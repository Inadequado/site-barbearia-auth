# ---- Stage 1: build do frontend ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copia manifests primeiro pra aproveitar cache do Docker
COPY package*.json ./
RUN npm ci

# Copia o restante do projeto
COPY . .

# Build do frontend (gera /app/dist)
RUN npm run build


# ---- Stage 2: runtime ----
FROM node:20-alpine AS runtime

WORKDIR /app

# Variáveis padrão (podem ser sobrescritas via docker-compose)
ENV NODE_ENV=production
ENV PORT=3001

# Instala só as dependências necessárias pra rodar o servidor
COPY package*.json ./
RUN npm ci --omit=dev

# Copia o código do servidor e scripts (precisamos rodar via tsx)
COPY server ./server
COPY scripts ./scripts
COPY tsconfig.json ./

# Copia o build do frontend vindo do stage anterior
COPY --from=builder /app/dist ./dist

# A pasta data é montada via volume em runtime; criamos vazia caso o volume esteja vazio no primeiro start
RUN mkdir -p data

EXPOSE 3001

# tsx roda TypeScript direto, sem build do backend
CMD ["npx", "tsx", "server/index.ts"]
