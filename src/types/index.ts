// User types
export interface User {
  id: string
  email: string
  username: string
  password_hash?: string
  display_name: string
  bio?: string
  avatar_url?: string
  website_url?: string
  social_links?: Record<string, string>
  role: 'super_admin' | 'admin' | 'writer' | 'reader'
  status: 'active' | 'suspended' | 'deleted'
  created_at: string
  updated_at: string
  last_login_at?: string
  google_id?: string
  auth_provider?: 'local' | 'google' | 'both'
}

export type PublicUser = Omit<User, 'password_hash' | 'email'>

// Membership request types
export interface MembershipRequest {
  id: string
  email: string
  name: string
  username: string
  bio?: string
  writing_sample?: string
  portfolio_url?: string
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by?: string
  reviewed_at?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
  google_id?: string
  google_avatar_url?: string
}

// Post types
export interface Post {
  id: number
  title: string
  normalized_title: string
  description?: string
  image_url?: string
  content: string
  category?: string
  enclosure?: string
  pub_date: string
  updated_at: string
  author_id: string
  status: 'draft' | 'published' | 'archived'
  featured: boolean
  allow_comments: boolean
  type: 'post' | 'desk'
}

export interface PostWithAuthor extends Post {
  author: PublicUser
}

export interface PostWithStats extends PostWithAuthor {
  likes_count: number
  comments_count: number
}

// Comment types
export interface Comment {
  id: string
  post_id: number
  author_name: string
  author_email?: string
  author_id?: string
  content: string
  parent_id?: string
  status: 'pending' | 'approved' | 'spam' | 'deleted'
  created_at: string
  updated_at: string
}

export interface CommentWithAuthor extends Comment {
  author?: PublicUser
  replies?: CommentWithAuthor[]
}

// Like types
export interface Like {
  id: number
  post_id: number
  user_id?: string
  ip_hash?: string
  created_at: string
}

// Subscriber types
export interface Subscriber {
  id: number
  email: string
  name?: string
  categories?: string[]
  frequency: 'daily' | 'weekly' | 'monthly'
  status: 'active' | 'inactive' | 'unsubscribed'
  created_at: string
  updated_at: string
}

// Session types
export interface Session {
  id: string
  user_id: string
  refresh_token: string
  expires_at: string
  created_at: string
  user_agent?: string
  ip_address?: string
}

// API Key types
export interface ApiKey {
  id: string
  user_id: string
  name: string
  key_prefix: string
  last_used_at?: string
  expires_at?: string
  status: 'active' | 'revoked'
  created_at: string
  updated_at: string
}

export interface ApiKeyWithSecret extends ApiKey {
  secret: string // Only returned once on creation
}

export interface CreateApiKeyRequest {
  name: string
  expires_in_days?: number // 30, 90, 365, or null for never
}

// Public API types
export interface PublicApiPost {
  id: number
  title: string
  slug: string
  description?: string
  content: string
  category?: string
  image_url?: string
  status: 'draft' | 'published' | 'archived'
  featured: boolean
  allow_comments: boolean
  pub_date?: string
  created_at: string
  updated_at: string
}

export interface PublicApiError {
  code: string
  message: string
}

export interface PublicApiRateLimit {
  limit: number
  remaining: number
  reset: string
}

export interface PublicApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: PublicApiError
  meta?: {
    page?: number
    limit?: number
    total?: number
    rate_limit?: PublicApiRateLimit
  }
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Form data types
export interface LoginFormData {
  email: string
  password: string
}

export interface JoinRequestFormData {
  email: string
  name: string
  username: string
  bio?: string
  writing_sample: string
  portfolio_url?: string
}

export interface PostFormData {
  title: string
  description?: string
  content: string
  category?: string
  image_url?: string
  status: 'draft' | 'published' | 'archived'
  featured?: boolean
  allow_comments?: boolean
  type?: 'post' | 'desk'
}

export interface ProfileFormData {
  display_name: string
  bio?: string
  avatar_url?: string
  website_url?: string
  social_links?: Record<string, string>
}

export interface CommentFormData {
  content: string
  author_name: string
  author_email?: string
  parent_id?: string
}

export interface SubscribeFormData {
  email: string
  name?: string
  categories?: string[]
  frequency?: 'daily' | 'weekly' | 'monthly'
}

// JWT Payload
export interface JWTPayload {
  userId: string
  email: string
  username: string
  role: 'super_admin' | 'admin' | 'writer' | 'reader'
}

// Component Props
export interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: 'super_admin' | 'admin' | 'writer' | 'reader'
}

// Reading feature types
export interface PostRead {
  id: string
  user_id: string
  post_id: number
  read_at: string
}

export interface Bookmark {
  id: string
  user_id: string
  post_id: number
  created_at: string
}

export interface ReadingList {
  id: string
  user_id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
  items?: ReadingListItem[]
  item_count?: number
}

export interface ReadingListItem {
  id: string
  list_id: string
  post_id: number
  added_at: string
  post?: Post
}

export interface UserPreferences {
  user_id: string
  view_mode: 'grid' | 'list'
  default_sort: 'date' | 'category'
  updated_at?: string
}

export interface ReaderSignupFormData {
  email: string
  password: string
  display_name: string
  username: string
}

// Reading filter types
export type ReadingFilter = 'all' | 'unread' | 'read' | 'saved'
export type SortOption = 'date' | 'category'
export type ViewMode = 'grid' | 'list'

// Suggestion types
export interface Suggestion {
  id: string
  title: string
  description?: string
  author_id: string
  status: 'open' | 'shipped' | 'closed'
  vote_count: number
  github_issue_url?: string
  github_issue_created_at?: string
  created_at: string
  updated_at: string
}

export interface SuggestionWithAuthor extends Suggestion {
  author: PublicUser
  has_voted?: boolean
}

export interface SuggestionVote {
  id: string
  suggestion_id: string
  user_id: string
  created_at: string
}

export interface SuggestionFormData {
  title: string
  description?: string
}

// Critique types (private peer reviews)
export interface Critique {
  id: string
  post_id: number
  author_id: string
  content: string
  parent_id?: string
  status: 'active' | 'deleted'
  created_at: string
  updated_at: string
}

export interface CritiqueWithAuthor extends Critique {
  author: PublicUser
  replies?: CritiqueWithAuthor[]
}

export interface CritiqueFormData {
  content: string
  parent_id?: string
}

// Analytics types
export interface PageView {
  id: string
  post_id: number
  viewed_at: string
}

export interface PostAnalytics {
  post_id: number
  title: string
  normalized_title: string
  views: number
  reads: number
  box_additions: number
  bookmarks: number
  comments: number
  critiques: number
}

export interface WriterAnalytics {
  total_posts: number
  total_views: number
  total_reads: number
  total_box_additions: number
  total_bookmarks: number
  total_comments: number
  total_critiques: number
  posts: PostAnalytics[]
}

export interface AdminAnalytics {
  total_users: number
  total_writers: number
  total_readers: number
  total_posts: number
  total_views: number
  user_growth: { date: string; count: number }[]
  content_growth: { date: string; count: number }[]
  top_authors: { author: PublicUser; post_count: number; total_views: number }[]
}
