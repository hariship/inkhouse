'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { CheckCircle, Circle } from 'lucide-react'

interface MarkAsReadPromptProps {
  postId: number
}

export function MarkAsReadPrompt({ postId }: MarkAsReadPromptProps) {
  const { isAuthenticated } = useAuth()
  const [isRead, setIsRead] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false)
      return
    }

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/reading/status?postIds=${postId}`)
        if (res.ok) {
          const data = await res.json()
          setIsRead(!!data.data?.[postId])
        }
      } catch (error) {
        console.error('Failed to check read status:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkStatus()
  }, [postId, isAuthenticated])

  const handleToggle = async () => {
    if (isUpdating) return
    setIsUpdating(true)

    try {
      if (isRead) {
        // Mark as unread
        const res = await fetch(`/api/reading/status?postId=${postId}`, {
          method: 'DELETE',
        })
        if (res.ok) setIsRead(false)
      } else {
        // Mark as read
        const res = await fetch('/api/reading/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ post_id: postId }),
        })
        if (res.ok) setIsRead(true)
      }
    } catch (error) {
      console.error('Failed to update read status:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  if (!isAuthenticated || isLoading) {
    return null
  }

  return (
    <div className="flex justify-center my-8">
      <button
        onClick={handleToggle}
        disabled={isUpdating}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
          isRead
            ? 'bg-[var(--color-success-light)] text-[var(--color-success)] border border-[var(--color-success)]'
            : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] border border-[var(--color-border-light)]'
        } ${isUpdating ? 'opacity-50' : ''}`}
      >
        {isRead ? (
          <>
            <CheckCircle className="w-4 h-4" />
            Marked as Read
          </>
        ) : (
          <>
            <Circle className="w-4 h-4" />
            Mark as Read
          </>
        )}
      </button>
    </div>
  )
}
