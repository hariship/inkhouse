import Link from 'next/link'
import { PostAnalytics } from '@/types'
import { Eye, BookOpen, Box, MessageSquare, MessageSquareLock } from 'lucide-react'

interface PostStatsTableProps {
  posts: PostAnalytics[]
}

export function PostStatsTable({ posts }: PostStatsTableProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--color-text-muted)]">
        No published posts yet.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto pt-8 -mt-8">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--color-border-light)]">
            <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-text-muted)]">
              Post
            </th>
            <th className="text-center py-3 px-2 text-sm font-medium text-[var(--color-text-muted)] group relative">
              <Eye className="w-4 h-4 inline" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                Views (from Jan 2026)
              </span>
            </th>
            <th className="text-center py-3 px-2 text-sm font-medium text-[var(--color-text-muted)] group relative">
              <BookOpen className="w-4 h-4 inline" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                Reads
              </span>
            </th>
            <th className="text-center py-3 px-2 text-sm font-medium text-[var(--color-text-muted)] group relative">
              <Box className="w-4 h-4 inline" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                Box Additions
              </span>
            </th>
            <th className="text-center py-3 px-2 text-sm font-medium text-[var(--color-text-muted)] group relative">
              <MessageSquare className="w-4 h-4 inline" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                Comments
              </span>
            </th>
            <th className="text-center py-3 px-2 text-sm font-medium text-[var(--color-text-muted)] group relative">
              <MessageSquareLock className="w-4 h-4 inline" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                Critiques
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr
              key={post.post_id}
              className="border-b border-[var(--color-border-light)] hover:bg-[var(--color-bg-hover)]"
            >
              <td className="py-3 px-4">
                <Link
                  href={`/post/${post.normalized_title}`}
                  className="text-[var(--color-text-primary)] hover:text-[var(--color-link)] font-medium"
                >
                  {post.title}
                </Link>
              </td>
              <td className="text-center py-3 px-2 text-[var(--color-text-secondary)]">
                {post.views}
              </td>
              <td className="text-center py-3 px-2 text-[var(--color-text-secondary)]">
                {post.reads}
              </td>
              <td className="text-center py-3 px-2 text-[var(--color-text-secondary)]">
                {post.box_additions}
              </td>
              <td className="text-center py-3 px-2 text-[var(--color-text-secondary)]">
                {post.comments}
              </td>
              <td className="text-center py-3 px-2 text-[var(--color-text-secondary)]">
                {post.critiques}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend for mobile */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-[var(--color-text-muted)] sm:hidden">
        <span className="flex items-center gap-1">
          <Eye className="w-3 h-3" /> Views*
        </span>
        <span className="flex items-center gap-1">
          <BookOpen className="w-3 h-3" /> Reads
        </span>
        <span className="flex items-center gap-1">
          <Box className="w-3 h-3" /> Box
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare className="w-3 h-3" /> Comments
        </span>
        <span className="flex items-center gap-1">
          <MessageSquareLock className="w-3 h-3" /> Critiques
        </span>
      </div>
    </div>
  )
}
