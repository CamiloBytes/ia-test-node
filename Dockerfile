# Base stage
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Dependencies stage
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Production Dependencies stage
FROM base AS prod-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Build stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

RUN pnpm build

# Runner stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Install openssl for Prisma
RUN apk add --no-cache openssl

# Use existing 'node' user
USER node

# Copy necessary files
# Copy prod-deps
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
# Copy built app
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/package.json ./package.json
# Copy prisma schema/migrations if needed
COPY --from=builder --chown=node:node /app/prisma ./prisma

EXPOSE 3000

CMD ["node", "dist/index.js"]
