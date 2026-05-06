#!/bin/bash
# ============================================================
# Setup initial — Oseelc-connekt sur cPanel LWS
# À exécuter UNE SEULE FOIS via le terminal SSH cPanel
# (Le dépôt doit déjà être cloné via Git Version Control)
# Usage: cd ~/oseelc-connekt && bash deploy/setup-cpanel.sh
# ============================================================
set -e

APP_DIR="$HOME/oseelc-connekt"

echo "======================================"
echo " Setup Oseelc-connekt — cPanel LWS"
echo "======================================"

# ── 1. pnpm ───────────────────────────────────────────────
echo "==> Installation de pnpm..."
npm install -g pnpm@10
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

# ── 2. Dossier uploads ────────────────────────────────────
mkdir -p "$APP_DIR/apps/web/public/uploads"

# ── 3. Fichiers .env ──────────────────────────────────────
echo ""
echo "⚠️  IMPORTANT : tu dois créer les fichiers .env manuellement."
echo ""
echo "   nano $APP_DIR/apps/web/.env"
echo ""
echo "   Contenu minimum :"
echo '   DATABASE_URL="postgresql://USER:PASS@localhost:5432/DB_NAME"'
echo '   NEXTAUTH_SECRET="$(openssl rand -base64 32)"'
echo '   NEXTAUTH_URL="https://oseelc-connekt.oseelc.org"'
echo '   NEXT_PUBLIC_APP_URL="https://oseelc-connekt.oseelc.org"'
echo '   JWT_SECRET="$(openssl rand -base64 32)"'
echo '   JWT_EXPIRES_IN="7d"'
echo '   UPLOAD_DIR="./public/uploads"'
echo '   MAX_FILE_SIZE_MB=10'
echo '   NEXT_PUBLIC_APP_NAME="Oseelc-connekt"'
echo ""
echo "   nano $APP_DIR/packages/db/.env"
echo '   DATABASE_URL="postgresql://USER:PASS@localhost:5432/DB_NAME"'
echo ""

read -p "Appuie sur Entrée une fois les .env créés..."

# ── 4. Install + build initial ────────────────────────────
cd "$APP_DIR"

echo "==> Installation des dépendances..."
pnpm install --frozen-lockfile

echo "==> Génération du client Prisma..."
pnpm db:generate

echo "==> Synchronisation de la base de données..."
pnpm db:push

echo "==> Build de l'application..."
pnpm build

mkdir -p apps/web/tmp
touch apps/web/tmp/restart.txt

echo ""
echo "======================================"
echo " ✅ Setup terminé !"
echo ""
echo " Étapes suivantes dans cPanel :"
echo "   1. Setup Node.js App → configurer l'application"
echo "      - Node.js version    : 20"
echo "      - Application root   : oseelc-connekt"
echo "      - Application URL    : oseelc-connekt.oseelc.org"
echo "      - Startup file       : apps/web/server.js"
echo "   2. Ajouter les variables d'env dans l'interface Node.js App"
echo "   3. Cliquer 'Restart'"
echo "======================================"
