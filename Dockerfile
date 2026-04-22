# 1. Base
FROM node:20-bookworm-slim AS base
WORKDIR /app

# `canvas` and the PDF generation stack expect glibc and native shared libs.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    libpixman-1-0 \
    libpng16-16 \
    librsvg2-2 \
    libstdc++6 \
  && rm -rf /var/lib/apt/lists/*

# 2. Dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY node_modules ./node_modules

# 3. Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Déclaration des variables build-time
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
ARG NEXT_PUBLIC_HOST_URL
ARG NEXT_PUBLIC_SSO_URL
ARG NEXT_PUBLIC_GROUP
ARG NEXT_PUBLIC_SCHOOL_NAME
ARG NEXT_PUBLIC_INSTITUT
ARG NEXT_PUBLIC_SECTION
ARG NEXT_PUBLIC_SHORT_SECTION
ARG NEXT_PUBLIC_SECTION_REF
ARG NEXT_PUBLIC_CHEF
ARG NEXT_PUBLIC_CONTACT
ARG NEXT_PUBLIC_EMAIL
ARG NEXT_PUBLIC_ADRESS

# Injection dans l’environnement
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY \
    NEXT_PUBLIC_HOST_URL=$NEXT_PUBLIC_HOST_URL \
    NEXT_PUBLIC_SSO_URL=$NEXT_PUBLIC_SSO_URL \
    NEXT_PUBLIC_GROUP=$NEXT_PUBLIC_GROUP \
    NEXT_PUBLIC_SCHOOL_NAME=$NEXT_PUBLIC_SCHOOL_NAME \
    NEXT_PUBLIC_INSTITUT=$NEXT_PUBLIC_INSTITUT \
    NEXT_PUBLIC_SECTION=$NEXT_PUBLIC_SECTION \
    NEXT_PUBLIC_SHORT_SECTION=$NEXT_PUBLIC_SHORT_SECTION \
    NEXT_PUBLIC_SECTION_REF=$NEXT_PUBLIC_SECTION_REF \
    NEXT_PUBLIC_CHEF=$NEXT_PUBLIC_CHEF \
    NEXT_PUBLIC_CONTACT=$NEXT_PUBLIC_CONTACT \
    NEXT_PUBLIC_EMAIL=$NEXT_PUBLIC_EMAIL \
    NEXT_PUBLIC_ADRESS=$NEXT_PUBLIC_ADRESS \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# 4. Production image (Standalone)
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
