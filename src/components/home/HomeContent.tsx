'use client'

import { useState, useEffect, useRef } from 'react'
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

  // Track read statuses for initial posts
  const [initialReadStatuses, setInitialReadStatuses] = useState<Record<number, string | null>>({})
  const [statusesLoaded, setStatusesLoaded] = useState(false)

  // Track if we've already fetched to prevent duplicate fetches
  const hasFetched = useRef(false)

  // Track when component has mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch read statuses for initial posts after auth and preferences are ready
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return
    }

    // Non-authenticated users don't need read statuses
    if (!isAuthenticated) {
      setStatusesLoaded(true)
      return
    }

    // Wait for preferences to load
    if (!preferencesLoaded) {
      return
    }

    // Already fetched
    if (hasFetched.current) {
      return
    }

    // No posts to fetch statuses for
    if (initialPosts.length === 0) {
      setStatusesLoaded(true)
      return
    }

    hasFetched.current = true

    const fetchStatuses = async () => {
      try {
        const postIds = initialPosts.map((p) => p.id).join(',')
        const response = await fetch(`/api/reading/status?postIds=${postIds}`)
        if (response.ok) {
          const data = await response.json()
          setInitialReadStatuses(data.data || {})
        }
      } catch (error) {
        console.error('Failed to fetch read statuses:', error)
      } finally {
        setStatusesLoaded(true)
      }
    }

    fetchStatuses()
  }, [authLoading, isAuthenticated, preferencesLoaded, initialPosts])

  // UNIFIED LOADING CHECK
  // Wait until:
  // 1. Component is mounted (prevents flash during hydration)
  // 2. Auth check is complete
  // 3. If authenticated: preferences AND read statuses are loaded
  const isFullyLoaded =
    mounted && !authLoading && (!isAuthenticated || (preferencesLoaded && statusesLoaded))

  // Show full-page loading until ALL data is ready
  // This prevents any partial UI from showing
  if (!isFullyLoaded) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-button-primary)]"></div>
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
      initialReadStatuses={initialReadStatuses}
    />
  )
}
