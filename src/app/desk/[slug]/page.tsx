import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Navbar } from '@/components/layout/Navbar'
import { Calendar, ArrowLeft, NotebookPen } from 'lucide-react'
import { createServerClient } from '@/lib/supabase'
import parse from 'html-react-parser'
import { CommentsSection } from '@/components/comments/CommentsSection'

export const revalidate = 60

async function getDeskPost(slug: string) {
  const supabase = createServerClient()
  if (!supabase) return null

  const { data: post } = await supabase
    .from('posts')
    .select(`
      *,
      author:users!posts_author_id_fkey(id, username, display_name, avatar_url)
    `)
    .eq('normalized_title', slug)
    .eq('status', 'published')
    .eq('type', 'desk')
    .single()

  return post
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await getDeskPost(slug)

  if (!post) {
    return { title: 'Post not found - Inkhouse' }
  }

  return {
    title: `${post.title} - From the Desk - Inkhouse`,
    description: post.description || post.title,
    openGraph: {
      title: post.title,
      description: post.description || post.title,
      images: post.image_url ? [post.image_url] : [],
    },
  }
}

export default async function DeskPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getDeskPost(slug)

  if (!post) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-secondary)]">
      <Navbar />

      <article className="max-w-3xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/desk"
          className="inline-flex items-center text-[var(--color-text-secondary)] hover:text-[#0D9488] mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to From the Desk
        </Link>

        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <NotebookPen className="w-5 h-5 text-[var(--color-link)]" />
            <span className="text-sm font-medium text-[var(--color-link)]">
              From the Desk
            </span>
          </div>
          {post.category && (
            <span className="text-sm font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
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
        <div className="prose dark:prose-invert max-w-none mb-12">
          {parse(post.content.replace(/&nbsp;/g, ' '))}
        </div>

        {/* From Inkhouse */}
        <div className="border-t border-[var(--color-border-light)] pt-8">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center">
              <NotebookPen className="w-8 h-8 text-[var(--color-link)]" />
            </div>
            <div>
              <p className="text-lg font-medium text-[var(--color-text-primary)]">
                Inkhouse
              </p>
              <p className="text-sm text-[var(--color-text-muted)]">
                Updates and stories from the Inkhouse team
              </p>
            </div>
          </div>
        </div>

        {/* Comments */}
        <CommentsSection postId={post.id} allowComments={post.allow_comments !== false} />
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
