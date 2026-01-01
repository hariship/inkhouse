'use client'

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
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { viewMode, filter, preferencesLoaded } = useReading()

  // Show "INKING..." while auth or preferences are loading
  if (authLoading || (isAuthenticated && !preferencesLoaded)) {
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
