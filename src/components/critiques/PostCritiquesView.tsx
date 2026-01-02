'use client'

import { useState } from 'react'
import { CritiqueWithAuthor } from '@/types'
import { User, Reply, Trash2 } from 'lucide-react'
import Image from 'next/image'

interface PostCritiquesViewProps {
  postId: number
  postTitle: string
  critiques: CritiqueWithAuthor[]
  onRefresh: () => void
}

export function PostCritiquesView({
  postId,
  postTitle,
  critiques,
  onRefresh,
}: PostCritiquesViewProps) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim() || replyContent.trim().length < 10) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/critiques', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: postId,
          content: replyContent.trim(),
          parent_id: parentId,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setReplyContent('')
        setReplyingTo(null)
        onRefresh()
      }
    } catch (error) {
      console.error('Failed to post reply:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (critiqueId: string) => {
    if (!confirm('Delete this critique?')) return

    try {
      const response = await fetch(`/api/critiques/${critiqueId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onRefresh()
      }
    } catch (error) {
      console.error('Failed to delete critique:', error)
    }
  }

  if (critiques.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--color-text-muted)]">
        No critiques yet for this post.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
        Critiques on &ldquo;{postTitle}&rdquo;
      </h3>

      {critiques.map((critique) => (
        <div key={critique.id} className="border border-[var(--color-border-light)] rounded-lg p-4">
          <div className="flex space-x-4">
            {critique.author?.avatar_url ? (
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                <Image
                  src={critique.author.avatar_url}
                  alt={critique.author.display_name}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-[var(--color-link)]" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {critique.author?.display_name || 'Unknown'}
                  </span>
                  <span className="text-sm text-[var(--color-text-muted)]">
                    {new Date(critique.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <button
                  onClick={() => setReplyingTo(replyingTo === critique.id ? null : critique.id)}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-link)] flex items-center gap-1 text-sm"
                >
                  <Reply className="w-4 h-4" />
                  Reply
                </button>
              </div>
              <p className="mt-2 text-[var(--color-text-secondary)] whitespace-pre-wrap">
                {critique.content}
              </p>

              {/* Reply form */}
              {replyingTo === critique.id && (
                <div className="mt-4 pl-4 border-l-2 border-[var(--color-border-light)]">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Write your reply..."
                    rows={3}
                    className="w-full px-3 py-2 border border-[var(--color-border-medium)] rounded-md text-[var(--color-text-primary)] bg-[var(--color-bg-card)] text-sm focus:ring-1 focus:ring-[var(--color-link)] focus:border-[var(--color-link)] focus:outline-none resize-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleReply(critique.id)}
                      disabled={isSubmitting || !replyContent.trim()}
                      className="btn-primary px-4 py-1.5 rounded-md text-sm disabled:opacity-50"
                    >
                      {isSubmitting ? 'Sending...' : 'Send Reply'}
                    </button>
                    <button
                      onClick={() => {
                        setReplyingTo(null)
                        setReplyContent('')
                      }}
                      className="px-4 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Replies */}
              {critique.replies && critique.replies.length > 0 && (
                <div className="mt-4 ml-6 space-y-4 border-l-2 border-[var(--color-border-light)] pl-4">
                  {critique.replies.map((reply) => (
                    <div key={reply.id} className="flex space-x-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-[var(--color-link)]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-[var(--color-text-primary)] text-sm">
                              {reply.author?.display_name || 'Unknown'}
                            </span>
                            <span className="text-xs text-[var(--color-text-muted)]">
                              {new Date(reply.created_at).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDelete(reply.id)}
                            className="text-[var(--color-text-muted)] hover:text-red-500"
                            title="Delete reply"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
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
        </div>
      ))}
    </div>
  )
}
