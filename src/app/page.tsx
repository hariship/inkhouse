'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Navbar } from '@/components/layout/Navbar'
import { PostWithAuthor } from '@/types'
import { Calendar, User } from 'lucide-react'

export default function HomePage() {
  const [posts, setPosts] = useState<PostWithAuthor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '10',
        })
        if (search) params.append('search', search)

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
  }, [page, search])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-secondary)]">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-4">
            Welcome to Inkhouse
          </h1>
          <p className="text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto">
            A home for writers to share their stories, ideas, and perspectives.
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex max-w-xl mx-auto">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts..."
              className="flex-1 px-4 py-2 border border-[var(--color-border-medium)] rounded-l-md text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] focus:ring-[var(--color-link)] focus:border-[var(--color-link)] focus:outline-none"
            />
            <button
              type="submit"
              className="btn-primary px-6 py-2 rounded-r-md"
            >
              Search
            </button>
          </div>
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
                className="bg-[var(--color-bg-card)] rounded-lg shadow-[var(--shadow-light)] overflow-hidden hover:shadow-[var(--shadow-medium)] transition-shadow"
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
                <div className="p-6">
                  {post.category && (
                    <span className="text-xs font-medium text-[var(--color-link)] uppercase tracking-wide">
                      {post.category}
                    </span>
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
                  <div className="mt-4 flex items-center justify-between text-sm text-[var(--color-text-muted)]">
                    <Link
                      href={`/author/${post.author?.username}`}
                      className="flex items-center hover:text-[var(--color-link)]"
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
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border-light)] mt-12 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-[var(--color-text-muted)]">
          <p>Inkhouse - A home for writers</p>
        </div>
      </footer>
    </div>
  )
}
