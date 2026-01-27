import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export { cloudinary }

// Helper to upload image from base64 or URL
export async function uploadImage(imageData: string | Buffer, folder = 'inkhouse') {
  try {
    const result = await cloudinary.uploader.upload(
      typeof imageData === 'string' ? imageData : `data:image/jpeg;base64,${imageData.toString('base64')}`,
      {
        folder,
        resource_type: 'auto',
      }
    )
    return result.secure_url
  } catch (error) {
    console.error('Cloudinary upload error:', error)
    throw error
  }
}

// Delete an image from Cloudinary by its public_id
export async function deleteImage(publicId: string) {
  try {
    const result = await cloudinary.uploader.destroy(publicId)
    return result
  } catch (error) {
    console.error('Cloudinary delete error:', error)
    throw error
  }
}

// Extract the public_id from a Cloudinary URL
// e.g. https://res.cloudinary.com/xxx/image/upload/v1234567890/inkhouse/abc123.jpg -> inkhouse/abc123
export function extractPublicId(cloudinaryUrl: string): string | null {
  try {
    const match = cloudinaryUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

// Extract all Cloudinary image URLs from HTML content
export function extractCloudinaryUrls(html: string): string[] {
  if (!html) return []
  const regex = /https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/[^\s"'<>]+/g
  const matches = html.match(regex)
  return matches ? [...new Set(matches)] : []
}
