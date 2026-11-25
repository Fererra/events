# syntax=docker/dockerfile:1
#
# web: nginx serves the SPA build and proxies /api to the app container.
#
FROM node:22-alpine AS spa
WORKDIR /spa
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

FROM nginx:1.27-alpine
RUN apk add --no-cache openssl
COPY docker/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/web/gen-cert.sh /docker-entrypoint.d/05-gen-cert.sh
RUN chmod +x /docker-entrypoint.d/05-gen-cert.sh
COPY --from=spa /spa/dist /usr/share/nginx/html
EXPOSE 443
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -q --no-check-certificate -O /dev/null https://127.0.0.1/ || exit 1
