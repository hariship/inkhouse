'use client'

import { useState, useEffect } from 'react'
import { PostWithAuthor, ViewMode, ReadingFilter } from '@/types'
import { PostGrid } from '@/components/posts/PostGrid'

interface HomeContentProps {
  initialPosts: PostWithAuthor[]
  initialTotalPages: number
  categories: string[]
}

interface HomeData {
  posts: PostWithAuthor[]
  preferences: {
    view_mode: ViewMode
    default_filter: ReadingFilter
  } | null
  readStatuses: Record<number, string>
  isAuthenticated: boolean
}

export default function HomeContent({
  initialPosts,
  initialTotalPages,
  categories,
}: HomeContentProps) {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<HomeData | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Single API call to get everything
  useEffect(() => {
    if (!mounted) return

    const fetchHomeData = async () => {
      try {
        const response = await fetch('/api/posts/home?limit=10')
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            setData(result.data)
          }
        }
      } catch (error) {
        console.error('Failed to fetch home data:', error)
        // Fallback to initial data for non-authenticated users
        setData({
          posts: initialPosts,
          preferences: null,
          readStatuses: {},
          isAuthenticated: false,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchHomeData()
  }, [mounted, initialPosts])

  // Show spinner until everything is ready
  if (!mounted || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-button-primary)]"></div>
      </div>
    )
  }

  // Use fetched data or fallback to initial
  const posts = data?.posts || initialPosts
  const viewMode = data?.preferences?.view_mode || 'grid'
  const filter = data?.preferences?.default_filter || 'all'
  const readStatuses = data?.readStatuses || {}
  const isAuthenticated = data?.isAuthenticated || false

  return (
    <PostGrid
      initialPosts={posts}
      initialTotalPages={initialTotalPages}
      categories={categories}
      viewMode={viewMode}
      isAuthenticated={isAuthenticated}
      readingFilter={filter}
      initialReadStatuses={readStatuses}
    />
  )
}
