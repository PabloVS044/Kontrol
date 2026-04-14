#!/usr/bin/env bash
# azure-setup.sh — Crea una VM en Azure y la configura para correr Docker + la app.
# Correr una sola vez desde tu máquina local.
# Prerequisitos: az CLI instalado y logueado (az login)
set -euo pipefail

# ── Configuración — cambia estos valores ────────────────────────────────────
RESOURCE_GROUP="kontrol-rg"
LOCATION="eastus"
VM_NAME="kontrol-vm"
VM_SIZE="Standard_B1s"
ADMIN_USER="azureuser"
SSH_KEY_PATH="$HOME/.ssh/id_rsa"
GITHUB_REPO="PabloVS044/Kontrol"
# ─────────────────────────────────────────────────────────────────────────────

echo "==> Generando SSH key para la VM..."
if [ ! -f "$SSH_KEY_PATH" ]; then
  ssh-keygen -t rsa -b 4096 -f "$SSH_KEY_PATH" -N "" -C "kontrol-azure-deploy"
fi

echo "==> Actualizando resource group a región: $LOCATION"
az group create --name "$RESOURCE_GROUP" --location "$LOCATION"

echo "==> Creando VM: $VM_NAME"
az vm create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$VM_NAME" \
  --image Ubuntu2204 \
  --size "$VM_SIZE" \
  --admin-username "$ADMIN_USER" \
  --generate-ssh-keys \
  --public-ip-sku Standard \
  --security-type Standard \
  --only-show-errors \
  --output none

VM_IP=$(az vm show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$VM_NAME" \
  --show-details \
  --query publicIps \
  --output tsv)

echo "==> IP de la VM: $VM_IP"

echo "==> Abriendo puertos 80 (HTTP) y 22 (SSH)..."
az vm open-port --resource-group "$RESOURCE_GROUP" --name "$VM_NAME" --port 80 --priority 100
az vm open-port --resource-group "$RESOURCE_GROUP" --name "$VM_NAME" --port 22 --priority 110

echo "==> Instalando Docker en la VM..."
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY_PATH" "$ADMIN_USER@$VM_IP" bash <<'REMOTE'
  set -e
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker $USER
  sudo systemctl enable docker
  sudo systemctl start docker
  docker --version
REMOTE

echo "==> Configurando GitHub secrets..."
SSH_PRIVATE_KEY=$(cat "$SSH_KEY_PATH")
gh secret set VM_HOST        --body "$VM_IP"          --repo "$GITHUB_REPO"
gh secret set VM_USER        --body "$ADMIN_USER"     --repo "$GITHUB_REPO"
gh secret set VM_SSH_KEY     --body "$SSH_PRIVATE_KEY" --repo "$GITHUB_REPO"

echo ""
echo "✓ VM lista en: $VM_IP"
echo ""
echo "==> Ahora agrega estos secrets manualmente en GitHub:"
echo "    https://github.com/$GITHUB_REPO/settings/secrets/actions"
echo ""
echo "    DATABASE_URL"
echo "    JWT_SECRET"
echo "    JWT_EXPIRES_IN"
echo "    GOOGLE_CLIENT_ID"
echo "    GOOGLE_CLIENT_SECRET"
echo "    GOOGLE_CALLBACK_URL  → http://$VM_IP/api/auth/google/callback"
echo "    FRONTEND_URL         → http://$VM_IP"
echo ""
echo "==> Para conectarte a la VM:"
echo "    ssh -i $SSH_KEY_PATH $ADMIN_USER@$VM_IP"
