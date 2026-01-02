'use client'

import { useState, useEffect } from 'react'
import { AdminAnalytics } from '@/types'
import { BarChart3, Users, FileText, Eye, PenLine, BookOpen, User } from 'lucide-react'
import { StatsCard } from '@/components/analytics/StatsCard'
import Image from 'next/image'

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/admin/analytics')
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
          <div className="h-7 w-48 bg-[var(--color-bg-tertiary)] rounded" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {[1, 2, 3, 4, 5].map((i) => (
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
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Platform Analytics</h1>
      </div>

      <p className="text-[var(--color-text-muted)] mb-6">
        Overview of Inkhouse platform activity.
      </p>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatsCard
          label="Total Users"
          value={analytics.total_users}
          icon={<Users className="w-5 h-5" />}
          tooltip="All registered users"
        />
        <StatsCard
          label="Writers"
          value={analytics.total_writers}
          icon={<PenLine className="w-5 h-5" />}
          tooltip="Approved writers"
        />
        <StatsCard
          label="Readers"
          value={analytics.total_readers}
          icon={<BookOpen className="w-5 h-5" />}
          tooltip="Reader accounts"
        />
        <StatsCard
          label="Published Posts"
          value={analytics.total_posts}
          icon={<FileText className="w-5 h-5" />}
          tooltip="Live posts"
        />
        <StatsCard
          label="Total Views"
          value={analytics.total_views}
          icon={<Eye className="w-5 h-5" />}
          tooltip="All post views"
        />
      </div>

      {/* Top Authors */}
      <div className="bg-[var(--color-bg-card)] rounded-lg shadow-[var(--shadow-light)] p-4">
        <h2 className="text-lg font-medium text-[var(--color-text-primary)] mb-4">
          Top Authors
        </h2>

        {analytics.top_authors.length === 0 ? (
          <p className="text-[var(--color-text-muted)] text-center py-8">
            No authors with published posts yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border-light)]">
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-text-muted)]">
                    Author
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-[var(--color-text-muted)]">
                    Posts
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-[var(--color-text-muted)]">
                    Views
                  </th>
                </tr>
              </thead>
              <tbody>
                {analytics.top_authors.map((item, index) => (
                  <tr
                    key={index}
                    className="border-b border-[var(--color-border-light)] hover:bg-[var(--color-bg-hover)]"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {item.author?.avatar_url ? (
                          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                            <Image
                              src={item.author.avatar_url}
                              alt={item.author.display_name}
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-[var(--color-link)]" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-[var(--color-text-primary)]">
                            {item.author?.display_name || 'Unknown'}
                          </p>
                          <p className="text-sm text-[var(--color-text-muted)]">
                            @{item.author?.username}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="text-center py-3 px-4 text-[var(--color-text-secondary)]">
                      {item.post_count}
                    </td>
                    <td className="text-center py-3 px-4 text-[var(--color-text-secondary)]">
                      {item.total_views}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
