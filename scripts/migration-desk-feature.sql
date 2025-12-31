-- =====================================================
-- MIGRATION: "From the Desk" Feature
-- Adds super_admin role and post type field
-- =====================================================

-- 1. Add super_admin to users role constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('super_admin', 'admin', 'writer'));

-- 2. Add type field to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'post';

-- 3. Add check constraint for post type
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_type_check;
ALTER TABLE posts ADD CONSTRAINT posts_type_check
  CHECK (type IN ('post', 'desk'));

-- 4. Create index for post type
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type);

-- 5. Promote super admin user (run manually with your admin email)
-- UPDATE users SET role = 'super_admin' WHERE email = 'your-admin-email@example.com';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check role constraint
-- SELECT constraint_name, check_clause FROM information_schema.check_constraints
-- WHERE constraint_name = 'users_role_check';

-- Check posts table has type column
-- SELECT column_name, data_type, column_default FROM information_schema.columns
-- WHERE table_name = 'posts' AND column_name = 'type';
