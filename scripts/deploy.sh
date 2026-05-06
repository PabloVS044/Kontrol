#!/usr/bin/env bash
# deploy.sh — Despliega Kontrol en la VM de GCP manualmente.
# Uso: ./scripts/deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env.deploy"
GIT_REF="${GIT_REF:-$(git -C "$ROOT" rev-parse --abbrev-ref HEAD)}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: no existe $ENV_FILE"
  echo "Cópialo desde .env.deploy.example y rellena los valores."
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [ -n "$(git -C "$ROOT" status --porcelain)" ]; then
  echo "Error: tienes cambios locales sin commit. Este deploy solo sube lo que exista en origin/$GIT_REF."
  echo "Haz commit y push antes de desplegar."
  exit 1
fi

if git -C "$ROOT" show-ref --verify --quiet "refs/remotes/origin/$GIT_REF"; then
  LOCAL_SHA="$(git -C "$ROOT" rev-parse HEAD)"
  REMOTE_SHA="$(git -C "$ROOT" rev-parse "origin/$GIT_REF")"
  if [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then
    echo "Error: tu branch local no coincide con origin/$GIT_REF."
    echo "Haz push antes de desplegar para que el servidor reciba estos cambios."
    exit 1
  fi
else
  echo "Error: no existe origin/$GIT_REF."
  echo "Haz push de la rama primero o exporta GIT_REF=<rama-remota>."
  exit 1
fi

: "${VM_IP:?Falta VM_IP en .env.deploy}"
: "${VM_USER:?Falta VM_USER en .env.deploy}"
: "${SSH_KEY:?Falta SSH_KEY en .env.deploy}"
: "${POSTGRES_PASSWORD:?Falta POSTGRES_PASSWORD en .env.deploy}"
: "${MONGODB_URI:?Falta MONGODB_URI en .env.deploy}"
: "${JWT_SECRET:?Falta JWT_SECRET en .env.deploy}"
: "${JWT_EXPIRES_IN:?Falta JWT_EXPIRES_IN en .env.deploy}"
: "${GOOGLE_CLIENT_ID:?Falta GOOGLE_CLIENT_ID en .env.deploy}"
: "${GOOGLE_CLIENT_SECRET:?Falta GOOGLE_CLIENT_SECRET en .env.deploy}"
: "${GOOGLE_CALLBACK_URL:?Falta GOOGLE_CALLBACK_URL en .env.deploy}"
: "${FRONTEND_URL:?Falta FRONTEND_URL en .env.deploy}"
: "${UPLOADTHING_TOKEN:?Falta UPLOADTHING_TOKEN en .env.deploy}"

SSH="ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -i $SSH_KEY $VM_USER@$VM_IP"

# Codifica el .env en base64 para evitar problemas con caracteres especiales
ENV_B64=$(printf '%s\n' \
  "POSTGRES_PASSWORD=$POSTGRES_PASSWORD" \
  "MONGODB_URI=$MONGODB_URI" \
  "JWT_SECRET=$JWT_SECRET" \
  "JWT_EXPIRES_IN=$JWT_EXPIRES_IN" \
  "GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID" \
  "GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET" \
  "GOOGLE_CALLBACK_URL=$GOOGLE_CALLBACK_URL" \
  "FRONTEND_URL=$FRONTEND_URL" \
  "UPLOADTHING_TOKEN=$UPLOADTHING_TOKEN" \
  "VITE_API_URL=${VITE_API_URL-}" \
  "VITE_SOCKET_URL=${VITE_SOCKET_URL-}" \
  "VITE_WEBRTC_ICE_SERVERS=${VITE_WEBRTC_ICE_SERVERS-}" \
  | base64 -w0)

echo "==> [1/3] Actualizando código en $VM_USER@$VM_IP ..."
$SSH "
  set -e
  if [ ! -d /app/Kontrol ]; then
    sudo mkdir -p /app && sudo chown \$USER:\$USER /app
    git clone https://github.com/PabloVS044/Kontrol.git /app/Kontrol
  fi
  cd /app/Kontrol
  git fetch origin
  git reset --hard origin/$GIT_REF
  echo '$ENV_B64' | base64 -d > .env
  echo '==> .env actualizado'
"

echo "==> [2/3] Lanzando build en el servidor (corre en background, no depende de SSH)..."
$SSH "
  set -e
  cd /app/Kontrol
  docker compose -f docker-compose.prod.yml up -d --build --remove-orphans
  docker image prune -f >/dev/null 2>&1 || true
"

echo "==> [3/3] Verificando salud del despliegue..."
$SSH "
  set -e
  cd /app/Kontrol
  for i in \$(seq 1 30); do
    if curl -fsS http://localhost:3000/api/health >/dev/null 2>&1; then
      echo 'Backend healthy'
      exit 0
    fi
    sleep 2
  done

  echo 'Backend did not become healthy in time.'
  docker compose -f docker-compose.prod.yml ps
  echo '--- backend logs ---'
  docker compose -f docker-compose.prod.yml logs --tail=120 backend || true
  exit 1
"

echo ""
echo "==> Despliegue completado."
echo "    App: $FRONTEND_URL"
echo "    Health: $FRONTEND_URL/api/health"
