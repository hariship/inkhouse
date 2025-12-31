'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Post } from '@/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { NotebookPen, Eye, Edit2, Trash2, Plus } from 'lucide-react'

export default function DeskDashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all')

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch('/api/posts/my?type=desk')
        const data = await response.json()
        if (data.success) {
          setPosts(data.data)
        } else if (response.status === 403) {
          setError('You do not have permission to access this page')
          router.push('/dashboard')
        }
      } catch (error) {
        console.error('Failed to fetch desk posts:', error)
        setError('Failed to load desk posts')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPosts()
  }, [router])

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this desk post?')) return

    try {
      const response = await fetch(`/api/posts/${id}`, { method: 'DELETE' })
      if (response.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete post:', error)
    }
  }

  const filteredPosts = posts.filter((post) => {
    if (filter === 'all') return true
    return post.status === filter
  })

  const publishedCount = posts.filter((p) => p.status === 'published').length
  const draftCount = posts.filter((p) => p.status === 'draft').length

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-button-primary)]"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--color-error)]">{error}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <div className="flex items-center gap-2">
            <NotebookPen className="w-6 h-6 text-[var(--color-link)]" />
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">
              From the Desk
            </h1>
          </div>
          <p className="text-sm sm:text-base text-[var(--color-text-secondary)] mt-1">
            Manage Inkhouse updates, guidelines, and announcements
          </p>
        </div>
        <Link
          href="/dashboard/desk/new"
          className="btn-primary inline-flex items-center justify-center px-3 sm:px-4 py-2 rounded-md text-sm sm:text-base w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Desk Post
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8">
        <div className="bg-[var(--color-bg-card)] rounded-lg p-3 sm:p-4 shadow-[var(--shadow-light)]">
          <p className="text-xl sm:text-3xl font-bold text-[var(--color-text-primary)]">
            {posts.length}
          </p>
          <p className="text-xs sm:text-base text-[var(--color-text-secondary)]">Total</p>
        </div>
        <div className="bg-[var(--color-bg-card)] rounded-lg p-3 sm:p-4 shadow-[var(--shadow-light)]">
          <p className="text-xl sm:text-3xl font-bold text-[var(--color-success)]">{publishedCount}</p>
          <p className="text-xs sm:text-base text-[var(--color-text-secondary)]">Published</p>
        </div>
        <div className="bg-[var(--color-bg-card)] rounded-lg p-3 sm:p-4 shadow-[var(--shadow-light)]">
          <p className="text-xl sm:text-3xl font-bold text-[var(--color-warning)]">{draftCount}</p>
          <p className="text-xs sm:text-base text-[var(--color-text-secondary)]">Drafts</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
        {(['all', 'published', 'draft'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap ${
              filter === f
                ? 'btn-primary'
                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Posts list */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-12 bg-[var(--color-bg-card)] rounded-lg">
          <NotebookPen className="w-12 h-12 mx-auto text-[var(--color-text-muted)] mb-4" />
          <p className="text-[var(--color-text-muted)] mb-4">
            {filter === 'all'
              ? "No desk posts yet"
              : `No ${filter} desk posts`}
          </p>
          <Link
            href="/dashboard/desk/new"
            className="text-[var(--color-link)] hover:text-[var(--color-link-hover)]"
          >
            Create your first desk post →
          </Link>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="bg-[var(--color-bg-card)] rounded-lg shadow-[var(--shadow-light)] p-3 sm:p-4"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <NotebookPen className="w-4 h-4 text-[var(--color-link)] shrink-0" />
                    <h3 className="font-medium text-[var(--color-text-primary)] text-sm sm:text-base truncate max-w-[200px] sm:max-w-none">
                      {post.title}
                    </h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                        post.status === 'published'
                          ? 'bg-[var(--color-success-light)] text-[var(--color-success)]'
                          : 'bg-[var(--color-warning-light)] text-[var(--color-warning)]'
                      }`}
                    >
                      {post.status}
                    </span>
                  </div>
                  {post.description && (
                    <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1 line-clamp-1">
                      {post.description}
                    </p>
                  )}
                  <p className="text-xs text-[var(--color-text-muted)] mt-1 sm:mt-2">
                    {new Date(post.pub_date || post.updated_at).toLocaleDateString()}
                    {post.category && ` · ${post.category}`}
                  </p>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2 sm:ml-4">
                  {post.status === 'published' && (
                    <Link
                      href={`/desk/${post.normalized_title}`}
                      className="relative group p-1.5 sm:p-2 text-[var(--color-text-muted)] hover:text-[var(--color-link)]"
                    >
                      <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden sm:block absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        View
                      </span>
                    </Link>
                  )}
                  <Link
                    href={`/dashboard/edit/${post.id}`}
                    className="relative group p-1.5 sm:p-2 text-[var(--color-text-muted)] hover:text-[var(--color-link)]"
                  >
                    <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden sm:block absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Edit
                    </span>
                  </Link>
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="relative group p-1.5 sm:p-2 text-[var(--color-error)] hover:opacity-80"
                  >
                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden sm:block absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Delete
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
