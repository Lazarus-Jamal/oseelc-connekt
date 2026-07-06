-- ============================================================
-- OSEELC-CONNEKT — Script de migration base de données
-- À exécuter sur le serveur de production via pgAdmin ou
-- l'interface SQL de ton hébergeur
-- Idempotent : peut être relancé sans risque (IF NOT EXISTS)
-- ============================================================

-- 1. Messagerie directe : colonne replyToId sur admin_messages
-- ─────────────────────────────────────────────────────────────
ALTER TABLE admin_messages ADD COLUMN IF NOT EXISTS "replyToId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_messages_replyToId_fkey'
  ) THEN
    ALTER TABLE admin_messages
      ADD CONSTRAINT "admin_messages_replyToId_fkey"
      FOREIGN KEY ("replyToId") REFERENCES admin_messages(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "AdminMessage_replyToId_idx" ON admin_messages("replyToId");


-- 2. Clés API des structures (Care2x)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS facility_api_keys (
  id           TEXT        NOT NULL,
  "facilityId" TEXT        NOT NULL,
  "keyHash"    TEXT        NOT NULL,
  "keyPreview" TEXT        NOT NULL,
  "isActive"   BOOLEAN     NOT NULL DEFAULT true,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),

  CONSTRAINT facility_api_keys_pkey PRIMARY KEY (id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'facility_api_keys_facilityId_key'
  ) THEN
    ALTER TABLE facility_api_keys ADD CONSTRAINT "facility_api_keys_facilityId_key" UNIQUE ("facilityId");
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'facility_api_keys_keyHash_key'
  ) THEN
    ALTER TABLE facility_api_keys ADD CONSTRAINT "facility_api_keys_keyHash_key" UNIQUE ("keyHash");
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'facility_api_keys_facilityId_fkey'
  ) THEN
    ALTER TABLE facility_api_keys
      ADD CONSTRAINT "facility_api_keys_facilityId_fkey"
      FOREIGN KEY ("facilityId") REFERENCES facilities(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;


-- 3. Synchronisations Care2x (recettes)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS care2x_syncs (
  id              TEXT          NOT NULL,
  "facilityId"    TEXT          NOT NULL,
  "apiKeyId"      TEXT          NOT NULL,
  "batchRef"      TEXT          NOT NULL,
  "entriesCount"  INTEGER       NOT NULL,
  "totalAmount"   DECIMAL(15,2) NOT NULL,
  "periodStart"   TIMESTAMP(3)  NOT NULL,
  "periodEnd"     TIMESTAMP(3)  NOT NULL,
  "receivedAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT care2x_syncs_pkey PRIMARY KEY (id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'care2x_syncs_batchRef_key'
  ) THEN
    ALTER TABLE care2x_syncs ADD CONSTRAINT "care2x_syncs_batchRef_key" UNIQUE ("batchRef");
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'care2x_syncs_facilityId_fkey'
  ) THEN
    ALTER TABLE care2x_syncs
      ADD CONSTRAINT "care2x_syncs_facilityId_fkey"
      FOREIGN KEY ("facilityId") REFERENCES facilities(id) ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'care2x_syncs_apiKeyId_fkey'
  ) THEN
    ALTER TABLE care2x_syncs
      ADD CONSTRAINT "care2x_syncs_apiKeyId_fkey"
      FOREIGN KEY ("apiKeyId") REFERENCES facility_api_keys(id) ON UPDATE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "Care2xSync_facilityId_idx" ON care2x_syncs("facilityId");
CREATE INDEX IF NOT EXISTS "Care2xSync_receivedAt_idx" ON care2x_syncs("receivedAt");


-- 4. Entrées de synchronisation Care2x
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS care2x_sync_entries (
  id              TEXT          NOT NULL,
  "syncId"        TEXT          NOT NULL,
  "localId"       TEXT          NOT NULL,
  "montant"       DECIMAL(15,2) NOT NULL,
  "date"          TIMESTAMP(3)  NOT NULL,
  "typePaiement"  TEXT          NOT NULL,

  CONSTRAINT care2x_sync_entries_pkey PRIMARY KEY (id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'care2x_sync_entries_syncId_fkey'
  ) THEN
    ALTER TABLE care2x_sync_entries
      ADD CONSTRAINT "care2x_sync_entries_syncId_fkey"
      FOREIGN KEY ("syncId") REFERENCES care2x_syncs(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "Care2xSyncEntry_syncId_idx" ON care2x_sync_entries("syncId");


-- 5. Synchronisations recouvrement Care2x
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS care2x_recouvrement_syncs (
  id               TEXT          NOT NULL,
  "facilityId"     TEXT          NOT NULL,
  "apiKeyId"       TEXT          NOT NULL,
  "batchRef"       TEXT          NOT NULL,
  "totalFacture"   DECIMAL(15,2) NOT NULL,
  "totalRecouvre"  DECIMAL(15,2) NOT NULL,
  "rapport"        JSONB         NOT NULL,
  "receivedAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT care2x_recouvrement_syncs_pkey PRIMARY KEY (id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'care2x_recouvrement_syncs_batchRef_key'
  ) THEN
    ALTER TABLE care2x_recouvrement_syncs ADD CONSTRAINT "care2x_recouvrement_syncs_batchRef_key" UNIQUE ("batchRef");
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'care2x_recouvrement_syncs_facilityId_fkey'
  ) THEN
    ALTER TABLE care2x_recouvrement_syncs
      ADD CONSTRAINT "care2x_recouvrement_syncs_facilityId_fkey"
      FOREIGN KEY ("facilityId") REFERENCES facilities(id) ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'care2x_recouvrement_syncs_apiKeyId_fkey'
  ) THEN
    ALTER TABLE care2x_recouvrement_syncs
      ADD CONSTRAINT "care2x_recouvrement_syncs_apiKeyId_fkey"
      FOREIGN KEY ("apiKeyId") REFERENCES facility_api_keys(id) ON UPDATE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "Care2xRecouvrementSync_facilityId_idx" ON care2x_recouvrement_syncs("facilityId");


-- 6. Versions Care2x (mises à jour du client)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS care2x_versions (
  id              TEXT         NOT NULL,
  "version"       TEXT         NOT NULL,
  "releaseNotes"  TEXT,
  "filename"      TEXT         NOT NULL,
  "filePath"      TEXT         NOT NULL,
  "fileSize"      INTEGER      NOT NULL,
  "downloadUrl"   TEXT         NOT NULL,
  "isActive"      BOOLEAN      NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT care2x_versions_pkey PRIMARY KEY (id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'care2x_versions_version_key'
  ) THEN
    ALTER TABLE care2x_versions ADD CONSTRAINT "care2x_versions_version_key" UNIQUE ("version");
  END IF;
END$$;

-- 7. Permissions UI par page/rôle (système de droits dynamiques)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS page_permissions (
  id        TEXT    NOT NULL,
  "role"    TEXT    NOT NULL,
  "pageKey" TEXT    NOT NULL,
  "granted" BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT page_permissions_pkey PRIMARY KEY (id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'page_permissions_role_pageKey_key'
  ) THEN
    ALTER TABLE page_permissions ADD CONSTRAINT "page_permissions_role_pageKey_key" UNIQUE ("role", "pageKey");
  END IF;
END$$;

-- 8. Rapports journaliers Care2x
-- ─────────────────────────────────────────────────────────────
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
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'care2x_rapports_journaliers_facilityId_date_key'
  ) THEN
    ALTER TABLE care2x_rapports_journaliers
      ADD CONSTRAINT "care2x_rapports_journaliers_facilityId_date_key" UNIQUE ("facilityId", "date");
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'care2x_rapports_journaliers_facilityId_fkey'
  ) THEN
    ALTER TABLE care2x_rapports_journaliers
      ADD CONSTRAINT "care2x_rapports_journaliers_facilityId_fkey"
      FOREIGN KEY ("facilityId") REFERENCES facilities(id) ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'care2x_rapports_journaliers_apiKeyId_fkey'
  ) THEN
    ALTER TABLE care2x_rapports_journaliers
      ADD CONSTRAINT "care2x_rapports_journaliers_apiKeyId_fkey"
      FOREIGN KEY ("apiKeyId") REFERENCES facility_api_keys(id) ON UPDATE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "Care2xRapportJournalier_facilityId_idx"
  ON care2x_rapports_journaliers("facilityId");

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================
