import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  uuid,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'

// =====================================================
// 1. USERS
// =====================================================
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash'),
  display_name: text('display_name').notNull(),
  bio: text('bio'),
  avatar_url: text('avatar_url'),
  website_url: text('website_url'),
  social_links: jsonb('social_links').default({}),
  role: text('role').notNull().default('writer'),
  status: text('status').notNull().default('active'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  last_login_at: timestamp('last_login_at', { withTimezone: true }),
  google_id: text('google_id').unique(),
  auth_provider: text('auth_provider').default('local'),
})

// =====================================================
// 2. MEMBERSHIP REQUESTS
// =====================================================
export const membershipRequests = pgTable('membership_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  username: text('username').notNull(),
  bio: text('bio'),
  writing_sample: text('writing_sample'),
  portfolio_url: text('portfolio_url'),
  status: text('status').notNull().default('pending'),
  reviewed_by: uuid('reviewed_by').references(() => users.id),
  reviewed_at: timestamp('reviewed_at', { withTimezone: true }),
  rejection_reason: text('rejection_reason'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  google_id: text('google_id'),
  google_avatar_url: text('google_avatar_url'),
})

// =====================================================
// 3. POSTS
// =====================================================
export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  normalized_title: text('normalized_title').notNull().unique(),
  description: text('description'),
  image_url: text('image_url'),
  content: text('content').notNull(),
  category: text('category'),
  enclosure: text('enclosure'),
  pub_date: timestamp('pub_date', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  author_id: uuid('author_id').notNull().references(() => users.id),
  status: text('status').notNull().default('draft'),
  featured: boolean('featured').default(false),
  allow_comments: boolean('allow_comments').default(true),
  type: text('type').notNull().default('post'),
})

// =====================================================
// 4. COMMENTS
// =====================================================
export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  post_id: integer('post_id').references(() => posts.id, { onDelete: 'cascade' }),
  author_name: text('author_name').notNull(),
  author_email: text('author_email'),
  author_id: uuid('author_id').references(() => users.id),
  content: text('content').notNull(),
  parent_id: uuid('parent_id'),
  status: text('status').notNull().default('approved'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// =====================================================
// 5. LIKES
// =====================================================
export const likes = pgTable('likes', {
  id: serial('id').primaryKey(),
  post_id: integer('post_id').references(() => posts.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').references(() => users.id),
  ip_hash: text('ip_hash'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// =====================================================
// 6. SUBSCRIBERS
// =====================================================
export const subscribers = pgTable('subscribers', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  categories: text('categories').array(),
  frequency: text('frequency').default('weekly'),
  status: text('status').default('active'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// =====================================================
// 7. SESSIONS
// =====================================================
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  refresh_token: text('refresh_token').notNull(),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  user_agent: text('user_agent'),
  ip_address: text('ip_address'),
})

// =====================================================
// 8. EMAIL LOGS
// =====================================================
export const emailLogs = pgTable('email_logs', {
  id: serial('id').primaryKey(),
  subscriber_id: integer('subscriber_id').references(() => subscribers.id, { onDelete: 'set null' }),
  email: text('email').notNull(),
  post_id: integer('post_id').references(() => posts.id, { onDelete: 'set null' }),
  subject: text('subject').notNull(),
  sent_at: timestamp('sent_at', { withTimezone: true }).defaultNow(),
  status: text('status').notNull(),
  error: text('error'),
})

// =====================================================
// 9. API KEYS
// =====================================================
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  key_hash: text('key_hash').notNull(),
  key_prefix: text('key_prefix').notNull(),
  last_used_at: timestamp('last_used_at', { withTimezone: true }),
  expires_at: timestamp('expires_at', { withTimezone: true }),
  status: text('status').notNull().default('active'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// =====================================================
// 10. API RATE LIMITS
// =====================================================
export const apiRateLimits = pgTable('api_rate_limits', {
  id: uuid('id').primaryKey().defaultRandom(),
  api_key_id: uuid('api_key_id').notNull().references(() => apiKeys.id, { onDelete: 'cascade' }),
  window_start: timestamp('window_start', { withTimezone: true }).notNull(),
  request_count: integer('request_count').notNull().default(0),
})

// =====================================================
// 11. AUDIT LOGS
// =====================================================
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  action: text('action').notNull(),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  target_id: text('target_id'),
  target_type: text('target_type'),
  details: jsonb('details').default({}),
  ip_address: text('ip_address'),
  user_agent: text('user_agent'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// =====================================================
// 12. POST READS
// =====================================================
export const postReads = pgTable('post_reads', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  post_id: integer('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  read_at: timestamp('read_at', { withTimezone: true }).defaultNow(),
})

// =====================================================
// 13. BOOKMARKS
// =====================================================
export const bookmarks = pgTable('bookmarks', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  post_id: integer('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// =====================================================
// 14. READING LISTS
// =====================================================
export const readingLists = pgTable('reading_lists', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// =====================================================
// 15. READING LIST ITEMS
// =====================================================
export const readingListItems = pgTable('reading_list_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  list_id: uuid('list_id').notNull().references(() => readingLists.id, { onDelete: 'cascade' }),
  post_id: integer('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  added_at: timestamp('added_at', { withTimezone: true }).defaultNow(),
})

// =====================================================
// 16. USER PREFERENCES
// =====================================================
export const userPreferences = pgTable('user_preferences', {
  user_id: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  view_mode: text('view_mode').default('grid'),
  default_sort: text('default_sort').default('date'),
  default_filter: text('default_filter').default('unread'),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// =====================================================
// 17. CRITIQUES
// =====================================================
export const critiques = pgTable('critiques', {
  id: uuid('id').primaryKey().defaultRandom(),
  post_id: integer('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  author_id: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  parent_id: uuid('parent_id'),
  status: text('status').notNull().default('active'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// =====================================================
// 18. PAGE VIEWS
// =====================================================
export const pageViews = pgTable('page_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  post_id: integer('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  viewed_at: timestamp('viewed_at', { withTimezone: true }).defaultNow(),
})

// =====================================================
// 19. SUGGESTIONS
// =====================================================
export const suggestions = pgTable('suggestions', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  author_id: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').default('open'),
  vote_count: integer('vote_count').default(0),
  github_issue_url: text('github_issue_url'),
  github_issue_created_at: timestamp('github_issue_created_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// =====================================================
// 20. SUGGESTION VOTES
// =====================================================
export const suggestionVotes = pgTable('suggestion_votes', {
  id: uuid('id').primaryKey().defaultRandom(),
  suggestion_id: uuid('suggestion_id').notNull().references(() => suggestions.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// =====================================================
// 21. FEATURE UPDATES
// =====================================================
export const featureUpdates = pgTable('feature_updates', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  category: text('category').notNull(),
  created_by: uuid('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// =====================================================
// 22. USER DRAFTS
// =====================================================
export const userDrafts = pgTable('user_drafts', {
  id: serial('id').primaryKey(),
  user_id: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').default(''),
  description: text('description').default(''),
  content: text('content').default(''),
  category: text('category').default(''),
  image_url: text('image_url').default(''),
  featured: boolean('featured').default(false),
  allow_comments: boolean('allow_comments').default(true),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// =====================================================
// 23. PASSWORD RESET TOKENS
// =====================================================
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  used_at: timestamp('used_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
