import { Metadata } from 'next'
import { Navbar } from '@/components/layout/Navbar'
import HomeContent from '@/components/home/HomeContent'
import { db } from '@/lib/db'
import { posts, users } from '@/lib/db/schema'
import { eq, desc, or, isNull, isNotNull, ne, count, sql } from 'drizzle-orm'
import { PostWithAuthor } from '@/types'

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
  // Fetch posts with author join (exclude desk posts)
  const rows = await db
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
      },
    })
    .from(posts)
    .leftJoin(users, eq(posts.author_id, users.id))
    .where(
      sql`${posts.status} = 'published' AND (${posts.type} = 'post' OR ${posts.type} IS NULL)`
    )
    .orderBy(desc(posts.pub_date))
    .limit(10)
    .offset(0)

  // Get total count
  const [{ total }] = await db
    .select({ total: count() })
    .from(posts)
    .where(
      sql`${posts.status} = 'published' AND (${posts.type} = 'post' OR ${posts.type} IS NULL)`
    )

  // Fetch unique categories
  const categoryData = await db
    .select({ category: posts.category })
    .from(posts)
    .where(
      sql`${posts.status} = 'published' AND ${posts.category} IS NOT NULL AND ${posts.category} != ''`
    )

  const categories = [...new Set(categoryData.map(p => p.category).filter(Boolean))] as string[]

  return {
    posts: rows as unknown as PostWithAuthor[],
    totalPages: Math.ceil((total || 0) / 10),
    categories: categories.sort(),
  }
}

export default async function HomePage() {
  const { posts, totalPages, categories } = await getInitialData()

  return (
    <div className="min-h-screen bg-[var(--color-bg-tertiary)]">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
        {/* Hero - compact */}
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] mb-1">
            Welcome to Inkhouse
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
            A home for writers to share their stories, ideas, and perspectives.
          </p>
        </div>

        {/* Posts Grid with Reading Controls */}
        <HomeContent initialPosts={posts} initialTotalPages={totalPages} categories={categories} />
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
