#!/usr/bin/env node
/**
 * Migrate InkHouse backup JSON data into Neon PostgreSQL.
 * Run: node scripts/migrate-to-neon.mjs
 *
 * Requires DATABASE_URL env var.
 */

import { readFileSync } from 'fs'
import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

const sql = neon(DATABASE_URL)
const BACKUP_DIR = new URL('../backup-2026-03-02/', import.meta.url).pathname

function loadJSON(table) {
  try {
    const raw = readFileSync(`${BACKUP_DIR}${table}.json`, 'utf8')
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

async function insertBatch(table, rows, columns, batchSize = 50) {
  if (!rows.length) {
    console.log(`  ${table}: 0 rows (skipped)`)
    return
  }

  let inserted = 0
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const valuePlaceholders = batch.map((_, rowIdx) => {
      const offset = rowIdx * columns.length
      return `(${columns.map((_, colIdx) => `$${offset + colIdx + 1}`).join(', ')})`
    }).join(', ')

    const values = batch.flatMap(row =>
      columns.map(col => {
        const val = row[col]
        // Convert JS objects to JSON strings for jsonb columns
        if (val !== null && val !== undefined && typeof val === 'object' && !(val instanceof Date)) {
          return JSON.stringify(val)
        }
        return val ?? null
      })
    )

    const colNames = columns.map(c => `"${c}"`).join(', ')
    try {
      await sql.query(`INSERT INTO "${table}" (${colNames}) VALUES ${valuePlaceholders} ON CONFLICT DO NOTHING`, values)
      inserted += batch.length
    } catch (err) {
      console.log(`  ${table}: batch ${i}-${i + batch.length} failed (${err.code || err.message}), skipping`)
    }
  }
  console.log(`  ${table}: ${inserted} rows`)
}

async function main() {
  console.log('Starting InkHouse data migration to Neon...\n')

  // Insert order respects foreign keys: parents first, then dependents

  // 1. users (no FK dependencies)
  const users = loadJSON('users')
  const userCols = ['id', 'email', 'username', 'password_hash', 'display_name', 'bio', 'avatar_url', 'website_url', 'social_links', 'role', 'status', 'created_at', 'updated_at', 'last_login_at', 'google_id', 'auth_provider']
  await insertBatch('users', users, userCols)

  // 2. membership_requests (FK: users.id via reviewed_by)
  const membershipRequests = loadJSON('membership_requests')
  const mrCols = ['id', 'email', 'name', 'username', 'bio', 'writing_sample', 'portfolio_url', 'status', 'reviewed_by', 'reviewed_at', 'rejection_reason', 'created_at', 'updated_at', 'google_id', 'google_avatar_url']
  await insertBatch('membership_requests', membershipRequests, mrCols)

  // 3. posts (FK: users.id via author_id) — SERIAL PK
  const posts = loadJSON('posts')
  const postCols = ['id', 'title', 'normalized_title', 'description', 'image_url', 'content', 'category', 'enclosure', 'pub_date', 'updated_at', 'author_id', 'status', 'featured', 'allow_comments', 'type']
  await insertBatch('posts', posts, postCols)

  // 4. comments (FK: posts.id, users.id)
  const comments = loadJSON('comments')
  const commentCols = ['id', 'post_id', 'author_name', 'author_email', 'author_id', 'content', 'parent_id', 'status', 'created_at', 'updated_at']
  await insertBatch('comments', comments, commentCols)

  // 5. likes (FK: posts.id, users.id) — SERIAL PK
  const likes = loadJSON('likes')
  const likeCols = ['id', 'post_id', 'user_id', 'ip_hash', 'created_at']
  await insertBatch('likes', likes, likeCols)

  // 6. subscribers — SERIAL PK
  const subscribers = loadJSON('subscribers')
  const subCols = ['id', 'email', 'name', 'categories', 'frequency', 'status', 'created_at', 'updated_at']
  await insertBatch('subscribers', subscribers, subCols)

  // 7. sessions (FK: users.id)
  const sessions = loadJSON('sessions')
  const sessCols = ['id', 'user_id', 'refresh_token', 'expires_at', 'created_at', 'user_agent', 'ip_address']
  await insertBatch('sessions', sessions, sessCols)

  // 8. email_logs (FK: subscribers.id, posts.id) — SERIAL PK
  const emailLogs = loadJSON('email_logs')
  const elCols = ['id', 'subscriber_id', 'email', 'post_id', 'subject', 'sent_at', 'status', 'error']
  await insertBatch('email_logs', emailLogs, elCols)

  // 9. api_keys (FK: users.id)
  const apiKeys = loadJSON('api_keys')
  const akCols = ['id', 'user_id', 'name', 'key_hash', 'key_prefix', 'last_used_at', 'expires_at', 'status', 'created_at', 'updated_at']
  await insertBatch('api_keys', apiKeys, akCols)

  // 10. api_rate_limits (FK: api_keys.id)
  const apiRateLimits = loadJSON('api_rate_limits')
  const arlCols = ['id', 'api_key_id', 'window_start', 'request_count']
  await insertBatch('api_rate_limits', apiRateLimits, arlCols)

  // 11. audit_logs (FK: users.id)
  const auditLogs = loadJSON('audit_logs')
  const alCols = ['id', 'action', 'user_id', 'target_id', 'target_type', 'details', 'ip_address', 'user_agent', 'created_at']
  await insertBatch('audit_logs', auditLogs, alCols)

  // 12. post_reads (FK: users.id, posts.id)
  const postReads = loadJSON('post_reads')
  const prCols = ['id', 'user_id', 'post_id', 'read_at']
  await insertBatch('post_reads', postReads, prCols)

  // 13. bookmarks (FK: users.id, posts.id)
  const bookmarksData = loadJSON('bookmarks')
  const bkCols = ['id', 'user_id', 'post_id', 'created_at']
  await insertBatch('bookmarks', bookmarksData, bkCols)

  // 14. reading_lists (FK: users.id)
  const readingLists = loadJSON('reading_lists')
  const rlCols = ['id', 'user_id', 'name', 'description', 'created_at', 'updated_at']
  await insertBatch('reading_lists', readingLists, rlCols)

  // 15. reading_list_items (FK: reading_lists.id, posts.id)
  const readingListItems = loadJSON('reading_list_items')
  const rliCols = ['id', 'list_id', 'post_id', 'added_at']
  await insertBatch('reading_list_items', readingListItems, rliCols)

  // 16. user_preferences (FK: users.id)
  const userPrefs = loadJSON('user_preferences')
  const upCols = ['user_id', 'view_mode', 'default_sort', 'default_filter', 'updated_at']
  await insertBatch('user_preferences', userPrefs, upCols)

  // 17. critiques (FK: posts.id, users.id)
  const critiques = loadJSON('critiques')
  const crCols = ['id', 'post_id', 'author_id', 'content', 'parent_id', 'status', 'created_at', 'updated_at']
  await insertBatch('critiques', critiques, crCols)

  // 18. page_views (FK: posts.id)
  const pageViews = loadJSON('page_views')
  const pvCols = ['id', 'post_id', 'viewed_at']
  await insertBatch('page_views', pageViews, pvCols)

  // 19. suggestions (FK: users.id)
  const suggestionsData = loadJSON('suggestions')
  const sgCols = ['id', 'title', 'description', 'author_id', 'status', 'vote_count', 'github_issue_url', 'github_issue_created_at', 'created_at', 'updated_at']
  await insertBatch('suggestions', suggestionsData, sgCols)

  // 20. suggestion_votes (FK: suggestions.id, users.id)
  const suggestionVotes = loadJSON('suggestion_votes')
  const svCols = ['id', 'suggestion_id', 'user_id', 'created_at']
  await insertBatch('suggestion_votes', suggestionVotes, svCols)

  // 21. feature_updates (FK: users.id)
  const featureUpdates = loadJSON('feature_updates')
  const fuCols = ['id', 'title', 'description', 'category', 'created_by', 'created_at']
  await insertBatch('feature_updates', featureUpdates, fuCols)

  // 22. user_drafts (FK: users.id) — SERIAL PK
  const userDrafts = loadJSON('user_drafts')
  const udCols = ['id', 'user_id', 'title', 'description', 'content', 'category', 'image_url', 'featured', 'allow_comments', 'created_at', 'updated_at']
  await insertBatch('user_drafts', userDrafts, udCols)

  // 23. password_reset_tokens (FK: users.id)
  const passwordResetTokens = loadJSON('password_reset_tokens')
  const prtCols = ['id', 'user_id', 'token', 'expires_at', 'used_at', 'created_at']
  await insertBatch('password_reset_tokens', passwordResetTokens, prtCols)

  // Reset SERIAL sequences
  console.log('\nResetting SERIAL sequences...')
  await sql`SELECT setval('posts_id_seq', COALESCE((SELECT MAX(id) FROM posts), 0) + 1, false)`
  await sql`SELECT setval('likes_id_seq', COALESCE((SELECT MAX(id) FROM likes), 0) + 1, false)`
  await sql`SELECT setval('subscribers_id_seq', COALESCE((SELECT MAX(id) FROM subscribers), 0) + 1, false)`
  await sql`SELECT setval('email_logs_id_seq', COALESCE((SELECT MAX(id) FROM email_logs), 0) + 1, false)`
  await sql`SELECT setval('user_drafts_id_seq', COALESCE((SELECT MAX(id) FROM user_drafts), 0) + 1, false)`
  console.log('  Sequences reset.')

  // Verify row counts
  console.log('\nVerifying row counts...')
  const tables = [
    'users', 'membership_requests', 'posts', 'comments', 'likes', 'subscribers',
    'sessions', 'email_logs', 'api_keys', 'api_rate_limits', 'audit_logs',
    'post_reads', 'bookmarks', 'reading_lists', 'reading_list_items',
    'user_preferences', 'critiques', 'page_views', 'suggestions', 'suggestion_votes',
    'feature_updates', 'user_drafts', 'password_reset_tokens'
  ]
  for (const table of tables) {
    const [{ count }] = await sql.query(`SELECT COUNT(*) as count FROM "${table}"`)
    console.log(`  ${table}: ${count}`)
  }

  console.log('\nMigration complete!')
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
