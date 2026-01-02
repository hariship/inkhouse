'use client'

import { useState, useEffect } from 'react'
import { WriterAnalytics } from '@/types'
import { BarChart3, Eye, BookOpen, Box, MessageSquare, MessageSquareLock } from 'lucide-react'
import { StatsCard } from '@/components/analytics/StatsCard'
import { PostStatsTable } from '@/components/analytics/PostStatsTable'

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<WriterAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/analytics/writer')
        const data = await response.json()

        if (data.success) {
          setAnalytics(data.data)
        } else {
          setError(data.error || 'Failed to load analytics')
        }
      } catch {
        setError('Failed to load analytics')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-7 w-32 bg-[var(--color-bg-tertiary)] rounded" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[var(--color-bg-card)] rounded-lg p-4 shadow-[var(--shadow-light)]">
              <div className="h-8 w-16 bg-[var(--color-bg-tertiary)] rounded mb-2" />
              <div className="h-4 w-24 bg-[var(--color-bg-tertiary)] rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--color-error)]">{error}</p>
      </div>
    )
  }

  if (!analytics) {
    return null
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-6 h-6 text-[var(--color-text-muted)]" />
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Analytics</h1>
      </div>

      <p className="text-[var(--color-text-muted)] mb-6">
        See how readers are engaging with your writing.
      </p>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          label="Total Views"
          value={analytics.total_views}
          icon={<Eye className="w-5 h-5" />}
          tooltip="Tracked from Jan 2026"
        />
        <StatsCard
          label="Total Reads"
          value={analytics.total_reads}
          icon={<BookOpen className="w-5 h-5" />}
          tooltip="Marked as read"
        />
        <StatsCard
          label="Box Additions"
          value={analytics.total_box_additions}
          icon={<Box className="w-5 h-5" />}
          tooltip="Added to reading list"
        />
        <StatsCard
          label="Comments"
          value={analytics.total_comments}
          icon={<MessageSquare className="w-5 h-5" />}
          tooltip="Reader comments"
        />
        <StatsCard
          label="Critiques"
          value={analytics.total_critiques}
          icon={<MessageSquareLock className="w-5 h-5" />}
          tooltip="Writer peer reviews"
        />
        <StatsCard
          label="Published Posts"
          value={analytics.total_posts}
        />
      </div>

      {/* Legend */}
      <div className="hidden sm:flex flex-wrap gap-4 mb-4 text-sm text-[var(--color-text-muted)]">
        <span className="flex items-center gap-1">
          <Eye className="w-4 h-4" /> Views - Post opened (from Jan 2026)
        </span>
        <span className="flex items-center gap-1">
          <BookOpen className="w-4 h-4" /> Reads - Marked as read
        </span>
        <span className="flex items-center gap-1">
          <Box className="w-4 h-4" /> Box - Added to reading list
        </span>
      </div>

      {/* Posts Table */}
      <div className="bg-[var(--color-bg-card)] rounded-lg shadow-[var(--shadow-light)] p-4">
        <h2 className="text-lg font-medium text-[var(--color-text-primary)] mb-4">
          Post Performance
        </h2>
        <PostStatsTable posts={analytics.posts} />
      </div>
    </div>
  )
}
