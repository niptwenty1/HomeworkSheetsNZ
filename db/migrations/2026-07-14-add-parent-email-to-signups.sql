-- Migration: 2026-07-14 - Add parent email to signups
BEGIN;

ALTER TABLE IF EXISTS signups
  ADD COLUMN IF NOT EXISTS parent_email text;

COMMIT;