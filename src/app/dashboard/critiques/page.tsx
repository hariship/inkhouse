'use client'

import { useState, useEffect, useCallback } from 'react'
import { Post, CritiqueWithAuthor } from '@/types'
import { MessageSquareLock, ChevronDown, ChevronRight, FileText } from 'lucide-react'
import { PostCritiquesView } from '@/components/critiques/PostCritiquesView'
import Link from 'next/link'

interface PostWithCritiques extends Post {
  critiques: CritiqueWithAuthor[]
  critique_count: number
}

export default function CritiquesPage() {
  const [posts, setPosts] = useState<PostWithCritiques[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedPost, setExpandedPost] = useState<number | null>(null)

  const fetchPostsWithCritiques = useCallback(async () => {
    try {
      // First get all posts
      const postsResponse = await fetch('/api/posts/my')
      const postsData = await postsResponse.json()

      if (!postsData.success) return

      // For each post, fetch critiques
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

      // Only show posts with critiques, sorted by most recent critique
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
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPostsWithCritiques()
  }, [fetchPostsWithCritiques])

  const handleRefresh = () => {
    fetchPostsWithCritiques()
  }

  const totalCritiques = posts.reduce((sum, p) => sum + p.critique_count, 0)

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-7 w-40 bg-[var(--color-bg-tertiary)] rounded" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[var(--color-bg-card)] rounded-lg p-4 shadow-[var(--shadow-light)]">
              <div className="h-5 w-64 bg-[var(--color-bg-tertiary)] rounded mb-2" />
              <div className="h-4 w-32 bg-[var(--color-bg-tertiary)] rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <MessageSquareLock className="w-6 h-6 text-[var(--color-text-muted)]" />
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Critiques</h1>
        {totalCritiques > 0 && (
          <span className="px-2 py-0.5 text-sm bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] rounded-full">
            {totalCritiques}
          </span>
        )}
      </div>

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
    </div>
  )
}
