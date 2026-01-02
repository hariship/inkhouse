'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { MessageSquareLock } from 'lucide-react'

interface CritiqueSectionProps {
  postId: number
  postAuthorId: string
}

export function CritiqueSection({ postId, postAuthorId }: CritiqueSectionProps) {
  const { user, isAuthenticated } = useAuth()
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Only show for authenticated writers who are not the post author
  if (!isAuthenticated || !user) return null
  if (!['writer', 'admin', 'super_admin'].includes(user.role)) return null
  if (user.id === postAuthorId) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || content.trim().length < 10) {
      setMessage({ type: 'error', text: 'Critique must be at least 10 characters' })
      return
    }

    setIsSubmitting(true)
    setMessage(null)

    try {
      const response = await fetch('/api/critiques', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: postId,
          content: content.trim(),
        }),
      })

      const data = await response.json()
      if (data.success) {
        setContent('')
        setMessage({ type: 'success', text: 'Critique sent! Only the author will see this.' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send critique' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to send critique' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mt-8 p-6 bg-[var(--color-bg-tertiary)] rounded-lg border border-[var(--color-border-light)]">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquareLock className="w-5 h-5 text-[var(--color-text-muted)]" />
        <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
          Leave a Critique
        </h3>
      </div>

      <p className="text-sm text-[var(--color-text-muted)] mb-4">
        As a fellow writer, you can leave private feedback for the author.
        Only they will see your critique.
      </p>

      {message && (
        <div
          className={`p-3 rounded-md mb-4 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your thoughts on this piece..."
          rows={4}
          className="w-full px-4 py-3 border border-[var(--color-border-medium)] rounded-md text-[var(--color-text-primary)] bg-[var(--color-bg-card)] mb-4 focus:ring-1 focus:ring-[var(--color-link)] focus:border-[var(--color-link)] focus:outline-none resize-none"
        />
        <button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className="btn-primary px-6 py-2 rounded-md disabled:opacity-50"
        >
          {isSubmitting ? 'Sending...' : 'Send Critique'}
        </button>
      </form>
    </div>
  )
}
