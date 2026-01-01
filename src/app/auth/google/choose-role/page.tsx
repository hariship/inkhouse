'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, PenLine } from 'lucide-react'

interface GoogleUserData {
  googleId: string
  email: string
  name: string
  picture?: string
  timestamp: number
}

function ChooseRoleForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [userData, setUserData] = useState<GoogleUserData | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing token')
      return
    }

    try {
      const data = JSON.parse(Buffer.from(token, 'base64url').toString()) as GoogleUserData

      // Check if token is expired (10 minutes)
      if (Date.now() - data.timestamp > 10 * 60 * 1000) {
        setError('Session expired. Please try signing in again.')
        return
      }

      setUserData(data)
    } catch {
      setError('Invalid token format')
    }
  }, [token])

  const handleChooseRole = async (wantsToWrite: boolean) => {
    if (!userData || !token) return

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/google/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, wantsToWrite }),
      })

      const data = await response.json()

      if (data.success) {
        if (wantsToWrite && data.writerRequestSubmitted) {
          router.push('/?welcome=true&writer_request=pending')
        } else {
          router.push('/?welcome=true')
        }
      } else {
        setError(data.error || 'Something went wrong')
      }
    } catch {
      setError('Failed to create account. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-secondary)] py-12 px-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-4">
            Inkhouse
          </h1>
          <div className="rounded-md bg-[var(--color-error-light)] p-4 mb-6">
            <p className="text-sm text-[var(--color-error)]">{error}</p>
          </div>
          <Link
            href="/login"
            className="text-[var(--color-link)] hover:text-[var(--color-link-hover)]"
          >
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-secondary)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-button-primary)]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-secondary)] py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
            Inkhouse
          </h1>
          <h2 className="mt-6 text-2xl font-semibold text-[var(--color-text-primary)]">
            Welcome, {userData.name}!
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            No account found for {userData.email}. How would you like to join?
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => handleChooseRole(false)}
            disabled={isLoading}
            className="w-full flex items-center justify-between p-4 border-2 border-[var(--color-border-medium)] rounded-lg hover:border-[var(--color-link)] hover:bg-[var(--color-bg-hover)] transition-colors disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-[var(--color-bg-tertiary)]">
                <BookOpen className="w-6 h-6 text-[var(--color-link)]" />
              </div>
              <div className="text-left">
                <p className="font-medium text-[var(--color-text-primary)]">
                  I want to Read
                </p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Track your reading, save favorites
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleChooseRole(true)}
            disabled={isLoading}
            className="w-full flex items-center justify-between p-4 border-2 border-[var(--color-border-medium)] rounded-lg hover:border-[var(--color-link)] hover:bg-[var(--color-bg-hover)] transition-colors disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-[var(--color-bg-tertiary)]">
                <PenLine className="w-6 h-6 text-[var(--color-link)]" />
              </div>
              <div className="text-left">
                <p className="font-medium text-[var(--color-text-primary)]">
                  I want to Write
                </p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Start reading now, writer access after approval
                </p>
              </div>
            </div>
          </button>
        </div>

        {isLoading && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--color-button-primary)]"></div>
          </div>
        )}

        <div className="text-center">
          <Link
            href="/login"
            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ChooseRolePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-secondary)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-button-primary)]"></div>
        </div>
      }
    >
      <ChooseRoleForm />
    </Suspense>
  )
}
