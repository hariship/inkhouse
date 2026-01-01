-- Migration: Add Google OAuth support
-- Run this in Supabase SQL Editor

-- Add Google OAuth fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'local';

-- Add check constraint for auth_provider (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_auth_provider_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_auth_provider_check
      CHECK (auth_provider IN ('local', 'google', 'both'));
  END IF;
END $$;

-- Index for Google ID lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Update existing users to 'local' provider
UPDATE users SET auth_provider = 'local' WHERE auth_provider IS NULL;

-- Add Google OAuth fields to membership_requests (for writer requests via Google)
ALTER TABLE membership_requests
ADD COLUMN IF NOT EXISTS google_id TEXT,
ADD COLUMN IF NOT EXISTS google_avatar_url TEXT;

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('google_id', 'auth_provider');
