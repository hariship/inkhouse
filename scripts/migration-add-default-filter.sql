-- Add default_filter column to user_preferences table
-- Run this migration to enable filter preference persistence

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS default_filter TEXT DEFAULT 'unread'
CHECK (default_filter IN ('all', 'unread', 'read', 'saved'));
