'use client'

import { useState, useEffect } from 'react'
import { Post, PostWithAuthor } from '@/types'
import Link from 'next/link'
import { Eye, Edit2, Trash2, Archive } from 'lucide-react'

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<PostWithAuthor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all')

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch('/api/admin/posts')
        const data = await response.json()
        if (data.success) {
          setPosts(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch posts:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPosts()
  }, [])

  const handleUpdateStatus = async (postId: number, status: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, status: status as Post['status'] } : p))
        )
      }
    } catch (error) {
      console.error('Failed to update post:', error)
    }
  }

  const handleDelete = async (postId: number) => {
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      const response = await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
      if (response.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId))
      }
    } catch (error) {
      console.error('Failed to delete post:', error)
    }
  }

  const filteredPosts = posts.filter((post) => {
    if (statusFilter === 'all') return true
    return post.status === statusFilter
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-button-primary)]"></div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] mb-6">
        All Posts ({posts.length})
      </h1>

      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
        {(['all', 'published', 'draft', 'archived'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap ${
              statusFilter === status
                ? 'btn-primary'
                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-3">
        {filteredPosts.map((post) => (
          <div
            key={post.id}
            className="bg-[var(--color-bg-card)] rounded-lg shadow p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-[var(--color-text-primary)] text-sm truncate">
                  {post.title}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  by {post.author?.display_name || 'Unknown'}
                </p>
              </div>
              <div className="flex space-x-1 shrink-0">
                {post.status === 'published' && (
                  <Link
                    href={`/post/${post.normalized_title}`}
                    className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-link)]"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                )}
                <Link
                  href={`/dashboard/edit/${post.id}`}
                  className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-link)]"
                >
                  <Edit2 className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => handleUpdateStatus(post.id, 'archived')}
                  className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-warning)]"
                >
                  <Archive className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(post.id)}
                  className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-error)]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${
                  post.status === 'published'
                    ? 'bg-[var(--color-success-light)] text-[var(--color-success)]'
                    : post.status === 'draft'
                    ? 'bg-[var(--color-warning-light)] text-[var(--color-warning)]'
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]'
                }`}
              >
                {post.status}
              </span>
              {post.category && (
                <span className="text-xs text-[var(--color-text-muted)]">
                  {post.category}
                </span>
              )}
              <span className="text-xs text-[var(--color-text-muted)]">
                {new Date(post.pub_date || post.updated_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block bg-[var(--color-bg-card)] rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-[var(--color-border-light)]">
          <thead className="bg-[var(--color-bg-tertiary)]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">
                Post
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">
                Author
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-text-muted)] uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-light)]">
            {filteredPosts.map((post) => (
              <tr key={post.id}>
                <td className="px-6 py-4">
                  <div className="font-medium text-[var(--color-text-primary)]">
                    {post.title}
                  </div>
                  {post.category && (
                    <div className="text-sm text-[var(--color-text-muted)]">
                      {post.category}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-[var(--color-text-muted)]">
                  {post.author?.display_name || 'Unknown'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      post.status === 'published'
                        ? 'bg-[var(--color-success-light)] text-[var(--color-success)]'
                        : post.status === 'draft'
                        ? 'bg-[var(--color-warning-light)] text-[var(--color-warning)]'
                        : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    {post.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-[var(--color-text-muted)]">
                  {new Date(post.pub_date || post.updated_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex justify-end space-x-1">
                    {post.status === 'published' && (
                      <div className="relative group">
                        <Link
                          href={`/post/${post.normalized_title}`}
                          className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-link)] block"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          View
                        </span>
                      </div>
                    )}
                    <div className="relative group">
                      <Link
                        href={`/dashboard/edit/${post.id}`}
                        className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-link)] block"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Link>
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Edit
                      </span>
                    </div>
                    <div className="relative group">
                      <button
                        onClick={() => handleUpdateStatus(post.id, 'archived')}
                        className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-warning)]"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Archive
                      </span>
                    </div>
                    <div className="relative group">
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-error)]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Delete
                      </span>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
