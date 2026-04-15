#!/usr/bin/env bash
# deploy.sh — Despliega Kontrol en la VM de GCP manualmente.
# Uso: ./scripts/deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env.deploy"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: no existe $ENV_FILE"
  echo "Cópialo desde .env.deploy.example y rellena los valores."
  exit 1
fi

source "$ENV_FILE"

: "${VM_IP:?Falta VM_IP en .env.deploy}"
: "${VM_USER:?Falta VM_USER en .env.deploy}"
: "${SSH_KEY:?Falta SSH_KEY en .env.deploy}"
: "${POSTGRES_PASSWORD:?Falta POSTGRES_PASSWORD en .env.deploy}"
: "${JWT_SECRET:?Falta JWT_SECRET en .env.deploy}"
: "${JWT_EXPIRES_IN:?Falta JWT_EXPIRES_IN en .env.deploy}"
: "${GOOGLE_CLIENT_ID:?Falta GOOGLE_CLIENT_ID en .env.deploy}"
: "${GOOGLE_CLIENT_SECRET:?Falta GOOGLE_CLIENT_SECRET en .env.deploy}"
: "${GOOGLE_CALLBACK_URL:?Falta GOOGLE_CALLBACK_URL en .env.deploy}"
: "${FRONTEND_URL:?Falta FRONTEND_URL en .env.deploy}"

echo "==> Desplegando en $VM_USER@$VM_IP ..."

ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" "$VM_USER@$VM_IP" \
  POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  JWT_SECRET="$JWT_SECRET" \
  JWT_EXPIRES_IN="$JWT_EXPIRES_IN" \
  GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" \
  GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET" \
  GOOGLE_CALLBACK_URL="$GOOGLE_CALLBACK_URL" \
  FRONTEND_URL="$FRONTEND_URL" \
  bash <<'REMOTE'
  set -e

  if [ ! -d "/app/Kontrol" ]; then
    sudo mkdir -p /app && sudo chown $USER:$USER /app
    git clone https://github.com/PabloVS044/Kontrol.git /app/Kontrol
  else
    cd /app/Kontrol && git pull origin main
  fi

  cd /app/Kontrol

  {
    echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD"
    echo "JWT_SECRET=$JWT_SECRET"
    echo "JWT_EXPIRES_IN=$JWT_EXPIRES_IN"
    echo "GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID"
    echo "GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET"
    echo "GOOGLE_CALLBACK_URL=$GOOGLE_CALLBACK_URL"
    echo "FRONTEND_URL=$FRONTEND_URL"
  } > .env

  docker compose -f docker-compose.prod.yml up -d --build --remove-orphans
  docker image prune -f

  echo "==> Deploy completado."
REMOTE
