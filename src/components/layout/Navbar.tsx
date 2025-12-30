'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { PenLine, LogIn, User } from 'lucide-react'
import ThemeToggle from '@/components/common/ThemeToggle'

export function Navbar() {
  const { user, isAuthenticated, isLoading } = useAuth()

  return (
    <header className="bg-[var(--color-bg-primary)] border-b border-[var(--color-border-light)]">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link
          href="/"
          className="text-2xl font-bold text-[var(--color-text-primary)]"
        >
          Inkhouse
        </Link>

        <nav className="flex items-center space-x-4">
          <ThemeToggle />

          {!isLoading && (
            <>
              {isAuthenticated ? (
                <>
                  <Link
                    href="/dashboard"
                    className="flex items-center text-[var(--color-text-secondary)] hover:text-[#0D9488] transition-colors cursor-pointer"
                  >
                    <User className="w-5 h-5 mr-1" />
                    {user?.display_name}
                  </Link>
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
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
