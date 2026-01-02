-- Migration: Writer Critiques & Analytics
-- Adds critiques (private peer reviews) and page_views (analytics) tables

-- 1. Critiques table (private peer reviews between writers)
CREATE TABLE IF NOT EXISTS critiques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES critiques(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for critiques
CREATE INDEX IF NOT EXISTS idx_critiques_post ON critiques(post_id);
CREATE INDEX IF NOT EXISTS idx_critiques_author ON critiques(author_id);
CREATE INDEX IF NOT EXISTS idx_critiques_parent ON critiques(parent_id);
CREATE INDEX IF NOT EXISTS idx_critiques_created ON critiques(created_at DESC);

-- Trigger for critiques updated_at
CREATE OR REPLACE FUNCTION update_critiques_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_critiques_updated_at ON critiques;
CREATE TRIGGER trigger_critiques_updated_at
  BEFORE UPDATE ON critiques
  FOR EACH ROW
  EXECUTE FUNCTION update_critiques_updated_at();

-- 2. Page views table (minimal analytics tracking)
CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for page_views (optimized for counting by post and time ranges)
CREATE INDEX IF NOT EXISTS idx_page_views_post ON page_views(post_id);
CREATE INDEX IF NOT EXISTS idx_page_views_viewed ON page_views(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_post_viewed ON page_views(post_id, viewed_at);
