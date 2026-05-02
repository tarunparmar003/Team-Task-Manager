# Multi-stage: build the React bundle, serve via nginx as a non-root user.

# ---- Stage 1: build ----
FROM node:20-alpine AS builder
WORKDIR /app

ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY tsconfig.json tsconfig.node.json vite.config.ts postcss.config.js tailwind.config.js index.html ./
COPY src ./src

RUN npm run build

# ---- Stage 2: nginx (unprivileged variant — runs as UID 101, all cache dirs writable) ----
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runner

# Default for local runs; Railway overrides PORT at runtime
ENV PORT=8080

USER root
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html
USER 101

EXPOSE 8080

# Official entrypoint substitutes ${PORT} from env into templates/*.template before starting nginx
