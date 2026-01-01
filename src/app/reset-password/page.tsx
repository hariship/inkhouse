'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } else {
        setError(data.error || 'Something went wrong')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-secondary)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <h1 className="text-center text-3xl font-bold text-[var(--color-text-primary)]">
              Inkhouse
            </h1>
            <h2 className="mt-6 text-center text-2xl font-semibold text-[var(--color-text-primary)]">
              Invalid reset link
            </h2>
          </div>

          <div className="rounded-md bg-[var(--color-error-light)] p-4">
            <p className="text-sm text-[var(--color-error)]">
              This password reset link is invalid or has expired.
            </p>
          </div>

          <div className="text-center">
            <Link
              href="/forgot-password"
              className="text-sm text-[var(--color-link)] hover:text-[var(--color-link-hover)]"
            >
              Request a new reset link
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-secondary)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <h1 className="text-center text-3xl font-bold text-[var(--color-text-primary)]">
              Inkhouse
            </h1>
            <h2 className="mt-6 text-center text-2xl font-semibold text-[var(--color-text-primary)]">
              Password updated!
            </h2>
          </div>

          <div className="rounded-md bg-[var(--color-success-light)] p-4">
            <p className="text-sm text-[var(--color-success)]">
              Your password has been reset successfully. Redirecting to login...
            </p>
          </div>

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-[var(--color-link)] hover:text-[var(--color-link-hover)]"
            >
              Go to login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-secondary)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-[var(--color-text-primary)]">
            Inkhouse
          </h1>
          <h2 className="mt-6 text-center text-2xl font-semibold text-[var(--color-text-primary)]">
            Create new password
          </h2>
          <p className="mt-2 text-center text-sm text-[var(--color-text-secondary)]">
            Enter your new password below.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-[var(--color-error-light)] p-4">
              <p className="text-sm text-[var(--color-error)]">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[var(--color-text-secondary)]"
              >
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-[var(--color-border-medium)] placeholder-[var(--color-text-muted)] text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] rounded-md focus:outline-none focus:ring-[var(--color-link)] focus:border-[var(--color-link)] sm:text-sm"
                placeholder="Enter new password"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-[var(--color-text-secondary)]"
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-[var(--color-border-medium)] placeholder-[var(--color-text-muted)] text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] rounded-md focus:outline-none focus:ring-[var(--color-link)] focus:border-[var(--color-link)] sm:text-sm"
                placeholder="Confirm new password"
              />
            </div>
          </div>

          <p className="text-xs text-[var(--color-text-muted)]">
            Password must be at least 8 characters long.
          </p>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-link)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Updating...
                </span>
              ) : (
                'Reset password'
              )}
            </button>
          </div>
        </form>

        <div className="text-center">
          <Link
            href="/login"
            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            ← Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-secondary)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-button-primary)]"></div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
