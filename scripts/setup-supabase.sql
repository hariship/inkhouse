-- =====================================================
-- INKHOUSE BLOG PLATFORM - DATABASE SCHEMA
-- =====================================================

-- 1. USERS TABLE (Writers and Admins)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    website_url TEXT,
    social_links JSONB DEFAULT '{}',
    role TEXT NOT NULL DEFAULT 'writer' CHECK (role IN ('admin', 'writer')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- 2. MEMBERSHIP REQUESTS TABLE
CREATE TABLE IF NOT EXISTS membership_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    username TEXT NOT NULL,
    bio TEXT,
    writing_sample TEXT,
    portfolio_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. POSTS TABLE
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    normalized_title TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    content TEXT NOT NULL,
    category TEXT,
    enclosure TEXT,
    pub_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    author_id UUID NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    featured BOOLEAN DEFAULT FALSE,
    allow_comments BOOLEAN DEFAULT TRUE
);

-- 4. COMMENTS TABLE
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    author_email TEXT,
    author_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'spam', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. LIKES TABLE
CREATE TABLE IF NOT EXISTS likes (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    ip_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id),
    UNIQUE(post_id, ip_hash)
);

-- 6. SUBSCRIBERS TABLE
CREATE TABLE IF NOT EXISTS subscribers (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    categories TEXT[],
    frequency TEXT DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'unsubscribed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. SESSIONS TABLE (for JWT refresh tokens)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_agent TEXT,
    ip_address TEXT
);

-- 8. EMAIL LOGS TABLE
CREATE TABLE IF NOT EXISTS email_logs (
    id SERIAL PRIMARY KEY,
    subscriber_id INTEGER REFERENCES subscribers(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    post_id INTEGER REFERENCES posts(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
    error TEXT
);

-- 9. API KEYS TABLE
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. API RATE LIMITS TABLE
CREATE TABLE IF NOT EXISTS api_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0,
    UNIQUE(api_key_id, window_start)
);

-- 11. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_id TEXT,
    target_type TEXT,
    details JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

CREATE INDEX IF NOT EXISTS idx_membership_requests_status ON membership_requests(status);
CREATE INDEX IF NOT EXISTS idx_membership_requests_email ON membership_requests(email);

CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_normalized_title ON posts(normalized_title);
CREATE INDEX IF NOT EXISTS idx_posts_pub_date ON posts(pub_date DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);

CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(status);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_key_window ON api_rate_limits(api_key_id, window_start);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role has full access to all tables
CREATE POLICY "Service role full access users" ON users FOR ALL USING (true);
CREATE POLICY "Service role full access membership_requests" ON membership_requests FOR ALL USING (true);
CREATE POLICY "Service role full access posts" ON posts FOR ALL USING (true);
CREATE POLICY "Service role full access likes" ON likes FOR ALL USING (true);
CREATE POLICY "Service role full access comments" ON comments FOR ALL USING (true);
CREATE POLICY "Service role full access subscribers" ON subscribers FOR ALL USING (true);
CREATE POLICY "Service role full access sessions" ON sessions FOR ALL USING (true);
CREATE POLICY "Service role full access email_logs" ON email_logs FOR ALL USING (true);
CREATE POLICY "Service role full access api_keys" ON api_keys FOR ALL USING (true);
CREATE POLICY "Service role full access api_rate_limits" ON api_rate_limits FOR ALL USING (true);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_membership_requests_updated_at
    BEFORE UPDATE ON membership_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscribers_updated_at
    BEFORE UPDATE ON subscribers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTION: Normalize title for URL
-- =====================================================
CREATE OR REPLACE FUNCTION normalize_title(title TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(
        REGEXP_REPLACE(
            REGEXP_REPLACE(title, '[^a-zA-Z0-9\s-]', '', 'g'),
            '\s+', '-', 'g'
        )
    );
END;
$$ LANGUAGE plpgsql;
