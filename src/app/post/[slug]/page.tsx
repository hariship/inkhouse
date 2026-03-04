import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Navbar } from '@/components/layout/Navbar'
import { Calendar, User, ArrowLeft, Globe, Twitter, Github, Linkedin } from 'lucide-react'
import { db } from '@/lib/db'
import { posts, users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import parse from 'html-react-parser'
import { CommentsSection } from '@/components/comments/CommentsSection'
import { CritiqueSection } from '@/components/critiques/CritiqueSection'
import { ViewTracker } from '@/components/analytics/ViewTracker'
import { MarkAsReadPrompt } from '@/components/reading/MarkAsReadPrompt'

// Revalidate every 60 seconds
export const revalidate = 60

async function getPost(slug: string) {
  const [post] = await db
    .select({
      id: posts.id,
      title: posts.title,
      normalized_title: posts.normalized_title,
      description: posts.description,
      image_url: posts.image_url,
      content: posts.content,
      category: posts.category,
      enclosure: posts.enclosure,
      pub_date: posts.pub_date,
      updated_at: posts.updated_at,
      author_id: posts.author_id,
      status: posts.status,
      featured: posts.featured,
      allow_comments: posts.allow_comments,
      type: posts.type,
      author: {
        id: users.id,
        username: users.username,
        display_name: users.display_name,
        avatar_url: users.avatar_url,
        bio: users.bio,
        website_url: users.website_url,
        social_links: users.social_links,
      },
    })
    .from(posts)
    .leftJoin(users, eq(posts.author_id, users.id))
    .where(and(eq(posts.normalized_title, slug), eq(posts.status, 'published')))
    .limit(1)

  return post || null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)

  if (!post) {
    return { title: 'Post not found - Inkhouse' }
  }

  return {
    title: `${post.title} - Inkhouse`,
    description: post.description || post.title,
    openGraph: {
      title: post.title,
      description: post.description || post.title,
      images: post.image_url ? [post.image_url] : [],
    },
  }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)

  if (!post) {
    notFound()
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
        {/* Track page view */}
        <ViewTracker postId={post.id} />

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
            {new Date(post.pub_date!).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </header>

        {/* Featured Image */}
        {post.image_url && (
          <div className="relative w-full mb-8 rounded-lg overflow-hidden">
            <Image
              src={post.image_url}
              alt={post.title}
              width={800}
              height={400}
              className="w-full h-auto object-cover rounded-lg"
              priority
            />
          </div>
        )}

        {/* Content */}
        <div className="prose dark:prose-invert max-w-none mb-8">
          {parse(post.content.replace(/&nbsp;/g, ' '))}
        </div>

        {/* Mark as Read */}
        <MarkAsReadPrompt postId={post.id} />

        {/* Author Card */}
        {post.author && (
          <div className="border-t border-[var(--color-border-light)] pt-8">
            <div className="flex items-start space-x-4">
              <Link href={`/author/${post.author.username}`}>
                {post.author.avatar_url ? (
                  <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                    <Image
                      src={post.author.avatar_url}
                      alt={post.author.display_name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  </div>
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
                  {!!post.author.social_links &&
                    Object.entries(post.author.social_links as Record<string, string>).map(
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

        {/* Comments */}
        <CommentsSection postId={post.id} allowComments={post.allow_comments !== false} />

        {/* Critique Section (for writers only) */}
        <CritiqueSection postId={post.id} postAuthorId={post.author_id} />
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
