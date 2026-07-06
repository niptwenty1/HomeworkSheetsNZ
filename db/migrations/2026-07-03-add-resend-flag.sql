-- Migration: 2026-07-03 — Add resend flag to signups and remove resend_requests
-- Up: add columns to `signups` and drop the old `resend_requests` table
BEGIN;

-- Add resend columns to signups (safe with IF NOT EXISTS)
ALTER TABLE IF EXISTS signups
  ADD COLUMN IF NOT EXISTS resend boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS resend_date text,
  ADD COLUMN IF NOT EXISTS resend_reason text,
  ADD COLUMN IF NOT EXISTS resend_requested_at timestamptz;

-- Drop the old queue table if it exists
DROP TABLE IF EXISTS resend_requests;

COMMIT;

--
-- Down (rollback) — run only if you want to restore the previous state.
-- This will remove the added columns and recreate a simple `resend_requests` table.
-- Note: the rollback below is destructive for the newly added columns (data will be lost).
-- Run with caution.
--
-- BEGIN;
-- ALTER TABLE IF EXISTS signups
--   DROP COLUMN IF EXISTS resend_requested_at,
--   DROP COLUMN IF EXISTS resend_reason,
--   DROP COLUMN IF EXISTS resend_date,
--   DROP COLUMN IF EXISTS resend;
--
-- CREATE TABLE IF NOT EXISTS resend_requests (
--   id bigint generated always as identity primary key,
--   email text not null,
--   year text,
--   date text,
--   reason text,
--   processed boolean default false,
--   processed_at timestamptz,
--   created_at timestamptz default now()
-- );
--
-- COMMIT;
