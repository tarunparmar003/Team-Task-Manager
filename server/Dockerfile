# Multi-stage build for the API. Final image runs as a non-root user.

# ---- Stage 1: install all deps and build TypeScript ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install build deps for native modules (bcrypt, prisma engines)
RUN apk add --no-cache openssl libc6-compat

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate
RUN npm run build

# ---- Stage 2: production image with only what we need to run ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

RUN apk add --no-cache openssl libc6-compat tini \
  && addgroup -S app && adduser -S app -G app

COPY --chown=app:app package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund \
  && npm cache clean --force

COPY --chown=app:app --from=builder /app/dist ./dist
COPY --chown=app:app --from=builder /app/prisma ./prisma
COPY --chown=app:app --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=app:app --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER app

EXPOSE 4000

# tini reaps zombie processes; the start script applies migrations then boots the server.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
