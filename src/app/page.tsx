import { Metadata } from 'next'
import { Navbar } from '@/components/layout/Navbar'
import { PostGrid } from '@/components/posts/PostGrid'
import { createServerClient } from '@/lib/supabase'

// Revalidate every 60 seconds
export const revalidate = 60

export const metadata: Metadata = {
  title: 'Inkhouse - A home for writers',
  description: 'A home for writers to share their stories, ideas, and perspectives.',
  openGraph: {
    title: 'Inkhouse - A home for writers',
    description: 'A home for writers to share their stories, ideas, and perspectives.',
  },
}

async function getInitialData() {
  const supabase = createServerClient()
  if (!supabase) {
    return { posts: [], totalPages: 0, categories: [] }
  }

  // Fetch posts
  const { data: posts, count } = await supabase
    .from('posts')
    .select(`
      *,
      author:users!posts_author_id_fkey(id, username, display_name, avatar_url, bio)
    `, { count: 'exact' })
    .eq('status', 'published')
    .order('pub_date', { ascending: false })
    .range(0, 9)

  // Fetch unique categories
  const { data: categoryData } = await supabase
    .from('posts')
    .select('category')
    .eq('status', 'published')
    .not('category', 'is', null)
    .not('category', 'eq', '')

  const categories = [...new Set(categoryData?.map(p => p.category).filter(Boolean))] as string[]

  return {
    posts: posts || [],
    totalPages: Math.ceil((count || 0) / 10),
    categories: categories.sort(),
  }
}

export default async function HomePage() {
  const { posts, totalPages, categories } = await getInitialData()

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

        {/* Posts Grid with Search */}
        <PostGrid initialPosts={posts} initialTotalPages={totalPages} categories={categories} />
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
