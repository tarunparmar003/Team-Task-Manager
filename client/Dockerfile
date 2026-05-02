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

# Drop default config and use our SPA-aware one
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

# Run as the non-root nginx user (already exists in the image)
USER nginx

EXPOSE 80

# nginx default entrypoint runs the daemon in foreground
