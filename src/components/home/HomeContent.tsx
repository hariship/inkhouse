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
  const { isAuthenticated, isLoading } = useAuth()
  const { viewMode, filter } = useReading()

  // Don't show controls while loading auth state
  if (isLoading) {
    return (
      <PostGrid
        initialPosts={initialPosts}
        initialTotalPages={initialTotalPages}
        categories={categories}
        viewMode="grid"
        isAuthenticated={false}
        readingFilter="all"
      />
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
