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
  role: 'admin' | 'writer'
  status: 'active' | 'suspended' | 'deleted'
  created_at: string
  updated_at: string
  last_login_at?: string
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
  role: 'admin' | 'writer'
}

// Component Props
export interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'writer'
}
