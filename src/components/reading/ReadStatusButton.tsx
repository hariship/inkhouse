'use client'

import { useState } from 'react'
import { Glasses, Check } from 'lucide-react'

interface ReadStatusButtonProps {
  postId: number
  initialIsRead?: boolean
  size?: 'sm' | 'md'
  showLabel?: boolean
  onStatusChange?: (isRead: boolean) => void
}

export default function ReadStatusButton({
  postId,
  initialIsRead = false,
  size = 'md',
  showLabel = false,
  onStatusChange,
}: ReadStatusButtonProps) {
  const [isRead, setIsRead] = useState(initialIsRead)
  const [isLoading, setIsLoading] = useState(false)

  const iconSize = size === 'sm' ? 16 : 20

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isLoading) return

    setIsLoading(true)

    try {
      if (isRead) {
        // Mark as unread
        const response = await fetch(`/api/reading/status?postId=${postId}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          setIsRead(false)
          onStatusChange?.(false)
        }
      } else {
        // Mark as read
        const response = await fetch('/api/reading/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ post_id: postId }),
        })
        if (response.ok) {
          setIsRead(true)
          onStatusChange?.(true)
        }
      }
    } catch (error) {
      console.error('Failed to update read status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative group">
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`
          flex items-center gap-1.5 rounded-md transition-colors
          ${size === 'sm' ? 'p-1' : 'p-1.5'}
          ${isRead
            ? 'text-[var(--color-success)] hover:bg-[var(--color-success-light)]'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        aria-label={isRead ? 'Mark as unread' : 'Mark as read'}
      >
        {isRead ? (
          <Check size={iconSize} className="flex-shrink-0" />
        ) : (
          <Glasses size={iconSize} className="flex-shrink-0" />
        )}
        {showLabel && (
          <span className="text-xs font-medium">
            {isRead ? 'Read' : 'Unread'}
          </span>
        )}
      </button>
      <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2 py-0.5 text-xs bg-[var(--color-bg-card)] border border-[var(--color-border-light)] text-[var(--color-text-primary)] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md z-50 pointer-events-none">
        {isRead ? 'Mark unread' : 'Mark read'}
      </span>
    </div>
  )
}
