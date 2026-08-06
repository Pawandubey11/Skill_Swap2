# ==========================
# Stage 1 - Build Frontend
# ==========================
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build


# ==========================
# Stage 2 - Production
# ==========================
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

# Frontend build
COPY --from=builder /app/dist ./dist

# Backend files
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src ./src

# Data folder (courses.json)
COPY --from=builder /app/data ./data

# Optional (good practice)
COPY --from=builder /app/.env.example ./.env.example

EXPOSE 3000

CMD ["npx", "tsx", "server.ts"]
