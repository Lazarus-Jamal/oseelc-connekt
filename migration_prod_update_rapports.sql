-- ============================================================
-- OSEELC-CONNEKT — Mise à jour production
-- Script : ajout table rapports journaliers Care2x
-- Date   : 2026-07-06
-- Idempotent : peut être relancé sans risque (IF NOT EXISTS)
-- ============================================================

-- Table des rapports journaliers envoyés par CleanSanté
-- (un rapport par centre par jour, données agrégées JSON)
CREATE TABLE IF NOT EXISTS care2x_rapports_journaliers (
  id            TEXT         NOT NULL,
  "facilityId"  TEXT         NOT NULL,
  "date"        TIMESTAMP(3) NOT NULL,
  "parGroupe"   JSONB        NOT NULL DEFAULT '[]',
  "parPaiement" JSONB        NOT NULL DEFAULT '[]',
  "parAvance"   JSONB        NOT NULL DEFAULT '[]',
  "rembParMode" JSONB        NOT NULL DEFAULT '[]',
  "totRow"      JSONB        NOT NULL DEFAULT '{}',
  "openRow"     JSONB        NOT NULL DEFAULT '{}',
  "credits"     JSONB        NOT NULL DEFAULT '[]',
  "rembRow"     JSONB        NOT NULL DEFAULT '{}',
  "caissiers"   JSONB        NOT NULL DEFAULT '[]',
  "receivedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "apiKeyId"    TEXT         NOT NULL,

  CONSTRAINT care2x_rapports_journaliers_pkey PRIMARY KEY (id)
);

DO $$
BEGIN
  -- Unicité : un seul rapport par centre par date
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'care2x_rapports_journaliers_facilityId_date_key'
  ) THEN
    ALTER TABLE care2x_rapports_journaliers
      ADD CONSTRAINT "care2x_rapports_journaliers_facilityId_date_key"
      UNIQUE ("facilityId", "date");
  END IF;

  -- FK vers facilities
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'care2x_rapports_journaliers_facilityId_fkey'
  ) THEN
    ALTER TABLE care2x_rapports_journaliers
      ADD CONSTRAINT "care2x_rapports_journaliers_facilityId_fkey"
      FOREIGN KEY ("facilityId") REFERENCES facilities(id) ON UPDATE CASCADE;
  END IF;

  -- FK vers facility_api_keys
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'care2x_rapports_journaliers_apiKeyId_fkey'
  ) THEN
    ALTER TABLE care2x_rapports_journaliers
      ADD CONSTRAINT "care2x_rapports_journaliers_apiKeyId_fkey"
      FOREIGN KEY ("apiKeyId") REFERENCES facility_api_keys(id) ON UPDATE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "Care2xRapportJournalier_facilityId_idx"
  ON care2x_rapports_journaliers("facilityId");

CREATE INDEX IF NOT EXISTS "Care2xRapportJournalier_date_idx"
  ON care2x_rapports_journaliers("date");

-- ============================================================
-- APRÈS AVOIR EXÉCUTÉ CE SCRIPT :
-- Ajouter la variable d'environnement sur le serveur :
--   RESET_DB_PASSWORD="OseelcReset2026!"
-- (dans le fichier .env de production ou les variables
--  d'environnement de votre hébergeur)
-- ============================================================
