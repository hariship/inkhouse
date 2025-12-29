import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    if (!supabase) {
      return new NextResponse('Database not configured', { status: 503 })
    }

    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:users!posts_author_id_fkey(display_name, username)
      `)
      .eq('status', 'published')
      .order('pub_date', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Fetch posts error:', error)
      return new NextResponse('Error generating feed', { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://inkhouse.haripriya.org'

    const rssItems = posts?.map((post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${baseUrl}/post/${post.normalized_title}</link>
      <guid isPermaLink="true">${baseUrl}/post/${post.normalized_title}</guid>
      <pubDate>${new Date(post.pub_date).toUTCString()}</pubDate>
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
