'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Navbar } from '@/components/layout/Navbar'
import { useAuth } from '@/contexts/AuthContext'
import { ReadingList } from '@/types'
import { ArrowLeft, Minus, Plus, Search, X, Box } from 'lucide-react'

interface ListItem {
  id: string
  post_id: number
  added_at: string
  post: {
    id: number
    title: string
    normalized_title: string
    description?: string
    image_url?: string
    category?: string
    pub_date: string
    author: {
      id: string
      username: string
      display_name: string
      avatar_url?: string
    }
  }
}

interface SearchPost {
  id: number
  title: string
  normalized_title: string
  description?: string
  image_url?: string
  category?: string
  pub_date: string
  author: {
    username: string
    display_name: string
    avatar_url?: string
  }
}

export default function ListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [list, setList] = useState<ReadingList | null>(null)
  const [items, setItems] = useState<ListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchPost[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/boxes')
    }
  }, [authLoading, isAuthenticated, router])

  // Fetch list details
  useEffect(() => {
    if (!isAuthenticated) return

    const fetchList = async () => {
      try {
        const response = await fetch(`/api/reading-lists/${resolvedParams.id}`)
        if (response.ok) {
          const data = await response.json()
          setList(data.data)
          setItems(data.data.items || [])
        } else if (response.status === 404) {
          router.push('/boxes')
        }
      } catch (error) {
        console.error('Failed to fetch list:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchList()
  }, [isAuthenticated, resolvedParams.id, router])

  // Search posts
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const searchPosts = async () => {
      setIsSearching(true)
      try {
        const response = await fetch(`/api/posts?search=${encodeURIComponent(searchQuery)}&limit=5`)
        if (response.ok) {
          const data = await response.json()
          // Filter out posts already in the list
          const existingIds = new Set(items.map(item => item.post_id))
          setSearchResults(data.data.filter((post: SearchPost) => !existingIds.has(post.id)))
        }
      } catch (error) {
        console.error('Failed to search posts:', error)
      } finally {
        setIsSearching(false)
      }
    }

    const debounce = setTimeout(searchPosts, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery, items])

  const handleAddPost = async (post: SearchPost) => {
    try {
      const response = await fetch(`/api/reading-lists/${resolvedParams.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: post.id }),
      })

      if (response.ok) {
        // Add to items list
        const newItem: ListItem = {
          id: crypto.randomUUID(),
          post_id: post.id,
          added_at: new Date().toISOString(),
          post: {
            id: post.id,
            title: post.title,
            normalized_title: post.normalized_title,
            description: post.description,
            image_url: post.image_url,
            category: post.category,
            pub_date: post.pub_date,
            author: {
              id: '',
              username: post.author.username,
              display_name: post.author.display_name,
              avatar_url: post.author.avatar_url,
            },
          },
        }
        setItems((prev) => [newItem, ...prev])
        // Remove from search results
        setSearchResults((prev) => prev.filter((p) => p.id !== post.id))
      }
    } catch (error) {
      console.error('Failed to add post:', error)
    }
  }

  const handleRemoveItem = async (postId: number) => {
    try {
      const response = await fetch(
        `/api/reading-lists/${resolvedParams.id}/items?postId=${postId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        setItems((prev) => prev.filter((item) => item.post_id !== postId))
      }
    } catch (error) {
      console.error('Failed to remove item:', error)
    }
  }

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-tertiary)]">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-button-primary)]"></div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-tertiary)]">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/boxes"
          className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-6"
        >
          <ArrowLeft size={18} />
          Back to boxes
        </Link>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-button-primary)]"></div>
          </div>
        ) : list ? (
          <>
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                {list.name}
              </h1>
              {list.description && (
                <p className="mt-1 text-[var(--color-text-secondary)]">
                  {list.description}
                </p>
              )}
            </div>

            {/* Search bar */}
            <div className="relative mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search posts to add..."
                  className="w-full pl-10 pr-10 py-2.5 bg-[var(--color-bg-card)] border border-[var(--color-border-medium)] rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-link)] focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Search results dropdown */}
              {searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border-medium)] rounded-lg shadow-lg z-10 max-h-80 overflow-y-auto">
                  {isSearching ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--color-button-primary)]"></div>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="py-1">
                      {searchResults.map((post) => (
                        <div
                          key={post.id}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--color-bg-secondary)]"
                        >
                          {post.image_url && (
                            <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                              <Image
                                src={post.image_url}
                                alt={post.title}
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--color-text-primary)] line-clamp-1">
                              {post.title}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)]">
                              {post.author.display_name}
                            </p>
                          </div>
                          <button
                            onClick={() => handleAddPost(post)}
                            className="p-1.5 text-[var(--color-link)] hover:bg-[var(--color-link-light)] rounded-md flex-shrink-0"
                            title="Add to list"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-sm text-[var(--color-text-muted)]">
                      No posts found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Posts count */}
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              {items.length} {items.length === 1 ? 'post' : 'posts'} in this box
            </p>

            {/* List items */}
            {items.length === 0 ? (
              <div className="text-center py-12 bg-[var(--color-bg-card)] rounded-lg">
                <p className="text-[var(--color-text-secondary)]">
                  Start typing above to search and add posts
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 bg-[var(--color-bg-card)] rounded-lg p-3 hover:shadow-sm transition-shadow"
                  >
                    {item.post.image_url && (
                      <Link
                        href={`/post/${item.post.normalized_title}`}
                        className="w-16 h-16 rounded overflow-hidden flex-shrink-0"
                      >
                        <Image
                          src={item.post.image_url}
                          alt={item.post.title}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      </Link>
                    )}
                    <div className="flex-1 min-w-0">
                      <Link href={`/post/${item.post.normalized_title}`}>
                        <h3 className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-link)] line-clamp-1">
                          {item.post.title}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-2 mt-1 text-xs text-[var(--color-text-muted)]">
                        <span>{item.post.author?.display_name}</span>
                        {item.post.category && (
                          <>
                            <span>·</span>
                            <span className="text-[var(--color-link)]">{item.post.category}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.post_id)}
                      className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-light)] rounded-md flex-shrink-0"
                      title="Remove from list"
                    >
                      <Minus size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-[var(--color-text-muted)]">List not found</p>
          </div>
        )}
      </main>
    </div>
  )
}
