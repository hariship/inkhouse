'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { PenLine } from 'lucide-react'

export default function BecomeWriterPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [writingSample, setWritingSample] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasPendingRequest, setHasPendingRequest] = useState(false)
  const [checkingRequest, setCheckingRequest] = useState(true)

  // Redirect if not authenticated or not a reader
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login')
      } else if (user?.role !== 'reader') {
        router.push('/dashboard')
      }
    }
  }, [authLoading, isAuthenticated, user, router])

  // Check for existing pending request
  useEffect(() => {
    const checkPendingRequest = async () => {
      if (!user) return
      try {
        const response = await fetch('/api/membership/request/status')
        const data = await response.json()
        if (data.success && data.data?.status === 'pending') {
          setHasPendingRequest(true)
        }
      } catch (err) {
        console.error('Failed to check request status:', err)
      } finally {
        setCheckingRequest(false)
      }
    }
    if (user) {
      checkPendingRequest()
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/membership/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          writing_sample: writingSample,
          portfolio_url: portfolioUrl || undefined,
        }),
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

  if (authLoading || checkingRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-secondary)]">
        <div className="animate-pulse text-[var(--color-text-muted)]">Loading...</div>
      </div>
    )
  }

  if (hasPendingRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-secondary)] py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="rounded-full bg-[var(--color-warning-light)] p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <PenLine className="w-8 h-8 text-[var(--color-warning)]" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
            Request Pending
          </h2>
          <p className="text-[var(--color-text-secondary)] mb-6">
            You already have a pending request to become a writer. We&apos;ll review it and get back to you via email.
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
            Thank you for your interest in becoming a writer. We&apos;ll review your
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
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="rounded-full bg-[var(--color-link-hover)] p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <PenLine className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
            Become a Writer
          </h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            Hi {user?.display_name}! Ready to share your stories?
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

          <div className="bg-[var(--color-bg-tertiary)] rounded-md p-4">
            <p className="text-sm text-[var(--color-text-secondary)]">
              <strong className="text-[var(--color-text-primary)]">Your account:</strong>{' '}
              @{user?.username} ({user?.email})
            </p>
          </div>

          <div>
            <label
              htmlFor="writing_sample"
              className="block text-sm font-medium text-[var(--color-text-secondary)]"
            >
              Why do you want to become a writer? *
            </label>
            <textarea
              id="writing_sample"
              name="writing_sample"
              rows={5}
              required
              value={writingSample}
              onChange={(e) => setWritingSample(e.target.value)}
              className="mt-1 block w-full rounded-md border border-[var(--color-border-medium)] px-3 py-2 text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] focus:border-[var(--color-link)] focus:ring-[var(--color-link)] focus:outline-none sm:text-sm"
              placeholder="Share your motivation and what you'd like to write about..."
            />
          </div>

          <div>
            <label
              htmlFor="portfolio_url"
              className="block text-sm font-medium text-[var(--color-text-secondary)]"
            >
              Portfolio or Website URL (optional)
            </label>
            <input
              type="url"
              id="portfolio_url"
              name="portfolio_url"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
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
              disabled={isLoading || !writingSample.trim()}
              className="btn-primary inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-link)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PenLine className="w-4 h-4 mr-2" />
              {isLoading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
