'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { CommentWithAuthor } from '@/types'
import { User, MessageSquare } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface CommentsSectionProps {
  postId: number
  allowComments: boolean
}

export function CommentsSection({ postId, allowComments }: CommentsSectionProps) {
  const { user, isAuthenticated } = useAuth()
  const pathname = usePathname()
  const [comments, setComments] = useState<CommentWithAuthor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    content: '',
    author_name: '',
    author_email: '',
  })
  const [replyTo, setReplyTo] = useState<string | null>(null)

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await fetch(`/api/comments?postId=${postId}`)
        const data = await response.json()
        if (data.success) {
          setComments(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch comments:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchComments()
  }, [postId])

  const handleSubmit = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault()
    if (!formData.content.trim()) return
    if (!isAuthenticated && !formData.author_name.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: postId,
          content: formData.content,
          author_name: isAuthenticated ? user?.display_name : formData.author_name,
          author_email: isAuthenticated ? user?.email : formData.author_email,
          parent_id: parentId || null,
        }),
      })

      const data = await response.json()
      if (data.success) {
        // Refresh comments
        const refreshResponse = await fetch(`/api/comments?postId=${postId}`)
        const refreshData = await refreshResponse.json()
        if (refreshData.success) {
          setComments(refreshData.data)
        }
        setFormData({ content: '', author_name: '', author_email: '' })
        setReplyTo(null)
      }
    } catch (error) {
      console.error('Failed to post comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!allowComments) {
    return (
      <div className="text-center py-8 text-[var(--color-text-muted)]">
        Comments are disabled for this post.
      </div>
    )
  }

  return (
    <div className="mt-12 border-t border-[var(--color-border-light)] pt-8">
      <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-6 flex items-center">
        <MessageSquare className="w-5 h-5 mr-2" />
        Comments ({comments.length})
      </h3>

      {/* Comment Form */}
      <form onSubmit={(e) => handleSubmit(e)} className="mb-8">
        {isAuthenticated && (
          <p className="text-sm text-[var(--color-text-muted)] mb-3">
            Commenting as <span className="font-medium text-[var(--color-text-primary)]">{user?.display_name}</span>
          </p>
        )}
        {!isAuthenticated && (
          <div className="mb-4">
            <p className="text-sm text-[var(--color-text-muted)] mb-3">
              Have an account?{' '}
              <Link href={`/login?redirect=${encodeURIComponent(pathname)}`} className="text-[var(--color-link)] hover:text-[var(--color-link-hover)] font-medium">
                Sign in
              </Link>
              {' '}to comment as yourself
            </p>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Your name *"
                value={formData.author_name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, author_name: e.target.value }))
                }
                required
                className="px-4 py-2 border border-[var(--color-border-medium)] rounded-md text-[var(--color-text-primary)] bg-[var(--color-bg-card)] focus:ring-1 focus:ring-[#0D9488] focus:border-[#0D9488] focus:outline-none"
              />
              <input
                type="email"
                placeholder="Your email (optional)"
                value={formData.author_email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, author_email: e.target.value }))
                }
                className="px-4 py-2 border border-[var(--color-border-medium)] rounded-md text-[var(--color-text-primary)] bg-[var(--color-bg-card)] focus:ring-1 focus:ring-[#0D9488] focus:border-[#0D9488] focus:outline-none"
              />
            </div>
          </div>
        )}
        <textarea
          placeholder="Write a comment..."
          value={formData.content}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, content: e.target.value }))
          }
          rows={3}
          required
          className="w-full px-4 py-2 border border-[var(--color-border-medium)] rounded-md text-[var(--color-text-primary)] bg-[var(--color-bg-card)] mb-4 focus:ring-1 focus:ring-[#0D9488] focus:border-[#0D9488] focus:outline-none"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary px-6 py-2 rounded-md disabled:opacity-50"
        >
          {isSubmitting ? 'Posting...' : 'Post Comment'}
        </button>
      </form>

      {/* Comments List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--color-button-primary)]"></div>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-[var(--color-text-muted)]">
          No comments yet. Be the first to comment!
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment.id} className="flex space-x-4">
              {comment.author?.avatar_url ? (
                <Image
                  src={comment.author.avatar_url}
                  alt={comment.author.display_name}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                  <User className="w-5 h-5 text-[#0D9488]" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {comment.author?.display_name || comment.author_name}
                  </span>
                  <span className="text-sm text-[var(--color-text-muted)]">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-1 text-[var(--color-text-secondary)] whitespace-pre-wrap">
                  {comment.content}
                </p>

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-4 ml-6 space-y-4 border-l-2 border-[var(--color-border-light)] pl-4">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex space-x-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                          <User className="w-4 h-4 text-[#0D9488]" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-[var(--color-text-primary)] text-sm">
                              {reply.author?.display_name || reply.author_name}
                            </span>
                            <span className="text-xs text-[var(--color-text-muted)]">
                              {new Date(reply.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">
                            {reply.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
