FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY server.ts ./server.ts

EXPOSE 3000

CMD ["npx", "tsx", "server.ts"]
