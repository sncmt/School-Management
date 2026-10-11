# syntax=docker/dockerfile:1

# ---- dependencies -----------------------------------------------------------
FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build --------------------------------------------------------------------
FROM deps AS build
COPY . .
# Baked into the build: NEXT_PUBLIC_* reach the browser code, and the /api/v1
# rewrite to API_URL is fixed when Next builds its routes.
ARG NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000
ARG NEXT_PUBLIC_SITE_PROTOCOL=https
ARG API_URL=http://api:5000
ENV NEXT_PUBLIC_ROOT_DOMAIN=$NEXT_PUBLIC_ROOT_DOMAIN \
    NEXT_PUBLIC_SITE_PROTOCOL=$NEXT_PUBLIC_SITE_PROTOCOL \
    API_URL=$API_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runtime: the standalone server only ------------------------------------
FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
