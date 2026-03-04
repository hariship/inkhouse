import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { posts, userDrafts, users } from '@/lib/db/schema'
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

    // Collect all Cloudinary URLs referenced in the database
    const referencedUrls = new Set<string>()

    // 1. Post featured images and inline content images
    const allPosts = await db
      .select({ image_url: posts.image_url, content: posts.content })
      .from(posts)

    for (const post of allPosts) {
      if (post.image_url && post.image_url.includes('res.cloudinary.com')) {
        referencedUrls.add(post.image_url)
      }
      for (const url of extractCloudinaryUrls(post.content || '')) {
        referencedUrls.add(url)
      }
    }

    // 2. User draft featured images
    const allDrafts = await db
      .select({ image_url: userDrafts.image_url })
      .from(userDrafts)

    for (const draft of allDrafts) {
      if (draft.image_url && draft.image_url.includes('res.cloudinary.com')) {
        referencedUrls.add(draft.image_url)
      }
    }

    // 3. User avatars
    const allUsers = await db
      .select({ avatar_url: users.avatar_url })
      .from(users)

    for (const user of allUsers) {
      if (user.avatar_url && user.avatar_url.includes('res.cloudinary.com')) {
        referencedUrls.add(user.avatar_url)
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
