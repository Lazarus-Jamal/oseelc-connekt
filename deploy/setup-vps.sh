#!/bin/bash
# ============================================================
# Script de configuration initiale du VPS LWS
# À exécuter UNE SEULE FOIS en root sur le serveur
# Usage: bash setup-vps.sh
# ============================================================
set -e

DOMAIN="oseelc-connekt.oseelc.org"
APP_DIR="/var/www/oseelc-connekt"
DB_NAME="oseelc_connekt"
DB_USER="oseelc"
GITHUB_REPO="https://github.com/TON_COMPTE/TON_REPO.git"  # ← MODIFIER

echo "======================================"
echo " Configuration VPS — Oseelc-connekt"
echo "======================================"

# ── 1. Mise à jour système ─────────────────────────────────
echo "==> Mise à jour du système..."
apt-get update -y && apt-get upgrade -y

# ── 2. Node.js 20 LTS ─────────────────────────────────────
echo "==> Installation de Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# ── 3. pnpm ───────────────────────────────────────────────
echo "==> Installation de pnpm..."
npm install -g pnpm@10

# ── 4. PM2 ────────────────────────────────────────────────
echo "==> Installation de PM2..."
npm install -g pm2
pm2 startup systemd -u root --hp /root

# ── 5. PostgreSQL ──────────────────────────────────────────
echo "==> Installation de PostgreSQL..."
apt-get install -y postgresql postgresql-contrib

# Démarrage automatique
systemctl enable postgresql
systemctl start postgresql

# Création de la base et de l'utilisateur
echo "==> Création de la base de données..."
sudo -u postgres psql <<EOF
CREATE USER $DB_USER WITH PASSWORD 'CHANGER_CE_MOT_DE_PASSE';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF

# ── 6. nginx ──────────────────────────────────────────────
echo "==> Installation de nginx..."
apt-get install -y nginx
systemctl enable nginx

# ── 7. Certbot (SSL Let's Encrypt) ────────────────────────
echo "==> Installation de certbot..."
apt-get install -y certbot python3-certbot-nginx

# ── 8. Clone du dépôt ─────────────────────────────────────
echo "==> Clone du dépôt GitHub..."
mkdir -p $APP_DIR
git clone $GITHUB_REPO $APP_DIR

# ── 9. Configuration de l'environnement ───────────────────
echo "==> Création du fichier .env..."
cat > $APP_DIR/apps/web/.env <<ENVEOF
DATABASE_URL="postgresql://$DB_USER:CHANGER_CE_MOT_DE_PASSE@localhost:5432/$DB_NAME"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="https://$DOMAIN"
JWT_SECRET="$(openssl rand -base64 32)"
JWT_EXPIRES_IN="7d"
UPLOAD_DIR="./public/uploads"
MAX_FILE_SIZE_MB=10
NEXT_PUBLIC_APP_NAME="Oseelc-connekt"
NEXT_PUBLIC_APP_URL="https://$DOMAIN"
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="Oseelc-connekt <noreply@oseelc.org>"
NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
VAPID_EMAIL="mailto:admin@oseelc.org"
ENVEOF

cat > $APP_DIR/packages/db/.env <<ENVEOF
DATABASE_URL="postgresql://$DB_USER:CHANGER_CE_MOT_DE_PASSE@localhost:5432/$DB_NAME"
ENVEOF

# ── 10. Build initial ─────────────────────────────────────
echo "==> Installation des dépendances et build..."
cd $APP_DIR
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:push
pnpm build

# ── 11. Démarrage avec PM2 ────────────────────────────────
echo "==> Démarrage de l'application avec PM2..."
pm2 start pnpm \
  --name "oseelc-connekt" \
  --cwd $APP_DIR/apps/web \
  -- start
pm2 save

# ── 12. Configuration nginx ───────────────────────────────
echo "==> Configuration de nginx..."
cp $APP_DIR/deploy/nginx.conf /etc/nginx/sites-available/oseelc-connekt

# Config initiale HTTP seulement (avant certbot)
cat > /etc/nginx/sites-available/oseelc-connekt-temp <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
ln -sf /etc/nginx/sites-available/oseelc-connekt-temp /etc/nginx/sites-enabled/oseelc-connekt
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ── 13. Certificat SSL ────────────────────────────────────
echo "==> Génération du certificat SSL..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m admin@oseelc.org

# Remplace la config temp par la config complète avec SSL
ln -sf /etc/nginx/sites-available/oseelc-connekt /etc/nginx/sites-enabled/oseelc-connekt
nginx -t && systemctl reload nginx

echo ""
echo "======================================"
echo " ✅ Installation terminée !"
echo " Application : https://$DOMAIN"
echo ""
echo " ⚠️  Pense à :"
echo "    1. Modifier le mot de passe PostgreSQL dans .env"
echo "    2. Renseigner SMTP_* pour les emails"
echo "    3. Renseigner les clés VAPID pour les push"
echo "======================================"
