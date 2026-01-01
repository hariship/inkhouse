-- Migration: Suggestions voting system
-- Run this in your Supabase SQL editor

-- Suggestions submitted by writers
CREATE TABLE suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'shipped', 'closed')),
    vote_count INTEGER DEFAULT 0,
    github_issue_url TEXT,
    github_issue_created_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track who voted on what (one vote per user per suggestion)
CREATE TABLE suggestion_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suggestion_id UUID NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(suggestion_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_suggestions_status ON suggestions(status);
CREATE INDEX idx_suggestions_author ON suggestions(author_id);
CREATE INDEX idx_suggestions_vote_count ON suggestions(vote_count DESC);
CREATE INDEX idx_suggestions_created ON suggestions(created_at DESC);
CREATE INDEX idx_suggestion_votes_suggestion ON suggestion_votes(suggestion_id);
CREATE INDEX idx_suggestion_votes_user ON suggestion_votes(user_id);

-- Enable RLS
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestion_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for suggestions
CREATE POLICY "Anyone can view open suggestions" ON suggestions
    FOR SELECT USING (status IN ('open', 'shipped'));

CREATE POLICY "Writers can create suggestions" ON suggestions
    FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own suggestions" ON suggestions
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Authors and admins can delete suggestions" ON suggestions
    FOR DELETE USING (auth.uid() = author_id);

-- RLS Policies for votes
CREATE POLICY "Anyone can view votes" ON suggestion_votes
    FOR SELECT USING (true);

CREATE POLICY "Writers can add votes" ON suggestion_votes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Writers can remove their own votes" ON suggestion_votes
    FOR DELETE USING (auth.uid() = user_id);
