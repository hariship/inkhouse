'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ProfileFormData } from '@/types'
import { Upload } from 'lucide-react'

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const [formData, setFormData] = useState<ProfileFormData>({
    display_name: user?.display_name || '',
    bio: user?.bio || '',
    avatar_url: user?.avatar_url || '',
    website_url: user?.website_url || '',
    social_links: user?.social_links || {},
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSocialChange = (platform: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      social_links: { ...prev.social_links, [platform]: value },
    }))
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formDataToSend = new FormData()
      formDataToSend.append('file', file)

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formDataToSend,
      })

      const data = await response.json()
      if (data.success) {
        setFormData((prev) => ({ ...prev, avatar_url: data.url }))
      } else {
        setError('Failed to upload image')
      }
    } catch {
      setError('Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess(false)

    try {
      const response = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        await refreshUser()
      } else {
        setError(data.error || 'Failed to update profile')
      }
    } catch {
      setError('Network error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">
        Profile Settings
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4">
            <p className="text-sm text-green-700 dark:text-green-400">
              Profile updated successfully!
            </p>
          </div>
        )}

        {/* Avatar */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            Avatar
          </label>
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 rounded-full bg-[var(--color-bg-tertiary)] overflow-hidden">
              {formData.avatar_url ? (
                <img
                  src={formData.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-400">
                  {formData.display_name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <label className="inline-flex items-center px-4 py-2 border border-[var(--color-border-medium)] rounded-md cursor-pointer hover:bg-[var(--color-bg-hover)]">
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Upload'}
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={isUploading}
              />
            </label>
          </div>
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            Display Name
          </label>
          <input
            type="text"
            name="display_name"
            value={formData.display_name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-[var(--color-border-medium)] rounded-md text-[var(--color-text-primary)] bg-[var(--color-bg-card)]"
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            Bio
          </label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-2 border border-[var(--color-border-medium)] rounded-md text-[var(--color-text-primary)] bg-[var(--color-bg-card)]"
            placeholder="Tell readers about yourself..."
          />
        </div>

        {/* Website */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            Website
          </label>
          <input
            type="url"
            name="website_url"
            value={formData.website_url}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-[var(--color-border-medium)] rounded-md text-[var(--color-text-primary)] bg-[var(--color-bg-card)]"
            placeholder="https://..."
          />
        </div>

        {/* Social Links */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            Social Links
          </label>
          <div className="space-y-3">
            {['twitter', 'github', 'linkedin'].map((platform) => (
              <div key={platform} className="flex items-center space-x-2">
                <span className="w-24 text-sm text-[var(--color-text-secondary)] capitalize">
                  {platform}
                </span>
                <input
                  type="url"
                  value={formData.social_links?.[platform] || ''}
                  onChange={(e) => handleSocialChange(platform, e.target.value)}
                  className="flex-1 px-4 py-2 border border-[var(--color-border-medium)] rounded-md text-[var(--color-text-primary)] bg-[var(--color-bg-card)]"
                  placeholder={`https://${platform}.com/...`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            <strong>Username:</strong> @{user?.username}
          </p>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            <strong>Email:</strong> {user?.email}
          </p>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            <strong>Member since:</strong>{' '}
            {user?.created_at && new Date(user.created_at).toLocaleDateString()}
          </p>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary px-6 py-2 rounded-md disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
