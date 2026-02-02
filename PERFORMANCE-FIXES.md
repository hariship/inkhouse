# Performance Fixes

## What Changed (commit `09941a4`)

### 1. Admin Analytics — N+1 Query Elimination
**File:** `src/app/api/admin/analytics/route.ts`

**Before:** Looped over top 10 authors making 2 DB queries each (fetch posts, then fetch view counts) = 20 extra round-trips.

**After:** Reuses post IDs already fetched in the initial query. Makes a single `page_views` query for all top authors' posts, then groups view counts by author in JS.

**Impact:** 20 queries reduced to 1.

---

### 2. Writer Analytics — Server-Side Counting via RPC
**File:** `src/app/api/analytics/writer/route.ts`

**Before:** 6 parallel queries downloaded ALL rows from `page_views`, `post_reads`, `reading_list_items`, `bookmarks`, `comments`, and `critiques` just to `.length` them in JS. A writer with 10,000 views would download 10,000 rows.

**After:** Calls `get_writer_post_stats` RPC function that does `GROUP BY` counting in PostgreSQL and returns only per-post counts. Falls back to the original 6-query approach if the RPC function doesn't exist yet.

**Impact:** 6 queries returning all rows reduced to 1 query returning counts only. Massive bandwidth reduction.

---

### 3. Search Filter Cleanup
**File:** `src/app/api/posts/route.ts`

**Before:** Built search filter string by concatenating into a mutable `let` variable with inline string manipulation.

**After:** Uses an array-based approach to build the OR filter cleanly. The separate author lookup query is kept (necessary due to PostgREST limitations) but the code is cleaner. Will benefit from the new GIN trigram indexes.

---

### 4. Fetch Interceptor Fix
**File:** `src/contexts/AuthContext.tsx`

**Before:** The global `window.fetch` interceptor had two bugs:
- Used the intercepted `fetch` (not `originalFetch`) for the `/api/auth/me` refresh call, causing recursion
- No deduplication — multiple concurrent 401s would each trigger their own refresh

**After:**
- Auth endpoints skip the interceptor entirely (early return before `await`)
- Refresh call uses `originalFetch` to avoid recursion
- `isRefreshing` ref + shared promise deduplicates concurrent refresh attempts

---

### 5. SQL Schema Additions
**File:** `scripts/setup-supabase.sql`

Added:
- `get_writer_post_stats(author_uuid)` — RPC function that returns per-post counts via LEFT JOINs and GROUP BY
- `pg_trgm` extension — enables trigram-based fuzzy matching
- GIN trigram indexes on `posts(title)`, `posts(description)`, `posts(category)`, `users(display_name)`, `users(username)`
- Composite index `posts(status, pub_date DESC)` for the main listing query

---

## Pending (must be done manually)

### Deploy SQL to Supabase
The SQL changes in `scripts/setup-supabase.sql` need to be run in the Supabase SQL Editor:

1. **RPC function** — Run the `CREATE OR REPLACE FUNCTION get_writer_post_stats(...)` block. Until this is deployed, writer analytics will use the fallback (original 6-query approach).

2. **pg_trgm extension** — Run `CREATE EXTENSION IF NOT EXISTS pg_trgm;`. This enables trigram indexes.

3. **Trigram indexes** — Run the 5 `CREATE INDEX ... USING gin ... gin_trgm_ops` statements. Until deployed, `ilike` queries will still work but do sequential scans.

4. **Composite index** — Run `CREATE INDEX IF NOT EXISTS idx_posts_status_pub_date ON posts(status, pub_date DESC);`. Speeds up the main posts listing query.

### Testing Needed
- [ ] Log in as admin, visit `/admin/analytics` — verify top authors display correctly with view counts
- [ ] Log in as writer, visit `/dashboard/insights` — verify per-post stats are correct
- [ ] Test search on homepage — try searching by post title, category, and author name
- [ ] Check browser Network tab on 401 — verify only one `/api/auth/me` refresh call fires (not multiple)
- [ ] After deploying RPC: verify writer analytics Network tab shows single RPC call instead of 6 queries

### Future Improvements (not in scope)
- Admin analytics: the `page_views` query for top authors still downloads all view rows to count them. Could use `count: 'exact', head: true` with individual per-author queries batched via RPC, or add a materialized view.
- Consider adding `EXPLAIN ANALYZE` benchmarks before/after trigram indexes to measure actual improvement.
- The fetch interceptor could be replaced with an Axios-style interceptor or a custom hook if the codebase moves away from raw `fetch`.
