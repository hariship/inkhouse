'use client'

import { useState, useEffect, useCallback } from 'react'
import { WriterAnalytics, Post, CritiqueWithAuthor } from '@/types'
import { BarChart3, Eye, BookOpen, Box, MessageSquare, MessageSquareLock, Lightbulb, ChevronDown, ChevronRight, FileText } from 'lucide-react'
import { StatsCard } from '@/components/analytics/StatsCard'
import { PostStatsTable } from '@/components/analytics/PostStatsTable'
import { PostCritiquesView } from '@/components/critiques/PostCritiquesView'
import Link from 'next/link'

type Tab = 'analytics' | 'critiques'

interface PostWithCritiques extends Post {
  critiques: CritiqueWithAuthor[]
  critique_count: number
}

export default function InsightsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('analytics')

  // Analytics state
  const [analytics, setAnalytics] = useState<WriterAnalytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)

  // Critiques state
  const [posts, setPosts] = useState<PostWithCritiques[]>([])
  const [critiquesLoading, setCritiquesLoading] = useState(true)
  const [expandedPost, setExpandedPost] = useState<number | null>(null)

  // Fetch analytics
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/analytics/writer')
        const data = await response.json()

        if (data.success) {
          setAnalytics(data.data)
        } else {
          setAnalyticsError(data.error || 'Failed to load analytics')
        }
      } catch {
        setAnalyticsError('Failed to load analytics')
      } finally {
        setAnalyticsLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  // Fetch critiques
  const fetchPostsWithCritiques = useCallback(async () => {
    try {
      const postsResponse = await fetch('/api/posts/my')
      const postsData = await postsResponse.json()

      if (!postsData.success) return

      const postsWithCritiques: PostWithCritiques[] = await Promise.all(
        postsData.data.map(async (post: Post) => {
          try {
            const critiquesResponse = await fetch(`/api/critiques?postId=${post.id}`)
            const critiquesData = await critiquesResponse.json()
            return {
              ...post,
              critiques: critiquesData.success ? critiquesData.data : [],
              critique_count: critiquesData.success ? critiquesData.data.length : 0,
            }
          } catch {
            return { ...post, critiques: [], critique_count: 0 }
          }
        })
      )

      const filtered = postsWithCritiques
        .filter((p) => p.critique_count > 0)
        .sort((a, b) => {
          const aLatest = a.critiques[a.critiques.length - 1]?.created_at || ''
          const bLatest = b.critiques[b.critiques.length - 1]?.created_at || ''
          return bLatest.localeCompare(aLatest)
        })

      setPosts(filtered)
    } catch (error) {
      console.error('Failed to fetch critiques:', error)
    } finally {
      setCritiquesLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPostsWithCritiques()
  }, [fetchPostsWithCritiques])

  const handleRefresh = () => {
    fetchPostsWithCritiques()
  }

  const totalCritiques = posts.reduce((sum, p) => sum + p.critique_count, 0)

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Lightbulb className="w-6 h-6 text-[var(--color-text-muted)]" />
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Insights</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[var(--color-border-light)]">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'analytics'
              ? 'border-[var(--color-link)] text-[var(--color-link)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <BarChart3 className="w-4 h-4 inline mr-2" />
          Analytics
        </button>
        <button
          onClick={() => setActiveTab('critiques')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'critiques'
              ? 'border-[var(--color-link)] text-[var(--color-link)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <MessageSquareLock className="w-4 h-4 inline mr-2" />
          Critiques
          {totalCritiques > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-[var(--color-bg-tertiary)] rounded-full">
              {totalCritiques}
            </span>
          )}
        </button>
      </div>

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <>
          {analyticsLoading ? (
            <div className="animate-pulse">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-[var(--color-bg-card)] rounded-lg p-4 shadow-[var(--shadow-light)]">
                    <div className="h-8 w-16 bg-[var(--color-bg-tertiary)] rounded mb-2" />
                    <div className="h-4 w-24 bg-[var(--color-bg-tertiary)] rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : analyticsError ? (
            <div className="text-center py-12">
              <p className="text-[var(--color-error)]">{analyticsError}</p>
            </div>
          ) : analytics ? (
            <>
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
            </>
          ) : null}
        </>
      )}

      {/* Critiques Tab */}
      {activeTab === 'critiques' && (
        <>
          {critiquesLoading ? (
            <div className="animate-pulse">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-[var(--color-bg-card)] rounded-lg p-4 shadow-[var(--shadow-light)]">
                    <div className="h-5 w-64 bg-[var(--color-bg-tertiary)] rounded mb-2" />
                    <div className="h-4 w-32 bg-[var(--color-bg-tertiary)] rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <p className="text-[var(--color-text-muted)] mb-6">
                Private feedback from fellow writers on your posts. Only you can see these.
              </p>

              {posts.length === 0 ? (
                <div className="text-center py-12 bg-[var(--color-bg-card)] rounded-lg shadow-[var(--shadow-light)]">
                  <FileText className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
                    No critiques yet
                  </h3>
                  <p className="text-[var(--color-text-muted)]">
                    When other writers leave feedback on your posts, you&apos;ll see it here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="bg-[var(--color-bg-card)] rounded-lg shadow-[var(--shadow-light)] overflow-hidden"
                    >
                      <button
                        onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-[var(--color-bg-hover)] transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-[var(--color-text-primary)] truncate">
                              {post.title}
                            </h3>
                            <span className="px-2 py-0.5 text-xs bg-[var(--color-link-light)] text-[var(--color-link)] rounded-full flex-shrink-0">
                              {post.critique_count} {post.critique_count === 1 ? 'critique' : 'critiques'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-[var(--color-text-muted)]">
                            <Link
                              href={`/post/${post.normalized_title}`}
                              className="hover:text-[var(--color-link)]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View post
                            </Link>
                          </div>
                        </div>
                        {expandedPost === post.id ? (
                          <ChevronDown className="w-5 h-5 text-[var(--color-text-muted)] flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-[var(--color-text-muted)] flex-shrink-0" />
                        )}
                      </button>

                      {expandedPost === post.id && (
                        <div className="p-4 pt-0 border-t border-[var(--color-border-light)]">
                          <PostCritiquesView
                            postId={post.id}
                            postTitle={post.title}
                            critiques={post.critiques}
                            onRefresh={handleRefresh}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
