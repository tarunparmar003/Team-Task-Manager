# Multi-stage: build the React bundle, serve via nginx.

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

# ---- Stage 2: nginx ----
FROM nginx:1.27-alpine AS runner

# Default for local runs; Railway overrides at runtime
ENV PORT=80

# Drop default config and use our SPA-aware template (envsubst by official nginx image entrypoint)
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/templates/default.conf.template

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# nginx official image entrypoint substitutes ${PORT} from env into the template before starting
