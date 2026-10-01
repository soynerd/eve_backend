# ==========================================
# Dependencies
# ==========================================
FROM node:22-bookworm-slim AS deps

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm ci --omit=dev


# ==========================================
# Build / Prisma
# ==========================================
FROM node:22-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm ci

COPY prisma ./prisma

RUN npx prisma generate


# ==========================================
# Production
# ==========================================
FROM node:22-bookworm-slim AS production

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --gid 1001 nodejs \
  && useradd --uid 1001 --gid nodejs --shell /usr/sbin/nologin --create-home nodejs

# Production dependencies
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Prisma generated client + engines
COPY --from=build --chown=nodejs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Application
COPY --chown=nodejs:nodejs prisma ./prisma
COPY --chown=nodejs:nodejs src ./src
COPY --chown=nodejs:nodejs package*.json ./

USER nodejs

EXPOSE 3000

HEALTHCHECK \
  --interval=30s \
  --timeout=5s \
  --start-period=30s \
  --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1)).on('error', () => process.exit(1))"

CMD ["node", "src/server.js"]