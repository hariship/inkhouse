'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Post } from '@/types'
import Link from 'next/link'
import { PenLine, Eye, Edit2, Trash2 } from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all')

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch('/api/posts/my')
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

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this post?')) return

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

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            My Posts
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            Welcome back, {user?.display_name}
          </p>
        </div>
        <Link
          href="/dashboard/new"
          className="btn-primary inline-flex items-center px-4 py-2 rounded-md"
        >
          <PenLine className="w-4 h-4 mr-2" />
          New Post
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[var(--color-bg-card)] rounded-lg p-4 shadow-[var(--shadow-light)]">
          <p className="text-3xl font-bold text-[var(--color-text-primary)]">
            {posts.length}
          </p>
          <p className="text-[var(--color-text-secondary)]">Total Posts</p>
        </div>
        <div className="bg-[var(--color-bg-card)] rounded-lg p-4 shadow-[var(--shadow-light)]">
          <p className="text-3xl font-bold text-[var(--color-success)]">{publishedCount}</p>
          <p className="text-[var(--color-text-secondary)]">Published</p>
        </div>
        <div className="bg-[var(--color-bg-card)] rounded-lg p-4 shadow-[var(--shadow-light)]">
          <p className="text-3xl font-bold text-[var(--color-warning)]">{draftCount}</p>
          <p className="text-[var(--color-text-secondary)]">Drafts</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex space-x-2 mb-6">
        {(['all', 'published', 'draft'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
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
          <PenLine className="w-12 h-12 mx-auto text-[var(--color-text-muted)] mb-4" />
          <p className="text-[var(--color-text-muted)] mb-4">
            {filter === 'all'
              ? "You haven't written any posts yet"
              : `No ${filter} posts`}
          </p>
          <Link
            href="/dashboard/new"
            className="text-[var(--color-link)] hover:text-[var(--color-link-hover)]"
          >
            Write your first post →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="bg-[var(--color-bg-card)] rounded-lg shadow-[var(--shadow-light)] p-4 flex justify-between items-center"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium text-[var(--color-text-primary)]">
                    {post.title}
                  </h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      post.status === 'published'
                        ? 'bg-[var(--color-success-light)] text-[var(--color-success)]'
                        : 'bg-[var(--color-warning-light)] text-[var(--color-warning)]'
                    }`}
                  >
                    {post.status}
                  </span>
                  {post.featured && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      Featured
                    </span>
                  )}
                </div>
                {post.description && (
                  <p className="text-sm text-[var(--color-text-secondary)] mt-1 line-clamp-1">
                    {post.description}
                  </p>
                )}
                <p className="text-xs text-[var(--color-text-muted)] mt-2">
                  {new Date(post.pub_date).toLocaleDateString()}
                  {post.category && ` · ${post.category}`}
                </p>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                {post.status === 'published' && (
                  <Link
                    href={`/post/${post.normalized_title}`}
                    className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                    title="View"
                  >
                    <Eye className="w-5 h-5" />
                  </Link>
                )}
                <Link
                  href={`/dashboard/edit/${post.id}`}
                  className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  title="Edit"
                >
                  <Edit2 className="w-5 h-5" />
                </Link>
                <button
                  onClick={() => handleDelete(post.id)}
                  className="p-2 text-[var(--color-error)] hover:opacity-80"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
