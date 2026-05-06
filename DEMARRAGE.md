# Care-Connekt — Guide de démarrage

## Prérequis
- Node.js >= 20
- pnpm >= 9
- PostgreSQL 15+

## Installation

```bash
# 1. Installer les dépendances
pnpm install

# 2. Copier et configurer les variables d'environnement
cp apps/web/.env.example apps/web/.env

# Modifier apps/web/.env avec vos valeurs :
#   DATABASE_URL=postgresql://postgres:password@localhost:5432/care_connekt
#   NEXTAUTH_SECRET=<générer avec: openssl rand -base64 32>
#   JWT_SECRET=<autre clé aléatoire>
#   NEXTAUTH_URL=http://localhost:3000

# 3. Générer le client Prisma
pnpm db:generate

# 4. Créer les tables dans PostgreSQL
pnpm db:push

# 5. Peupler la base avec les données de test
pnpm db:seed

# 6. Lancer l'application web
pnpm dev
```

## Comptes de démonstration (après seed)

| Rôle | Email | Mot de passe |
|---|---|---|
| Admin système | admin@care-connekt.org | Admin@2024! |
| Direction | direction@oeuvre-sante.org | Admin@2024! |
| Dir. régional Nord | dr.nord@oeuvre-sante.org | Admin@2024! |
| Chef Hôpital Nord | chef.hop.nord@oeuvre-sante.org | Admin@2024! |
| Financier Hôpital Nord | financier.hop.nord@oeuvre-sante.org | Admin@2024! |
| Data Manager | data.hop.nord@oeuvre-sante.org | Admin@2024! |

## Structure du projet

```
care-connekt/
├── apps/
│   ├── web/              # Application Next.js 14 (http://localhost:3000)
│   └── mobile/           # Application Expo React Native
├── packages/
│   ├── db/               # Schéma Prisma + migrations
│   └── shared/           # Types TypeScript + utilitaires partagés
```

## Application web (apps/web)

```
src/
├── app/
│   ├── (auth)/login      # Page de connexion
│   ├── (dashboard)/      # Toutes les pages authentifiées
│   │   ├── dashboard/    # Tableau de bord (adapté selon le rôle)
│   │   ├── declarations/ # Gestion des déclarations
│   │   ├── statistics/   # Fiches statistiques
│   │   ├── reports/      # Rapports et exports
│   │   ├── notifications/# Centre de notifications
│   │   └── admin/        # Administration (utilisateurs, centres, config)
│   └── api/              # Routes API REST
├── components/           # Composants React
└── lib/                  # Auth, DB, permissions, utilitaires
```

## App mobile (apps/mobile)

```bash
cd apps/mobile
cp .env.example .env
# Modifier EXPO_PUBLIC_API_URL avec l'IP de votre serveur
npx expo start
```

## Prisma Studio (interface visuelle DB)

```bash
pnpm db:studio
# Ouvre http://localhost:5555
```

## Prochaines étapes

1. **Indicateurs statistiques** — importer votre fichier Excel de collecte via l'API `/api/admin/indicators/import`
2. **Hébergement** — PostgreSQL sur Railway/Supabase, App sur Vercel/Railway
3. **App mobile** — `cd apps/mobile && npx expo start`
4. **Personnalisation** — ajuster les catégories de recettes dans `packages/shared/src/types/declaration.ts`
