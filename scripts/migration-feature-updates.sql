-- Feature Updates table for changelog/transparency
-- Run this migration in Supabase SQL editor

CREATE TABLE IF NOT EXISTS feature_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('new', 'improved', 'fixed')),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster retrieval (ordered by date)
CREATE INDEX IF NOT EXISTS idx_feature_updates_created_at ON feature_updates(created_at DESC);

-- RLS policies
ALTER TABLE feature_updates ENABLE ROW LEVEL SECURITY;

-- Anyone can read feature updates
CREATE POLICY "Anyone can read feature updates"
    ON feature_updates FOR SELECT
    USING (true);

-- Only super_admin can insert
CREATE POLICY "Super admin can insert feature updates"
    ON feature_updates FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

-- Only super_admin can delete
CREATE POLICY "Super admin can delete feature updates"
    ON feature_updates FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );
