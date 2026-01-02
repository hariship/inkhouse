-- Seed feature updates with major platform features
-- Run this in Supabase SQL editor after running migration-feature-updates.sql

-- Get the super admin user id for created_by
DO $$
DECLARE
    admin_id UUID;
BEGIN
    -- Get the first super_admin user
    SELECT id INTO admin_id FROM users WHERE role = 'super_admin' LIMIT 1;

    IF admin_id IS NULL THEN
        RAISE EXCEPTION 'No super_admin user found';
    END IF;

    -- Insert feature updates (newest first based on when they were built)
    INSERT INTO feature_updates (title, description, category, created_by, created_at) VALUES
    (
        'Insights Dashboard',
        'Writers can now view analytics for their posts including views, reads, and engagement metrics. Also includes a critiques inbox for peer feedback.',
        'new',
        admin_id,
        NOW() - INTERVAL '1 day'
    ),
    (
        'Public API for Writers',
        'Writers can generate API keys and use the REST API to programmatically manage their posts. Full documentation available at /docs/api.',
        'new',
        admin_id,
        NOW() - INTERVAL '3 days'
    ),
    (
        'Reader Role & Reading Boxes',
        'Readers can now create accounts, save posts to personal reading boxes, and track their reading history.',
        'new',
        admin_id,
        NOW() - INTERVAL '5 days'
    ),
    (
        'Google OAuth Sign-in',
        'Sign in or join using your Google account for a faster, passwordless experience.',
        'new',
        admin_id,
        NOW() - INTERVAL '7 days'
    ),
    (
        'Full-Text Search',
        'Enhanced search now covers post titles, descriptions, and content with better relevance ranking.',
        'improved',
        admin_id,
        NOW() - INTERVAL '10 days'
    ),
    (
        'Mobile Responsive UI',
        'The entire platform has been optimized for mobile devices with improved navigation and touch-friendly interfaces.',
        'improved',
        admin_id,
        NOW() - INTERVAL '14 days'
    );

    RAISE NOTICE 'Successfully inserted 6 feature updates';
END $$;
