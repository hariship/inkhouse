'use client'

import { useState } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'

interface BookmarkButtonProps {
  postId: number
  initialIsBookmarked?: boolean
  size?: 'sm' | 'md'
  showLabel?: boolean
  onBookmarkChange?: (isBookmarked: boolean) => void
}

export default function BookmarkButton({
  postId,
  initialIsBookmarked = false,
  size = 'md',
  showLabel = false,
  onBookmarkChange,
}: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked)
  const [isLoading, setIsLoading] = useState(false)

  const iconSize = size === 'sm' ? 16 : 20

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isLoading) return

    setIsLoading(true)

    try {
      if (isBookmarked) {
        // Remove bookmark
        const response = await fetch(`/api/bookmarks?postId=${postId}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          setIsBookmarked(false)
          onBookmarkChange?.(false)
        }
      } else {
        // Add bookmark
        const response = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ post_id: postId }),
        })
        if (response.ok) {
          setIsBookmarked(true)
          onBookmarkChange?.(true)
        }
      }
    } catch (error) {
      console.error('Failed to update bookmark:', error)
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
          ${isBookmarked
            ? 'text-[var(--color-link)] hover:bg-[var(--color-link-light)]'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        aria-label={isBookmarked ? 'Remove bookmark' : 'Save for later'}
      >
        {isBookmarked ? (
          <BookmarkCheck size={iconSize} className="flex-shrink-0 fill-current" />
        ) : (
          <Bookmark size={iconSize} className="flex-shrink-0" />
        )}
        {showLabel && (
          <span className="text-xs font-medium">
            {isBookmarked ? 'Saved' : 'Save'}
          </span>
        )}
      </button>
      <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2 py-0.5 text-xs bg-[var(--color-bg-card)] border border-[var(--color-border-light)] text-[var(--color-text-primary)] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md z-50 pointer-events-none">
        {isBookmarked ? 'Unsave' : 'Save'}
      </span>
    </div>
  )
}
