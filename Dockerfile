# syntax=docker/dockerfile:1
#
# One image for the app (UI + API) and one for the database setup job, built
# from the same dependency install:
#
#   docker build --target web     -t iutverse-web .
#   docker build --target migrate -t iutverse-migrate .
#
# docker-compose.yml builds both.

FROM node:22-bookworm-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Inlined into the browser bundle at build time. All are public by design (the
# project URL, the anon key and the sign-in providers to offer); server secrets
# are supplied at run time only.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_OAUTH_PROVIDERS
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_OAUTH_PROVIDERS=$NEXT_PUBLIC_OAUTH_PROVIDERS
RUN npm run build

# One-off job: applies supabase/migrations and loads the starter data.
FROM base AS migrate
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
RUN npm prune --omit=dev --ignore-scripts && npm cache clean --force
COPY scripts ./scripts
COPY supabase ./supabase
USER node
CMD ["node", "scripts/dockerInit.js"]

# The app: Next.js standalone server (only the files it traced are copied).
FROM base AS web
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
# Standalone output leaves public/ out; the server still serves it from here.
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "server.js"]
