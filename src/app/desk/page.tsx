'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Navbar } from '@/components/layout/Navbar'
import { formatDistanceToNow } from 'date-fns'
import { NotebookPen, Calendar, Menu, X } from 'lucide-react'
import parse from 'html-react-parser'
import { CommentsSection } from '@/components/comments/CommentsSection'

interface DeskPost {
  id: number
  title: string
  normalized_title: string
  description?: string
  content: string
  image_url?: string
  category?: string
  pub_date: string
  allow_comments: boolean
  author: {
    id: string
    username: string
    display_name: string
    avatar_url?: string
  }
}

function getReadingTime(content: string): number {
  const wordsPerMinute = 200
  const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length
  return Math.ceil(words / wordsPerMinute)
}

export default function DeskPage() {
  const [posts, setPosts] = useState<DeskPost[]>([])
  const [selectedPost, setSelectedPost] = useState<DeskPost | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showSidebar, setShowSidebar] = useState(false)

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch('/api/posts?type=desk&limit=20')
        if (response.ok) {
          const data = await response.json()
          setPosts(data.data || [])
          // Auto-select latest post
          if (data.data?.length > 0) {
            setSelectedPost(data.data[0])
          }
        }
      } catch (error) {
        console.error('Failed to fetch desk posts:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPosts()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-tertiary)]">
        <Navbar />
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-button-primary)]"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-tertiary)]">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-[var(--color-bg-card)] border border-[var(--color-border-light)] flex items-center justify-center">
            <NotebookPen className="w-5 h-5 text-[var(--color-link)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
              From the Desk
            </h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              Updates and stories from Inkhouse
            </p>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-12 bg-[var(--color-bg-card)] rounded-lg">
            <NotebookPen className="mx-auto h-12 w-12 text-[var(--color-text-muted)] mb-4" />
            <p className="text-[var(--color-text-muted)]">
              No posts yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Sidebar overlay */}
            {showSidebar && (
              <div
                className="fixed inset-0 bg-black/50 z-40"
                onClick={() => setShowSidebar(false)}
              />
            )}

            {/* Sidebar - Post list */}
            <div className={`
              fixed top-0 left-0 h-full z-50
              transform transition-transform duration-200 ease-in-out
              ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
              w-72 sm:w-64
            `}>
              <div className="bg-[var(--color-bg-card)] h-full border-r border-[var(--color-border-light)] overflow-hidden shadow-lg">
                {/* Sidebar header */}
                <div className="flex items-center justify-between p-3 border-b border-[var(--color-border-light)]">
                  <span className="font-medium text-[var(--color-text-primary)]">Posts</span>
                  <button
                    onClick={() => setShowSidebar(false)}
                    className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="divide-y divide-[var(--color-border-light)] max-h-[calc(100vh-60px)] overflow-y-auto">
                  {posts.map((post, index) => {
                    const isSelected = selectedPost?.id === post.id
                    const isLatest = index === 0

                    return (
                      <button
                        key={post.id}
                        onClick={() => {
                          setSelectedPost(post)
                          setShowSidebar(false)
                        }}
                        className={`w-full text-left p-3 transition-colors ${
                          isSelected
                            ? 'bg-[var(--color-bg-secondary)]'
                            : 'hover:bg-[var(--color-bg-hover)]'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          {isLatest && (
                            <span className="inline-block text-xs font-medium text-[var(--color-link)] mb-1">
                              Latest
                            </span>
                          )}
                          <h3 className={`text-sm font-medium line-clamp-2 ${
                            isSelected
                              ? 'text-[var(--color-link)]'
                              : 'text-[var(--color-text-primary)]'
                          }`}>
                            {post.title}
                          </h3>
                          <p className="text-xs text-[var(--color-text-muted)] mt-1">
                            {formatDistanceToNow(new Date(post.pub_date), { addSuffix: true })}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Main content - Selected post */}
            <div className="max-w-3xl mx-auto">
              {selectedPost ? (
                <article className="bg-[var(--color-bg-card)] rounded-lg border border-[var(--color-border-light)] p-4 sm:p-8">
                  {/* Toggle button */}
                  <button
                    onClick={() => setShowSidebar(!showSidebar)}
                    className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-link)] mb-6"
                  >
                    <Menu className="w-4 h-4" />
                    <span>{posts.length} {posts.length === 1 ? 'post' : 'posts'}</span>
                  </button>
                  {/* Header */}
                  <header className="mb-8">
                    {selectedPost.category && (
                      <span className="text-sm font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
                        {selectedPost.category}
                      </span>
                    )}
                    <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mt-2 mb-4">
                      {selectedPost.title}
                    </h1>
                    {selectedPost.description && (
                      <p className="text-lg text-[var(--color-text-secondary)]">
                        {selectedPost.description}
                      </p>
                    )}
                    <div className="flex items-center mt-4 text-sm text-[var(--color-text-muted)]">
                      <Calendar className="w-4 h-4 mr-2" />
                      {new Date(selectedPost.pub_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                      <span className="mx-2">·</span>
                      <span>{getReadingTime(selectedPost.content)} min read</span>
                    </div>
                  </header>

                  {/* Featured Image */}
                  {selectedPost.image_url && (
                    <div className="relative w-full mb-8 rounded-lg overflow-hidden">
                      <Image
                        src={selectedPost.image_url}
                        alt={selectedPost.title}
                        width={800}
                        height={400}
                        className="w-full h-auto object-cover rounded-lg"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="prose dark:prose-invert max-w-none mb-12">
                    {parse(selectedPost.content.replace(/&nbsp;/g, ' '))}
                  </div>

                  {/* From Inkhouse */}
                  <div className="border-t border-[var(--color-border-light)] pt-8">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                        <NotebookPen className="w-6 h-6 text-[var(--color-link)]" />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--color-text-primary)]">
                          Inkhouse
                        </p>
                        <p className="text-sm text-[var(--color-text-muted)]">
                          Updates and stories from the Inkhouse team
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Comments */}
                  <CommentsSection postId={selectedPost.id} allowComments={selectedPost.allow_comments !== false} />
                </article>
              ) : (
                <div className="bg-[var(--color-bg-card)] rounded-lg border border-[var(--color-border-light)] p-8 text-center">
                  <button
                    onClick={() => setShowSidebar(true)}
                    className="flex items-center gap-2 text-[var(--color-link)] hover:text-[var(--color-link-hover)] mx-auto"
                  >
                    <Menu className="w-5 h-5" />
                    <span>Select a post to read</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border-light)] mt-12 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-[var(--color-text-muted)]">
          <p>Inkhouse - A home for writers</p>
        </div>
      </footer>
    </div>
  )
}
