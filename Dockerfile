FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

# ----------------------------

FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

# frontend build
COPY --from=builder /app/dist ./dist

# backend
COPY --from=builder /app/server.ts ./server.ts

# copy backend source
COPY --from=builder /app/src ./src

# data folder
COPY --from=builder /app/data ./data

EXPOSE 3000

CMD ["npx", "tsx", "server.ts"]
