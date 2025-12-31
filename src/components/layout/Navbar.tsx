'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { PenLine, LogIn, User, X, NotebookPen } from 'lucide-react'
import ThemeToggle from '@/components/common/ThemeToggle'

export function Navbar() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [showWelcome, setShowWelcome] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const welcomeShownRef = useRef(false)

  useEffect(() => {
    if (searchParams.get('welcome') === 'true' && user && pathname === '/' && !welcomeShownRef.current) {
      welcomeShownRef.current = true
      setShowWelcome(true)
      // Clean URL without causing re-render issues
      window.history.replaceState({}, '', '/')
      const timer = setTimeout(() => setShowWelcome(false), 8000)
      return () => clearTimeout(timer)
    }
  }, [searchParams, user, pathname])

  return (
    <>
      <header className="bg-[var(--color-bg-navbar)] border-b border-[var(--color-border-light)]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Inkhouse"
            width={80}
            height={80}
            className="h-20 w-20 -my-4 dark:hidden"
            priority
          />
          <Image
            src="/logo-dark.png"
            alt="Inkhouse"
            width={80}
            height={80}
            className="h-20 w-20 -my-4 hidden dark:block"
            priority
          />
          <span className="hidden sm:block text-2xl font-bold text-[var(--color-text-primary)]">
            Inkhouse
          </span>
        </Link>

        <nav className="flex items-center space-x-4">
          <Link
            href="/desk"
            className="hidden sm:flex items-center px-3 py-1.5 rounded-full bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors relative group"
          >
            <NotebookPen className="w-4 h-4 mr-1.5 text-[var(--color-link)]" />
            <span className="font-medium">Desk</span>
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs bg-[var(--color-bg-card)] border border-[var(--color-border-light)] text-[var(--color-text-primary)] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md">
              Behind the ink
            </span>
          </Link>

          <ThemeToggle />

          {isLoading ? (
            <div className="flex items-center space-x-4">
              <div className="w-20 h-5 bg-[var(--color-bg-tertiary)] rounded animate-pulse" />
              <div className="w-16 h-9 bg-[var(--color-bg-tertiary)] rounded-md animate-pulse" />
            </div>
          ) : isAuthenticated ? (
                <>
                  <div className="relative">
                    <Link
                      href="/dashboard"
                      className="flex items-center text-[var(--color-text-secondary)] hover:text-[#0D9488] transition-colors cursor-pointer"
                    >
                      <User className="w-5 h-5 mr-1" />
                      {user?.display_name}
                    </Link>
                    {/* Welcome Tooltip */}
                    {showWelcome && (
                      <div className="absolute top-full right-0 mt-2 z-50">
                        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-medium)] rounded-lg shadow-lg p-3 w-64">
                          <div className="absolute -top-2 right-4 w-3 h-3 bg-[var(--color-bg-card)] border-l border-t border-[var(--color-border-medium)] transform rotate-45"></div>
                          <div className="flex items-start gap-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                                Welcome back!
                              </p>
                              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                                Ready to write? Create a new post.
                              </p>
                              <Link
                                href="/dashboard/new"
                                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-link)] hover:text-[var(--color-link-hover)] mt-2"
                              >
                                <PenLine className="w-3 h-3" />
                                Create a post
                              </Link>
                            </div>
                            <button
                              onClick={() => setShowWelcome(false)}
                              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <Link
                    href="/dashboard/new"
                    className="btn-primary inline-flex items-center px-4 py-2 rounded-md"
                  >
                    <PenLine className="w-4 h-4 mr-2" />
                    Write
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/join"
                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  >
                    Join
                  </Link>
                  <Link
                    href="/login"
                    className="btn-primary inline-flex items-center px-4 py-2 rounded-md"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </Link>
                </>
              )}
        </nav>
      </div>
    </header>
    </>
  )
}
