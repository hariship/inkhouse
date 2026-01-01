'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [sessionExpired, setSessionExpired] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      setSessionExpired(true)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const result = await login(email, password)

    if (result.success) {
      const redirect = searchParams.get('redirect')
      router.push(redirect || '/?welcome=true')
    } else {
      setError(result.error || 'Login failed')
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-secondary)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-[var(--color-text-primary)]">
            Inkhouse
          </h1>
          <h2 className="mt-6 text-center text-2xl font-semibold text-[var(--color-text-primary)]">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-[var(--color-text-secondary)]">
            Or{' '}
            <Link
              href="/signup"
              className="font-medium text-[var(--color-link)] hover:text-[var(--color-link-hover)]"
            >
              sign up as a reader
            </Link>
            {' '}or{' '}
            <Link
              href="/join"
              className="font-medium text-[var(--color-link)] hover:text-[var(--color-link-hover)]"
            >
              request to join as a writer
            </Link>
          </p>
        </div>

        {sessionExpired && (
          <div className="rounded-md bg-[var(--color-warning-light)] p-4">
            <p className="text-sm text-[var(--color-warning)]">Your session has expired. Please sign in again.</p>
          </div>
        )}
        {error && (
          <div className="rounded-md bg-[var(--color-error-light)] p-4">
            <p className="text-sm text-[var(--color-error)]">{error}</p>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[var(--color-text-secondary)]"
              >
                Email or Username
              </label>
              <input
                id="email"
                name="email"
                type="text"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-[var(--color-border-medium)] placeholder-[var(--color-text-muted)] text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] rounded-md focus:outline-none focus:ring-[var(--color-link)] focus:border-[var(--color-link)] sm:text-sm"
                placeholder="Enter your email or username"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[var(--color-text-secondary)]"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-[var(--color-border-medium)] placeholder-[var(--color-text-muted)] text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] rounded-md focus:outline-none focus:ring-[var(--color-link)] focus:border-[var(--color-link)] sm:text-sm"
                placeholder="Enter your password"
              />
              <div className="mt-1 text-right">
                <Link
                  href="/forgot-password"
                  className="text-sm text-[var(--color-link)] hover:text-[var(--color-link-hover)]"
                >
                  Forgot password?
                </Link>
              </div>
            </div>
          </div>

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
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--color-border-medium)]" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-[var(--color-bg-secondary)] px-4 text-[var(--color-text-muted)]">
              or
            </span>
          </div>
        </div>

        <div>
          <a
            href="/api/auth/google?source=login"
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-[var(--color-border-medium)] rounded-md bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors text-sm font-medium"
          >
            <span className="text-lg font-semibold">G</span>
            Sign in with Google
          </a>
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
