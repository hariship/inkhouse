-- Migration: Reader Role & Reading Features
-- Run this migration to add reader role and reading tracking tables

-- 1. Update users role constraint to include 'reader'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('super_admin', 'admin', 'writer', 'reader'));

-- 2. Reading status table (tracks read/unread per user per post)
CREATE TABLE IF NOT EXISTS post_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_post_reads_user ON post_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_post_reads_post ON post_reads(post_id);

-- 3. Bookmarks/saved posts table
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);

-- 4. Custom reading lists
CREATE TABLE IF NOT EXISTS reading_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reading_lists_user ON reading_lists(user_id);

-- 5. Reading list items (many-to-many: lists <-> posts)
CREATE TABLE IF NOT EXISTS reading_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES reading_lists(id) ON DELETE CASCADE,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(list_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_reading_list_items_list ON reading_list_items(list_id);

-- 6. User preferences (view mode, sort, etc.)
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  view_mode TEXT DEFAULT 'grid' CHECK (view_mode IN ('grid', 'list')),
  default_sort TEXT DEFAULT 'date' CHECK (default_sort IN ('date', 'category')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Add trigger for reading_lists updated_at
CREATE OR REPLACE FUNCTION update_reading_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reading_lists_updated_at ON reading_lists;
CREATE TRIGGER trigger_reading_lists_updated_at
  BEFORE UPDATE ON reading_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_reading_lists_updated_at();

-- 8. Add trigger for user_preferences updated_at
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER trigger_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();
