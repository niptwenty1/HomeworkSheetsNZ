-- Migration: 2026-07-15 - Prevent duplicate completion records
BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_completions_email_name_date
  ON completions (lower(email), lower(name), date);

COMMIT;