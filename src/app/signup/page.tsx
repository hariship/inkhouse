'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password length
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          username,
          display_name: displayName,
          password,
        }),
      })

      const data = await response.json()

      if (data.success) {
        router.push('/?welcome=true')
      } else {
        setError(data.error || 'Signup failed')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-secondary)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-[var(--color-text-primary)]">
            Inkhouse
          </h1>
          <h2 className="mt-6 text-center text-2xl font-semibold text-[var(--color-text-primary)]">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-[var(--color-text-secondary)]">
            Join as a reader to track your reading and save posts
          </p>
        </div>

        <div className="mt-8">
          <a
            href="/api/auth/google?source=signup"
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-[var(--color-border-medium)] rounded-md bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors text-sm font-medium"
          >
            <span className="text-lg font-semibold">G</span>
            Sign up with Google
          </a>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--color-border-medium)]" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-[var(--color-bg-secondary)] px-4 text-[var(--color-text-muted)]">
              or sign up with email
            </span>
          </div>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-[var(--color-error-light)] p-4">
              <p className="text-sm text-[var(--color-error)]">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[var(--color-text-secondary)]"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-[var(--color-border-medium)] placeholder-[var(--color-text-muted)] text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] rounded-md focus:outline-none focus:ring-[var(--color-link)] focus:border-[var(--color-link)] sm:text-sm"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-[var(--color-text-secondary)]"
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-[var(--color-border-medium)] placeholder-[var(--color-text-muted)] text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] rounded-md focus:outline-none focus:ring-[var(--color-link)] focus:border-[var(--color-link)] sm:text-sm"
                placeholder="Choose a username (3-20 chars)"
              />
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Letters, numbers, and underscores only
              </p>
            </div>

            <div>
              <label
                htmlFor="displayName"
                className="block text-sm font-medium text-[var(--color-text-secondary)]"
              >
                Display Name
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                autoComplete="name"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-[var(--color-border-medium)] placeholder-[var(--color-text-muted)] text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] rounded-md focus:outline-none focus:ring-[var(--color-link)] focus:border-[var(--color-link)] sm:text-sm"
                placeholder="How you want to be called"
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
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-[var(--color-border-medium)] placeholder-[var(--color-text-muted)] text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] rounded-md focus:outline-none focus:ring-[var(--color-link)] focus:border-[var(--color-link)] sm:text-sm"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-[var(--color-text-secondary)]"
              >
                Confirm Password
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
                placeholder="Confirm your password"
              />
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
                  Creating account...
                </span>
              ) : (
                'Create account'
              )}
            </button>
          </div>

          <p className="text-center text-xs text-[var(--color-text-muted)]">
            Want to write on Inkhouse?{' '}
            <Link
              href="/join"
              className="font-medium text-[var(--color-link)] hover:text-[var(--color-link-hover)]"
            >
              Request to join as a writer
            </Link>
          </p>
        </form>

        <div className="text-center space-y-2">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-[var(--color-link)] hover:text-[var(--color-link-hover)]"
            >
              Sign in
            </Link>
          </p>
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
