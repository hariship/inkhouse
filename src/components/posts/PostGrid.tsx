'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { PostWithAuthor, ViewMode, ReadingFilter } from '@/types'
import { Calendar, User } from 'lucide-react'
import ReadStatusButton from '@/components/reading/ReadStatusButton'
import AddToListButton from '@/components/reading/AddToListButton'
import { useReading } from '@/contexts/ReadingContext'

interface PostGridProps {
  initialPosts: PostWithAuthor[]
  initialTotalPages: number
  categories: string[]
  viewMode?: ViewMode
  isAuthenticated?: boolean
  readingFilter?: ReadingFilter
}

export function PostGrid({
  initialPosts,
  initialTotalPages,
  categories,
  viewMode = 'grid',
  isAuthenticated = false,
  readingFilter = 'all',
}: PostGridProps) {
  const { setFilter } = useReading()
  const [posts, setPosts] = useState<PostWithAuthor[]>(initialPosts)
  const [isLoading, setIsLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isFiltering, setIsFiltering] = useState(false)

  // Track reading status for authenticated users (stores read_at timestamp or null)
  const [readStatuses, setReadStatuses] = useState<Record<number, string | null>>({})
  const [statusesLoaded, setStatusesLoaded] = useState(false)

  // Fetch reading statuses when posts change and user is authenticated
  useEffect(() => {
    if (!isAuthenticated || posts.length === 0) {
      setStatusesLoaded(true)
      return
    }

    setStatusesLoaded(false)
    const postIds = posts.map((p) => p.id).join(',')

    const fetchStatuses = async () => {
      try {
        const readRes = await fetch(`/api/reading/status?postIds=${postIds}`)

        if (readRes.ok) {
          const readData = await readRes.json()
          // Store the read_at timestamp directly
          setReadStatuses(readData.data || {})
        }
      } catch (error) {
        console.error('Failed to fetch reading statuses:', error)
      } finally {
        setStatusesLoaded(true)
      }
    }

    fetchStatuses()
  }, [posts, isAuthenticated])

  // Show loading when authenticated user's statuses haven't loaded yet
  // This prevents read icons from popping in after posts are visible
  const statusesLoading = isAuthenticated && !statusesLoaded

  // Filter posts based on reading filter
  const filteredPosts = posts.filter((post) => {
    if (!isAuthenticated || readingFilter === 'all') return true

    const isRead = !!readStatuses[post.id]

    switch (readingFilter) {
      case 'unread':
        return !isRead
      case 'read':
        return isRead
      default:
        return true
    }
  })

  // Fetch when filtering, searching, or paginating
  useEffect(() => {
    if (!isFiltering && page === 1) return

    const fetchPosts = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '10',
        })
        if (search) params.append('search', search)
        if (selectedCategory) params.append('category', selectedCategory)

        const response = await fetch(`/api/posts?${params}`)
        const data = await response.json()

        if (data.success) {
          setPosts(data.data)
          setTotalPages(data.pagination.totalPages)
        }
      } catch (error) {
        console.error('Failed to fetch posts:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPosts()
  }, [page, search, selectedCategory, isFiltering])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setIsFiltering(true)
    setPage(1)
  }

  const handleCategoryClick = (e: React.MouseEvent, category: string | null) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedCategory(category)
    setIsFiltering(true)
    setPage(1)
    if (!category) {
      // Reset to initial when "All" is clicked
      setPosts(initialPosts)
      setTotalPages(initialTotalPages)
      setIsFiltering(false)
    }
  }

  const handleClearFilters = () => {
    setSearch('')
    setSelectedCategory(null)
    setIsFiltering(false)
    setPage(1)
    setPosts(initialPosts)
    setTotalPages(initialTotalPages)
  }

  const handleReadStatusChange = (postId: number, isRead: boolean) => {
    setReadStatuses((prev) => ({
      ...prev,
      [postId]: isRead ? new Date().toISOString() : null
    }))
  }

  // Helper to format read date
  const formatReadDate = (dateStr: string | null | undefined) => {
    if (!dateStr || typeof dateStr !== 'string') return ''
    const date = new Date(dateStr)
    // Check for invalid date or dates before year 2000 (likely invalid)
    if (isNaN(date.getTime()) || date.getFullYear() < 2000) return ''
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }


  // Grid card component
  const GridCard = ({ post, index }: { post: PostWithAuthor; index: number }) => {
    const readAt = isAuthenticated ? readStatuses[post.id] : null
    const isRead = !!readAt
    return (
    <Link href={`/post/${post.normalized_title}`} className="block">
    <article className="bg-[var(--color-bg-card)] rounded-lg shadow-[var(--shadow-light)] overflow-hidden hover:shadow-[var(--shadow-medium)] transition-shadow flex flex-col relative group/card cursor-pointer">
      {/* Read indicator tooltip */}
      {isRead && readAt && formatReadDate(readAt) && (
        <div className="absolute top-2 left-2 z-10 opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none">
          <span className="px-2 py-1 text-xs text-white bg-cyan-700 dark:bg-emerald-600 rounded shadow-lg">
            Read on {formatReadDate(readAt)}
          </span>
        </div>
      )}
      <div className={isRead ? 'opacity-60' : ''}>
        {post.image_url && (
          <div className="relative h-48 w-full">
            <Image
              src={post.image_url}
              alt={post.title}
              fill
              className="object-cover"
              priority={index === 0}
            />
          </div>
        )}
        <div className="p-6 flex flex-col flex-1">
          <div className="flex-1">
            {post.category && (
              <button
                onClick={(e) => handleCategoryClick(e, post.category!)}
                className="text-xs font-medium text-[var(--color-link)] uppercase tracking-wide hover:underline cursor-pointer"
              >
                {post.category}
              </button>
            )}
            <h2 className="mt-2 text-xl font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-link)]">
              {post.title}
            </h2>
            {post.description && (
              <p className="mt-2 text-[var(--color-text-secondary)] line-clamp-2">
                {post.description}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="px-6 pb-6 pt-0 border-t border-[var(--color-border-light)] mt-auto">
        <div className="flex items-center justify-between text-xs pt-4">
          <span className={`flex items-center min-w-0 ${isRead ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-secondary)]'}`}>
            {post.author?.avatar_url ? (
              <div className="w-5 h-5 rounded-full overflow-hidden mr-1.5 flex-shrink-0">
                <Image
                  src={post.author.avatar_url}
                  alt={post.author.display_name}
                  width={20}
                  height={20}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <User className="w-4 h-4 mr-1.5 flex-shrink-0" />
            )}
            <span className="truncate">{post.author?.display_name}</span>
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0 text-[var(--color-text-muted)]">
            {isAuthenticated && (
              <>
                <ReadStatusButton
                  postId={post.id}
                  initialIsRead={isRead}
                  size="sm"
                  onStatusChange={(isRead) => handleReadStatusChange(post.id, isRead)}
                />
                <AddToListButton postId={post.id} size="sm" />
              </>
            )}
            <span className="flex items-center whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5 mr-1" />
              {new Date(post.pub_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>
    </article>
    </Link>
  )}

  // List card component (desktop)
  const ListCard = ({ post }: { post: PostWithAuthor }) => {
    const readAt = isAuthenticated ? readStatuses[post.id] : null
    const isRead = !!readAt
    return (
    <Link href={`/post/${post.normalized_title}`} className="block">
    <article className="bg-[var(--color-bg-card)] rounded-lg shadow-[var(--shadow-light)] overflow-hidden hover:shadow-[var(--shadow-medium)] transition-shadow relative group/card cursor-pointer">
      {/* Read indicator tooltip */}
      {isRead && readAt && formatReadDate(readAt) && (
        <div className="absolute top-2 left-2 z-10 opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none">
          <span className="px-2 py-1 text-xs text-white bg-cyan-700 dark:bg-emerald-600 rounded shadow-lg">
            Read on {formatReadDate(readAt)}
          </span>
        </div>
      )}
      <div className="flex flex-row">
        {post.image_url && (
          <div className={`w-48 flex-shrink-0 ${isRead ? 'opacity-60' : ''}`}>
            <div className="relative h-full w-full">
              <Image
                src={post.image_url}
                alt={post.title}
                fill
                className="object-cover"
              />
            </div>
          </div>
        )}
        <div className="p-4 flex flex-col flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className={`flex-1 min-w-0 ${isRead ? 'opacity-60' : ''}`}>
              {post.category && (
                <button
                  onClick={(e) => handleCategoryClick(e, post.category!)}
                  className="text-xs font-medium text-[var(--color-link)] uppercase tracking-wide hover:underline cursor-pointer"
                >
                  {post.category}
                </button>
              )}
              <h2 className="mt-1 text-lg font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-link)] line-clamp-1">
                {post.title}
              </h2>
              {post.description && (
                <p className="mt-1 text-sm text-[var(--color-text-secondary)] line-clamp-2">
                  {post.description}
                </p>
              )}
            </div>
            {isAuthenticated && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <ReadStatusButton
                  postId={post.id}
                  initialIsRead={isRead}
                  size="sm"
                  onStatusChange={(isRead) => handleReadStatusChange(post.id, isRead)}
                />
                <AddToListButton postId={post.id} size="sm" />
              </div>
            )}
          </div>
          <div className={`mt-3 flex items-center text-sm text-[var(--color-text-muted)] ${isRead ? 'opacity-60' : ''}`}>
            <span className="flex items-center">
              {post.author?.avatar_url ? (
                <div className="w-5 h-5 rounded-full overflow-hidden mr-1.5 flex-shrink-0">
                  <Image
                    src={post.author.avatar_url}
                    alt={post.author.display_name}
                    width={20}
                    height={20}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <User className="w-4 h-4 mr-1.5" />
              )}
              {post.author?.display_name}
            </span>
            <span className="mx-2">·</span>
            <span className="flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1" />
              {new Date(post.pub_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>
    </article>
    </Link>
  )}

  // Compact mobile list card (no images)
  const MobileListCard = ({ post }: { post: PostWithAuthor }) => {
    const readAt = isAuthenticated ? readStatuses[post.id] : null
    const isRead = !!readAt
    return (
    <Link href={`/post/${post.normalized_title}`} className="block">
    <article className="bg-[var(--color-bg-card)] rounded-lg shadow-[var(--shadow-light)] p-3 hover:shadow-[var(--shadow-medium)] transition-shadow relative group/card cursor-pointer">
      {/* Read indicator tooltip */}
      {isRead && readAt && formatReadDate(readAt) && (
        <div className="absolute top-1 left-1 z-10 opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none">
          <span className="px-2 py-1 text-xs text-white bg-cyan-700 dark:bg-emerald-600 rounded shadow-lg">
            Read on {formatReadDate(readAt)}
          </span>
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className={`flex-1 min-w-0 ${isRead ? 'opacity-60' : ''}`}>
          {post.category && (
            <button
              onClick={(e) => handleCategoryClick(e, post.category!)}
              className="text-xs font-medium text-[var(--color-link)] uppercase tracking-wide hover:underline cursor-pointer"
            >
              {post.category}
            </button>
          )}
          <h2 className="mt-0.5 text-base font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-link)] line-clamp-2">
            {post.title}
          </h2>
          {post.description && (
            <p className="mt-1 text-sm text-[var(--color-text-secondary)] line-clamp-1">
              {post.description}
            </p>
          )}
        </div>
        {isAuthenticated && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <ReadStatusButton
              postId={post.id}
              initialIsRead={isRead}
              size="sm"
              onStatusChange={(isRead) => handleReadStatusChange(post.id, isRead)}
            />
            <AddToListButton postId={post.id} size="sm" />
          </div>
        )}
      </div>
      <div className={`mt-2 flex items-center text-xs overflow-hidden ${isRead ? 'opacity-60' : ''}`}>
        <span className="truncate text-[var(--color-text-secondary)]">{post.author?.display_name}</span>
        <span className="mx-1.5 flex-shrink-0 text-[var(--color-text-muted)]">·</span>
        <span className="flex-shrink-0 whitespace-nowrap text-[var(--color-text-muted)]">{new Date(post.pub_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
      </div>
    </article>
    </Link>
  )}

  return (
    <>
      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
          <button
            onClick={(e) => handleCategoryClick(e, null)}
            className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
              selectedCategory === null
                ? 'bg-[var(--color-button-primary)] text-white'
                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={(e) => handleCategoryClick(e, category)}
              className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                selectedCategory === category
                  ? 'bg-[var(--color-button-primary)] text-white'
                  : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-4 sm:mb-6">
        <div className="flex max-w-xl mx-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts..."
            className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-sm border border-[var(--color-border-medium)] rounded-l-md text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] focus:ring-[var(--color-link)] focus:border-[var(--color-link)] focus:outline-none"
          />
          <button
            type="submit"
            className="btn-primary px-4 sm:px-6 py-1.5 sm:py-2 text-sm rounded-r-md"
          >
            Search
          </button>
        </div>
        {(isFiltering || selectedCategory) && (
          <div className="text-center mt-2">
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:underline cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        )}
      </form>

      {/* Posts */}
      {isLoading || statusesLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-2xl font-bold text-[var(--color-text-primary)] animate-pulse">
            INKING...
          </div>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--color-text-muted)]">
            {readingFilter === 'read'
              ? "No read posts yet."
              : readingFilter === 'unread'
              ? "You're all caught up!"
              : 'No posts found. Check back later!'}
          </p>
          {readingFilter !== 'all' && (
            <button
              onClick={() => setFilter(readingFilter === 'read' ? 'unread' : 'read')}
              className="mt-3 text-sm text-[var(--color-link)] hover:underline"
            >
              View {readingFilter === 'read' ? 'unread' : 'read'} posts
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Mobile: list=compact (no images), grid=with images */}
          <div className="sm:hidden">
            {viewMode === 'list' ? (
              <div className="space-y-2">
                {filteredPosts.map((post) => (
                  <MobileListCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPosts.map((post, index) => (
                  <GridCard key={post.id} post={post} index={index} />
                ))}
              </div>
            )}
          </div>

          {/* Desktop: Grid or List based on viewMode */}
          <div className="hidden sm:block">
            {viewMode === 'list' ? (
              <div className="space-y-4">
                {filteredPosts.map((post) => (
                  <ListCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {filteredPosts.map((post, index) => (
                  <GridCard key={post.id} post={post} index={index} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8 space-x-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-[var(--color-border-medium)] rounded-md disabled:opacity-50 text-[var(--color-text-primary)] bg-[var(--color-bg-primary)]"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-[var(--color-text-secondary)]">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-[var(--color-border-medium)] rounded-md disabled:opacity-50 text-[var(--color-text-primary)] bg-[var(--color-bg-primary)]"
          >
            Next
          </button>
        </div>
      )}
    </>
  )
}
