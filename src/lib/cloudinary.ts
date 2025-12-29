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
