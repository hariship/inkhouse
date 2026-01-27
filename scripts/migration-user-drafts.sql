-- Migration: Add user_drafts table for server-side auto-save
-- Run this in Supabase SQL editor

-- Create user_drafts table (one draft per user for new posts)
CREATE TABLE IF NOT EXISTS user_drafts (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    title TEXT DEFAULT '',
    description TEXT DEFAULT '',
    content TEXT DEFAULT '',
    category TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    featured BOOLEAN DEFAULT FALSE,
    allow_comments BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_drafts_user_id ON user_drafts(user_id);

-- Add comment
COMMENT ON TABLE user_drafts IS 'Auto-saved drafts for new posts, one per user';
