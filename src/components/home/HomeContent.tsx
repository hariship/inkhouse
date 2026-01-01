'use client'

import { useState, useEffect } from 'react'
import { PostWithAuthor } from '@/types'
import { PostGrid } from '@/components/posts/PostGrid'
import { useAuth } from '@/contexts/AuthContext'
import { useReading } from '@/contexts/ReadingContext'

interface HomeContentProps {
  initialPosts: PostWithAuthor[]
  initialTotalPages: number
  categories: string[]
}

export default function HomeContent({
  initialPosts,
  initialTotalPages,
  categories,
}: HomeContentProps) {
  const [mounted, setMounted] = useState(false)
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { viewMode, filter, preferencesLoaded } = useReading()

  // Track when component has mounted (client-side hydration complete)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Show "INKING..." until:
  // 1. Component is mounted (prevents flash during hydration)
  // 2. Auth check is complete
  // 3. If authenticated, preferences are loaded
  if (!mounted || authLoading || (isAuthenticated && !preferencesLoaded)) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="text-2xl font-bold text-[var(--color-text-primary)] animate-pulse">
          INKING...
        </div>
      </div>
    )
  }

  return (
    <PostGrid
      initialPosts={initialPosts}
      initialTotalPages={initialTotalPages}
      categories={categories}
      viewMode={viewMode}
      isAuthenticated={isAuthenticated}
      readingFilter={filter}
    />
  )
}
