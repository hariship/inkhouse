import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { posts, users } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const result = await db
      .select({
        id: posts.id,
        title: posts.title,
        normalized_title: posts.normalized_title,
        description: posts.description,
        image_url: posts.image_url,
        category: posts.category,
        pub_date: posts.pub_date,
        author: {
          display_name: users.display_name,
          username: users.username,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.author_id, users.id))
      .where(eq(posts.status, 'published'))
      .orderBy(desc(posts.pub_date))
      .limit(50)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://inkhouse.haripriya.org'

    const rssItems = result.map((post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${baseUrl}/post/${post.normalized_title}</link>
      <guid isPermaLink="true">${baseUrl}/post/${post.normalized_title}</guid>
      <pubDate>${new Date(post.pub_date!).toUTCString()}</pubDate>
      <description><![CDATA[${post.description || ''}]]></description>
      <author>${post.author?.display_name || 'Unknown'}</author>
      ${post.category ? `<category>${post.category}</category>` : ''}
      ${post.image_url ? `<enclosure url="${post.image_url}" type="image/jpeg" />` : ''}
    </item>`).join('')

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Inkhouse</title>
    <link>${baseUrl}</link>
    <description>A home for writers to share their stories, ideas, and perspectives.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/api/rss" rel="self" type="application/rss+xml" />
    ${rssItems}
  </channel>
</rss>`

    return new NextResponse(rss, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  } catch (error) {
    console.error('RSS feed error:', error)
    return new NextResponse('Error generating feed', { status: 500 })
  }
}
