# 1. Base image
FROM node:20-alpine AS base

# 2. Dependencies
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
COPY .env.local .env.local
RUN npm install --frozen-lockfile

# 3. Build
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# 4. Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copier uniquement ce qui est nécessaire
COPY --from=builder /app ./

EXPOSE 3000

CMD ["npm", "run", "start"]