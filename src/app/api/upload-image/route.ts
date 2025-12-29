import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { uploadImage } from '@/lib/cloudinary'

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let imageData: string | null = null
    const contentType = request.headers.get('content-type') || ''

    // Handle JSON body (for base64 from Excalidraw)
    if (contentType.includes('application/json')) {
      const body = await request.json()
      imageData = body.base64
    }
    // Handle FormData (for file uploads)
    else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      const base64 = formData.get('base64') as string | null

      if (file) {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        imageData = `data:${file.type};base64,${buffer.toString('base64')}`
      } else if (base64) {
        imageData = base64
      }
    }

    if (!imageData) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    const url = await uploadImage(imageData, 'inkhouse')

    return NextResponse.json({
      success: true,
      url,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to upload image' },
      { status: 500 }
    )
  }
}
