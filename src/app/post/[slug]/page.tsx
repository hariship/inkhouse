'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Navbar } from '@/components/layout/Navbar'
import { PostWithAuthor } from '@/types'
import { Calendar, User, ArrowLeft, Globe, Twitter, Github, Linkedin } from 'lucide-react'
import parse from 'html-react-parser'

export default function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [post, setPost] = useState<PostWithAuthor | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`/api/posts/${slug}`)
        const data = await response.json()

        if (data.success) {
          setPost(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch post:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPost()
  }, [slug])

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

  if (!post) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-secondary)]">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">
            Post not found
          </h1>
          <Link href="/" className="text-[var(--color-link)] hover:text-[var(--color-link)]">
            Back to home
          </Link>
        </div>
      </div>
    )
  }

  const socialIcons: Record<string, React.ReactNode> = {
    twitter: <Twitter className="w-5 h-5" />,
    github: <Github className="w-5 h-5" />,
    linkedin: <Linkedin className="w-5 h-5" />,
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-secondary)]">
      <Navbar />

      <article className="max-w-3xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center text-[var(--color-text-secondary)] hover:text-[var(--color-link)] mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to all posts
        </Link>

        {/* Header */}
        <header className="mb-8">
          {post.category && (
            <span className="text-sm font-medium text-[var(--color-link)] uppercase tracking-wide">
              {post.category}
            </span>
          )}
          <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mt-2 mb-4">
            {post.title}
          </h1>
          {post.description && (
            <p className="text-xl text-[var(--color-text-secondary)]">
              {post.description}
            </p>
          )}
          <div className="flex items-center mt-6 text-[var(--color-text-muted)]">
            <Calendar className="w-4 h-4 mr-2" />
            {new Date(post.pub_date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </header>

        {/* Featured Image */}
        {post.image_url && (
          <div className="relative h-96 w-full mb-8 rounded-lg overflow-hidden">
            <Image
              src={post.image_url}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Content */}
        <div className="prose dark:prose-invert max-w-none mb-12">
          {parse(post.content)}
        </div>

        {/* Author Card */}
        {post.author && (
          <div className="border-t border-[var(--color-border-light)] pt-8">
            <div className="flex items-start space-x-4">
              <Link href={`/author/${post.author.username}`}>
                {post.author.avatar_url ? (
                  <Image
                    src={post.author.avatar_url}
                    alt={post.author.display_name}
                    width={64}
                    height={64}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                    <User className="w-8 h-8 text-[var(--color-link)]" />
                  </div>
                )}
              </Link>
              <div className="flex-1">
                <Link
                  href={`/author/${post.author.username}`}
                  className="text-lg font-medium text-[var(--color-text-primary)] hover:text-[var(--color-link)]"
                >
                  {post.author.display_name}
                </Link>
                <p className="text-sm text-[var(--color-text-muted)]">
                  @{post.author.username}
                </p>
                {post.author.bio && (
                  <p className="mt-2 text-[var(--color-text-secondary)]">
                    {post.author.bio}
                  </p>
                )}
                <div className="flex items-center space-x-3 mt-3">
                  {post.author.website_url && (
                    <a
                      href={post.author.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-[var(--color-link)]"
                    >
                      <Globe className="w-5 h-5" />
                    </a>
                  )}
                  {post.author.social_links &&
                    Object.entries(post.author.social_links).map(
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
        )}
      </article>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border-light)] mt-12 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-[var(--color-text-muted)]">
          <p>Inkhouse - A home for writers</p>
        </div>
      </footer>
    </div>
  )
}
