# syntax=docker/dockerfile:1

# ---- dependencies (all, for building) -------------------------------------
FROM node:24-slim AS deps
# Prisma's engines (generate, migrate) need OpenSSL
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build: Prisma client + one bundled server file -----------------------
FROM deps AS build
COPY . .
RUN npm run build

# ---- migrate: `docker compose run --rm migrate` applies pending migrations --
FROM deps AS migrate
COPY prisma ./prisma
COPY prisma.config.ts ./
CMD ["npx", "prisma", "migrate", "deploy"]

# ---- runtime: production packages + the bundle ----------------------------
FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
# The prisma CLI (with its studio, ~300 MB) is a dev dependency and also an optional
# peer of @prisma/client, so --omit=dev alone keeps it. Without the dev list nothing
# asks for it. The running API doesn't need it; the migrate stage has it.
RUN npm pkg delete devDependencies  && npm install --omit=dev --no-audit --no-fund  && npm cache clean --force
COPY --from=build /app/dist ./dist
# the Supabase CA certificate (public), for DATABASE_SSL_CA=./certs/supabase-ca.crt
COPY certs ./certs
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--enable-source-maps", "dist/server.js"]
