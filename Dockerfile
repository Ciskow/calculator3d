# 1) compila o cliente React
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.ts tsconfig.json ./
COPY public ./public
COPY src ./src
RUN npm run build

# 2) imagem final: só dependências de produção, servidor e cliente compilado.
#    O Node 24 executa os arquivos .ts do servidor diretamente.
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=80 \
    DATA_FILE_PATH=/data/db.json
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY src/server ./src/server
COPY src/shared ./src/shared
COPY --from=build /app/dist ./dist
VOLUME /data
EXPOSE 80
CMD ["node", "src/server/index.ts"]
