import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

export async function PATCH(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { display_name, bio, avatar_url, website_url, social_links } = body

    if (!display_name) {
      return NextResponse.json(
        { success: false, error: 'Display name is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    const { data: user, error } = await supabase
      .from('users')
      .update({
        display_name,
        bio: bio || null,
        avatar_url: avatar_url || null,
        website_url: website_url || null,
        social_links: social_links || {},
      })
      .eq('id', authUser.userId)
      .select()
      .single()

    if (error) {
      console.error('Update profile error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    // Remove password_hash from response
    const { password_hash: _, ...safeUser } = user

    return NextResponse.json({
      success: true,
      data: safeUser,
    })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
