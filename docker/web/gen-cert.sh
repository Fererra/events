#!/bin/sh
# Generates a self-signed TLS certificate on first start if none is mounted.
# For a real deployment mount certificates into /etc/nginx/certs instead.
set -e
CERT_DIR=/etc/nginx/certs
if [ ! -f "$CERT_DIR/server.crt" ] || [ ! -f "$CERT_DIR/server.key" ]; then
  mkdir -p "$CERT_DIR"
  openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
    -subj "/CN=${SERVER_NAME:-localhost}" \
    -keyout "$CERT_DIR/server.key" -out "$CERT_DIR/server.crt" >/dev/null 2>&1
  echo "gen-cert: self-signed certificate created for ${SERVER_NAME:-localhost}"
fi
