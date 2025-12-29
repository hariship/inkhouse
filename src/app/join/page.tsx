'use client'

import { useState } from 'react'
import Link from 'next/link'
import { JoinRequestFormData } from '@/types'

export default function JoinPage() {
  const [formData, setFormData] = useState<JoinRequestFormData>({
    email: '',
    name: '',
    username: '',
    bio: '',
    writing_sample: '',
    portfolio_url: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/membership/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess(true)
      } else {
        setError(data.error || 'Failed to submit request')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-secondary)] py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="rounded-full bg-[var(--color-success-light)] p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-[var(--color-success)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
            Request Submitted!
          </h2>
          <p className="text-[var(--color-text-secondary)] mb-6">
            Thank you for your interest in joining Inkhouse. We&apos;ll review your
            request and get back to you via email.
          </p>
          <Link
            href="/"
            className="text-[var(--color-link)] hover:text-[var(--color-link-hover)]"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-secondary)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
            Join Inkhouse
          </h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            Request to become a writer on our platform
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[var(--color-bg-card)] shadow-[var(--shadow-light)] rounded-lg p-6 space-y-6"
        >
          {error && (
            <div className="rounded-md bg-[var(--color-error-light)] p-4">
              <p className="text-sm text-[var(--color-error)]">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-[var(--color-text-secondary)]"
              >
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-[var(--color-border-medium)] px-3 py-2 text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] focus:border-[var(--color-link)] focus:ring-[var(--color-link)] focus:outline-none sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[var(--color-text-secondary)]"
              >
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-[var(--color-border-medium)] px-3 py-2 text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] focus:border-[var(--color-link)] focus:ring-[var(--color-link)] focus:outline-none sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-[var(--color-text-secondary)]"
            >
              Preferred Username *
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-[var(--color-border-medium)] bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] sm:text-sm">
                @
              </span>
              <input
                type="text"
                id="username"
                name="username"
                required
                pattern="[a-zA-Z0-9_]+"
                value={formData.username}
                onChange={handleChange}
                className="flex-1 block w-full rounded-none rounded-r-md border border-[var(--color-border-medium)] px-3 py-2 text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] focus:border-[var(--color-link)] focus:ring-[var(--color-link)] focus:outline-none sm:text-sm"
                placeholder="username"
              />
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Letters, numbers, and underscores only
            </p>
          </div>

          <div>
            <label
              htmlFor="bio"
              className="block text-sm font-medium text-[var(--color-text-secondary)]"
            >
              Short Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={2}
              value={formData.bio}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-[var(--color-border-medium)] px-3 py-2 text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] focus:border-[var(--color-link)] focus:ring-[var(--color-link)] focus:outline-none sm:text-sm"
              placeholder="Tell us a bit about yourself..."
            />
          </div>

          <div>
            <label
              htmlFor="writing_sample"
              className="block text-sm font-medium text-[var(--color-text-secondary)]"
            >
              Why do you want to join? *
            </label>
            <textarea
              id="writing_sample"
              name="writing_sample"
              rows={4}
              required
              value={formData.writing_sample}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-[var(--color-border-medium)] px-3 py-2 text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] focus:border-[var(--color-link)] focus:ring-[var(--color-link)] focus:outline-none sm:text-sm"
              placeholder="Share your motivation for joining and what you'd like to write about..."
            />
          </div>

          <div>
            <label
              htmlFor="portfolio_url"
              className="block text-sm font-medium text-[var(--color-text-secondary)]"
            >
              Portfolio or Website URL
            </label>
            <input
              type="url"
              id="portfolio_url"
              name="portfolio_url"
              value={formData.portfolio_url}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-[var(--color-border-medium)] px-3 py-2 text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] focus:border-[var(--color-link)] focus:ring-[var(--color-link)] focus:outline-none sm:text-sm"
              placeholder="https://..."
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <Link
              href="/"
              className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              ← Back to home
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-link)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-sm text-[var(--color-text-secondary)]">
          Already a member?{' '}
          <Link
            href="/login"
            className="font-medium text-[var(--color-link)] hover:text-[var(--color-link-hover)]"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
