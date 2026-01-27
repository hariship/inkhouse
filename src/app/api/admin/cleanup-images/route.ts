import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser, isAdmin } from '@/lib/auth'
import { cloudinary, deleteImage, extractPublicId, extractCloudinaryUrls } from '@/lib/cloudinary'

export async function POST() {
  try {
    const authUser = await getAuthUser()
    if (!authUser || !isAdmin(authUser)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const supabase = createServerClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    // Collect all Cloudinary URLs referenced in the database
    const referencedUrls = new Set<string>()

    // 1. Post featured images and inline content images
    const { data: posts } = await supabase
      .from('posts')
      .select('image_url, content')

    if (posts) {
      for (const post of posts) {
        if (post.image_url && post.image_url.includes('res.cloudinary.com')) {
          referencedUrls.add(post.image_url)
        }
        for (const url of extractCloudinaryUrls(post.content || '')) {
          referencedUrls.add(url)
        }
      }
    }

    // 2. User draft featured images
    const { data: drafts } = await supabase
      .from('user_drafts')
      .select('image_url')

    if (drafts) {
      for (const draft of drafts) {
        if (draft.image_url && draft.image_url.includes('res.cloudinary.com')) {
          referencedUrls.add(draft.image_url)
        }
      }
    }

    // 3. User avatars
    const { data: users } = await supabase
      .from('users')
      .select('avatar_url')

    if (users) {
      for (const user of users) {
        if (user.avatar_url && user.avatar_url.includes('res.cloudinary.com')) {
          referencedUrls.add(user.avatar_url)
        }
      }
    }

    // Convert URLs to public_ids for matching
    const referencedPublicIds = new Set<string>()
    for (const url of referencedUrls) {
      const publicId = extractPublicId(url)
      if (publicId) {
        referencedPublicIds.add(publicId)
      }
    }

    // Fetch all resources from Cloudinary under the inkhouse/ folder
    let allResources: Array<{ public_id: string }> = []
    let nextCursor: string | undefined

    do {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: 'inkhouse/',
        max_results: 500,
        next_cursor: nextCursor,
      })
      allResources = allResources.concat(result.resources)
      nextCursor = result.next_cursor
    } while (nextCursor)

    // Find orphans
    const orphans = allResources.filter(
      (r) => !referencedPublicIds.has(r.public_id)
    )

    // Delete orphans
    const deleted: string[] = []
    const failed: string[] = []

    for (const orphan of orphans) {
      try {
        await deleteImage(orphan.public_id)
        deleted.push(orphan.public_id)
      } catch {
        failed.push(orphan.public_id)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalCloudinaryImages: allResources.length,
        referencedImages: referencedPublicIds.size,
        orphansFound: orphans.length,
        deleted: deleted.length,
        failed: failed.length,
        deletedIds: deleted,
        failedIds: failed,
      },
    })
  } catch (error) {
    console.error('Cleanup images error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
