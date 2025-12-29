'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Navbar } from '@/components/layout/Navbar'
import { PublicUser, Post } from '@/types'
import { Calendar, User, Globe, Twitter, Github, Linkedin, ArrowLeft } from 'lucide-react'

interface AuthorData {
  author: PublicUser
  posts: Post[]
}

export default function AuthorPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params)
  const [data, setData] = useState<AuthorData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchAuthor = async () => {
      try {
        const response = await fetch(`/api/author/${username}`)
        const result = await response.json()

        if (result.success) {
          setData(result.data)
        }
      } catch (error) {
        console.error('Failed to fetch author:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAuthor()
  }, [username])

  const socialIcons: Record<string, React.ReactNode> = {
    twitter: <Twitter className="w-5 h-5" />,
    github: <Github className="w-5 h-5" />,
    linkedin: <Linkedin className="w-5 h-5" />,
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-secondary)]">
        <Navbar />
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-button-primary)]"></div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-secondary)]">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">
            Author not found
          </h1>
          <Link href="/" className="text-[var(--color-link)] hover:text-[var(--color-link)]">
            Back to home
          </Link>
        </div>
      </div>
    )
  }

  const { author, posts } = data

  return (
    <div className="min-h-screen bg-[var(--color-bg-secondary)]">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center text-[var(--color-text-secondary)] hover:text-[var(--color-link)] mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to all posts
        </Link>

        {/* Author Header */}
        <div className="bg-[var(--color-bg-card)] rounded-lg shadow p-8 mb-8">
          <div className="flex items-start space-x-6">
            {author.avatar_url ? (
              <Image
                src={author.avatar_url}
                alt={author.display_name}
                width={96}
                height={96}
                className="rounded-full"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                <User className="w-12 h-12 text-[var(--color-link)]" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                {author.display_name}
              </h1>
              <p className="text-[var(--color-text-muted)]">@{author.username}</p>
              {author.bio && (
                <p className="mt-4 text-[var(--color-text-secondary)]">{author.bio}</p>
              )}
              <div className="flex items-center space-x-4 mt-4">
                {author.website_url && (
                  <a
                    href={author.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-gray-500 hover:text-[var(--color-link)]"
                  >
                    <Globe className="w-5 h-5 mr-1" />
                    Website
                  </a>
                )}
                {author.social_links &&
                  Object.entries(author.social_links).map(
                    ([platform, url]) =>
                      url && (
                        <a
                          key={platform}
                          href={url as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-500 hover:text-[var(--color-link)]"
                        >
                          {socialIcons[platform] || platform}
                        </a>
                      )
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* Posts */}
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-6">
          Posts by {author.display_name} ({posts.length})
        </h2>

        {posts.length === 0 ? (
          <div className="text-center py-12 bg-[var(--color-bg-card)] rounded-lg">
            <p className="text-[var(--color-text-muted)]">
              No posts published yet.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <article
                key={post.id}
                className="bg-[var(--color-bg-card)] rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex space-x-4">
                  {post.image_url && (
                    <Link href={`/post/${post.normalized_title}`}>
                      <div className="relative h-32 w-48 flex-shrink-0 rounded-lg overflow-hidden">
                        <Image
                          src={post.image_url}
                          alt={post.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </Link>
                  )}
                  <div className="flex-1">
                    {post.category && (
                      <span className="text-xs font-medium text-[var(--color-link)] uppercase tracking-wide">
                        {post.category}
                      </span>
                    )}
                    <Link href={`/post/${post.normalized_title}`}>
                      <h3 className="text-xl font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-link)] mt-1">
                        {post.title}
                      </h3>
                    </Link>
                    {post.description && (
                      <p className="mt-2 text-[var(--color-text-secondary)] line-clamp-2">
                        {post.description}
                      </p>
                    )}
                    <div className="flex items-center mt-3 text-sm text-[var(--color-text-muted)]">
                      <Calendar className="w-4 h-4 mr-1" />
                      {new Date(post.pub_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </article>
            ))}
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
