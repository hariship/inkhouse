'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { PostWithAuthor } from '@/types'
import { Calendar, User } from 'lucide-react'

interface PostGridProps {
  initialPosts: PostWithAuthor[]
  initialTotalPages: number
  categories: string[]
}

export function PostGrid({ initialPosts, initialTotalPages, categories }: PostGridProps) {
  const [posts, setPosts] = useState<PostWithAuthor[]>(initialPosts)
  const [isLoading, setIsLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isFiltering, setIsFiltering] = useState(false)

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

  return (
    <>
      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          <button
            onClick={() => handleCategoryClick(null)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
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
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
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
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex max-w-xl mx-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts..."
            className="flex-1 px-4 py-2 border border-[var(--color-border-medium)] rounded-l-md text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] focus:ring-[#0D9488] focus:border-[#0D9488] focus:outline-none"
          />
          <button
            type="submit"
            className="btn-primary px-6 py-2 rounded-r-md"
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
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-button-primary)]"></div>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--color-text-muted)]">
            No posts found. Check back later!
          </p>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.id}
              className="bg-[var(--color-bg-card)] rounded-lg shadow-[var(--shadow-light)] overflow-hidden hover:shadow-[var(--shadow-medium)] transition-shadow flex flex-col"
            >
              {post.image_url && (
                <Link href={`/post/${post.normalized_title}`}>
                  <div className="relative h-48 w-full">
                    <Image
                      src={post.image_url}
                      alt={post.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                </Link>
              )}
              <div className="p-6 flex flex-col flex-1">
                <div className="flex-1">
                  {post.category && (
                    <button
                      onClick={() => handleCategoryClick(post.category!)}
                      className="text-xs font-medium text-[#0D9488] uppercase tracking-wide hover:underline cursor-pointer"
                    >
                      {post.category}
                    </button>
                  )}
                  <Link href={`/post/${post.normalized_title}`}>
                    <h2 className="mt-2 text-xl font-semibold text-[var(--color-text-primary)] hover:text-[#0D9488]">
                      {post.title}
                    </h2>
                  </Link>
                  {post.description && (
                    <p className="mt-2 text-[var(--color-text-secondary)] line-clamp-2">
                      {post.description}
                    </p>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-[var(--color-border-light)] flex items-center justify-between text-sm text-[var(--color-text-muted)]">
                  <Link
                    href={`/author/${post.author?.username}`}
                    className="flex items-center hover:text-[#0D9488]"
                  >
                    {post.author?.avatar_url ? (
                      <Image
                        src={post.author.avatar_url}
                        alt={post.author.display_name}
                        width={24}
                        height={24}
                        className="rounded-full mr-2"
                      />
                    ) : (
                      <User className="w-5 h-5 mr-2" />
                    )}
                    {post.author?.display_name}
                  </Link>
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {new Date(post.pub_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
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
