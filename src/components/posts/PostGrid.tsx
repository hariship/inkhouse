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

  // Track reading status for authenticated users
  const [readStatuses, setReadStatuses] = useState<Record<number, boolean>>({})
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
          const newReadStatuses: Record<number, boolean> = {}
          Object.keys(readData.data || {}).forEach((id) => {
            newReadStatuses[parseInt(id)] = true
          })
          setReadStatuses(newReadStatuses)
        }
      } catch (error) {
        console.error('Failed to fetch reading statuses:', error)
      } finally {
        setStatusesLoaded(true)
      }
    }

    fetchStatuses()
  }, [posts, isAuthenticated])

  // Show loading when filter is active but statuses haven't loaded yet
  const statusesLoading = isAuthenticated && readingFilter !== 'all' && !statusesLoaded

  // Filter posts based on reading filter
  const filteredPosts = posts.filter((post) => {
    if (!isAuthenticated || readingFilter === 'all') return true

    const isRead = readStatuses[post.id] || false

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

  const handleCategoryClick = (category: string | null) => {
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
    setReadStatuses((prev) => ({ ...prev, [postId]: isRead }))
  }


  // Grid card component
  const GridCard = ({ post, index }: { post: PostWithAuthor; index: number }) => (
    <article className="bg-[var(--color-bg-card)] rounded-lg shadow-[var(--shadow-light)] overflow-hidden hover:shadow-[var(--shadow-medium)] transition-shadow flex flex-col">
      {post.image_url && (
        <Link href={`/post/${post.normalized_title}`}>
          <div className="relative h-48 w-full">
            <Image
              src={post.image_url}
              alt={post.title}
              fill
              className="object-cover"
              priority={index === 0}
            />
          </div>
        </Link>
      )}
      <div className="p-6 flex flex-col flex-1">
        <div className="flex-1">
          {post.category && (
            <button
              onClick={() => handleCategoryClick(post.category!)}
              className="text-xs font-medium text-[var(--color-link)] uppercase tracking-wide hover:underline cursor-pointer"
            >
              {post.category}
            </button>
          )}
          <Link href={`/post/${post.normalized_title}`}>
            <h2 className="mt-2 text-xl font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-link)]">
              {post.title}
            </h2>
          </Link>
          {post.description && (
            <p className="mt-2 text-[var(--color-text-secondary)] line-clamp-2">
              {post.description}
            </p>
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-[var(--color-border-light)] flex items-center justify-between text-xs">
          <Link
            href={`/author/${post.author?.username}`}
            className="flex items-center text-[var(--color-text-secondary)] hover:text-[var(--color-link)] min-w-0"
          >
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
          </Link>
          <div className="flex items-center gap-1.5 flex-shrink-0 text-[var(--color-text-muted)]">
            {isAuthenticated && (
              <>
                <ReadStatusButton
                  postId={post.id}
                  initialIsRead={readStatuses[post.id] || false}
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
  )

  // List card component (desktop)
  const ListCard = ({ post }: { post: PostWithAuthor }) => (
    <article className="bg-[var(--color-bg-card)] rounded-lg shadow-[var(--shadow-light)] overflow-hidden hover:shadow-[var(--shadow-medium)] transition-shadow">
      <div className="flex flex-row">
        {post.image_url && (
          <Link href={`/post/${post.normalized_title}`} className="w-48 flex-shrink-0">
            <div className="relative h-full w-full">
              <Image
                src={post.image_url}
                alt={post.title}
                fill
                className="object-cover"
              />
            </div>
          </Link>
        )}
        <div className="p-4 flex flex-col flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {post.category && (
                <button
                  onClick={() => handleCategoryClick(post.category!)}
                  className="text-xs font-medium text-[var(--color-link)] uppercase tracking-wide hover:underline cursor-pointer"
                >
                  {post.category}
                </button>
              )}
              <Link href={`/post/${post.normalized_title}`}>
                <h2 className="mt-1 text-lg font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-link)] line-clamp-1">
                  {post.title}
                </h2>
              </Link>
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
                  initialIsRead={readStatuses[post.id] || false}
                  size="sm"
                  onStatusChange={(isRead) => handleReadStatusChange(post.id, isRead)}
                />
                <AddToListButton postId={post.id} size="sm" />
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center text-sm text-[var(--color-text-muted)]">
            <Link
              href={`/author/${post.author?.username}`}
              className="flex items-center hover:text-[var(--color-link)]"
            >
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
            </Link>
            <span className="mx-2">·</span>
            <span className="flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1" />
              {new Date(post.pub_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>
    </article>
  )

  // Compact mobile list card (no images)
  const MobileListCard = ({ post }: { post: PostWithAuthor }) => (
    <article className="bg-[var(--color-bg-card)] rounded-lg shadow-[var(--shadow-light)] p-3 hover:shadow-[var(--shadow-medium)] transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {post.category && (
            <button
              onClick={() => handleCategoryClick(post.category!)}
              className="text-xs font-medium text-[var(--color-link)] uppercase tracking-wide hover:underline cursor-pointer"
            >
              {post.category}
            </button>
          )}
          <Link href={`/post/${post.normalized_title}`}>
            <h2 className="mt-0.5 text-base font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-link)] line-clamp-2">
              {post.title}
            </h2>
          </Link>
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
              initialIsRead={readStatuses[post.id] || false}
              size="sm"
              onStatusChange={(isRead) => handleReadStatusChange(post.id, isRead)}
            />
            <AddToListButton postId={post.id} size="sm" />
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center text-xs overflow-hidden">
        <span className="truncate text-[var(--color-text-secondary)]">{post.author?.display_name}</span>
        <span className="mx-1.5 flex-shrink-0 text-[var(--color-text-muted)]">·</span>
        <span className="flex-shrink-0 whitespace-nowrap text-[var(--color-text-muted)]">{new Date(post.pub_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
      </div>
    </article>
  )

  return (
    <>
      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mb-4 sm:mb-6">
          <button
            onClick={() => handleCategoryClick(null)}
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
              onClick={() => handleCategoryClick(category)}
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
      <form onSubmit={handleSearch} className="mb-6 sm:mb-8">
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
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-button-primary)]"></div>
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
