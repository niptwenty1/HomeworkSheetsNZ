BEGIN;

ALTER TABLE IF EXISTS signups
  ADD COLUMN IF NOT EXISTS school text;

ALTER TABLE IF EXISTS signups
  ADD COLUMN IF NOT EXISTS parent_email_verified_at timestamptz;

ALTER TABLE IF EXISTS signups
  ADD COLUMN IF NOT EXISTS parent_email_verification_token_hash text;

ALTER TABLE IF EXISTS signups
  ADD COLUMN IF NOT EXISTS parent_email_verification_expires_at timestamptz;

COMMIT;