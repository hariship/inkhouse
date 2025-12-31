import { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { createServerClient } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { NotebookPen } from 'lucide-react'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'From the Desk - Inkhouse',
  description: 'Updates, guidelines, and stories from the Inkhouse team.',
  openGraph: {
    title: 'From the Desk - Inkhouse',
    description: 'Updates, guidelines, and stories from the Inkhouse team.',
  },
}

async function getDeskPosts() {
  const supabase = createServerClient()
  if (!supabase) {
    return { posts: [], totalPages: 0 }
  }

  const { data: posts, count } = await supabase
    .from('posts')
    .select(`
      *,
      author:users!posts_author_id_fkey(id, username, display_name, avatar_url)
    `, { count: 'exact' })
    .eq('status', 'published')
    .eq('type', 'desk')
    .order('pub_date', { ascending: false })
    .range(0, 19)

  return {
    posts: posts || [],
    totalPages: Math.ceil((count || 0) / 20),
  }
}

function getReadingTime(content: string): number {
  const wordsPerMinute = 200
  const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length
  return Math.ceil(words / wordsPerMinute)
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

export default async function DeskPage() {
  const { posts } = await getDeskPosts()

  return (
    <div className="min-h-screen bg-[var(--color-bg-tertiary)]">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--color-bg-card)] border border-[var(--color-border-light)] mb-4">
            <NotebookPen className="w-8 h-8 text-[var(--color-link)]" />
          </div>
          <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-4">
            From the Desk
          </h1>
          <p className="text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto">
            Updates, guidelines, philosophy, and stories from Inkhouse.
          </p>
        </div>

        {/* Posts */}
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--color-text-muted)]">
              No posts yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post, index) => {
              const readingTime = getReadingTime(post.content)
              const excerpt = post.description || stripHtml(post.content).substring(0, 200) + '...'
              const isLatest = index === 0

              return (
                <Link
                  key={post.id}
                  href={`/desk/${post.normalized_title}`}
                  className={`block bg-[var(--color-bg-card)] rounded-lg border border-[var(--color-border-light)] hover:border-[var(--color-border-medium)] transition-colors ${
                    isLatest ? 'p-8' : 'p-6'
                  }`}
                >
                  {isLatest && (
                    <span className="inline-block text-xs font-medium text-[var(--color-link)] bg-[var(--color-bg-tertiary)] px-2 py-1 rounded mb-3">
                      Latest
                    </span>
                  )}
                  <h2 className={`font-bold text-[var(--color-text-primary)] mb-2 ${
                    isLatest ? 'text-2xl' : 'text-xl'
                  }`}>
                    {post.title}
                  </h2>
                  <p className={`text-[var(--color-text-secondary)] mb-4 ${
                    isLatest ? 'text-base' : 'text-sm'
                  }`}>
                    {excerpt}
                  </p>
                  <div className="flex items-center text-sm text-[var(--color-text-muted)]">
                    <span>
                      {formatDistanceToNow(new Date(post.pub_date), { addSuffix: true })}
                    </span>
                    <span className="mx-2">·</span>
                    <span>{readingTime} min read</span>
                    {post.category && (
                      <>
                        <span className="mx-2">·</span>
                        <span>{post.category}</span>
                      </>
                    )}
                  </div>
                </Link>
              )
            })}
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
