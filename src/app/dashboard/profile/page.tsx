'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ProfileFormData } from '@/types'
import { Upload, Eye, EyeOff } from 'lucide-react'

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

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState('')

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

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswordData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordLoading(true)
    setPasswordError('')
    setPasswordSuccess(false)

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match')
      setPasswordLoading(false)
      return
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters')
      setPasswordLoading(false)
      return
    }

    try {
      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setPasswordSuccess(true)
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        setPasswordError(data.error || 'Failed to change password')
      }
    } catch {
      setPasswordError('Network error')
    } finally {
      setPasswordLoading(false)
    }
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
      <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] mb-6">
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
            <p className="text-sm text-[var(--color-text-primary)] dark:text-green-400">
              Profile updated successfully!
            </p>
          </div>
        )}

        {/* Avatar */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            Avatar
          </label>
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[var(--color-bg-tertiary)] overflow-hidden shrink-0">
              {formData.avatar_url ? (
                <img
                  src={formData.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl sm:text-2xl font-bold text-gray-400">
                  {formData.display_name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <label className="inline-flex items-center px-3 sm:px-4 py-2 border border-[var(--color-border-medium)] rounded-md cursor-pointer hover:bg-[var(--color-bg-hover)] text-sm">
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
              <div key={platform} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="w-20 text-xs sm:text-sm text-[var(--color-text-secondary)] capitalize shrink-0">
                  {platform}
                </span>
                <input
                  type="url"
                  value={formData.social_links?.[platform] || ''}
                  onChange={(e) => handleSocialChange(platform, e.target.value)}
                  className="flex-1 px-3 sm:px-4 py-2 border border-[var(--color-border-medium)] rounded-md text-[var(--color-text-primary)] bg-[var(--color-bg-card)] text-sm"
                  placeholder={`https://${platform}.com/...`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border-light)] rounded-lg p-4">
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

      {/* Change Password Section */}
      <div className="mt-8 sm:mt-10 pt-8 sm:pt-10 border-t border-[var(--color-border-light)]">
        <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)] mb-6">
          Change Password
        </h2>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {passwordError && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm text-red-700 dark:text-red-400">{passwordError}</p>
            </div>
          )}

          {passwordSuccess && (
            <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4">
              <p className="text-sm text-[var(--color-text-primary)] dark:text-green-400">
                Password changed successfully!
              </p>
            </div>
          )}

          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                required
                className="w-full px-4 py-2 pr-10 border border-[var(--color-border-medium)] rounded-md text-[var(--color-text-primary)] bg-[var(--color-bg-card)]"
              />
              <button
                type="button"
                onClick={() => setShowPasswords((prev) => ({ ...prev, current: !prev.current }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              >
                {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                required
                minLength={8}
                className="w-full px-4 py-2 pr-10 border border-[var(--color-border-medium)] rounded-md text-[var(--color-text-primary)] bg-[var(--color-bg-card)]"
              />
              <button
                type="button"
                onClick={() => setShowPasswords((prev) => ({ ...prev, new: !prev.new }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              >
                {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Must be at least 8 characters
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                required
                className="w-full px-4 py-2 pr-10 border border-[var(--color-border-medium)] rounded-md text-[var(--color-text-primary)] bg-[var(--color-bg-card)]"
              />
              <button
                type="button"
                onClick={() => setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              >
                {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={passwordLoading}
              className="px-6 py-2 rounded-md bg-[var(--color-text-primary)] text-[var(--color-bg-primary)] hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {passwordLoading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
