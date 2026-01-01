'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { useReading } from '@/contexts/ReadingContext'
import { PenLine, LogIn, User, X, NotebookPen, Box, Glasses, Check, LayoutGrid, List as ListIcon, LogOut, ChevronDown } from 'lucide-react'
import ThemeToggle from '@/components/common/ThemeToggle'
import { ReadingFilter, ViewMode } from '@/types'

// Check if user can write posts (writers, admins, super_admins)
function canWritePosts(role?: string): boolean {
  if (!role) return false
  return ['super_admin', 'admin', 'writer'].includes(role)
}

export function Navbar() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const { filter, viewMode, setFilter, setViewMode } = useReading()
  const [showWelcome, setShowWelcome] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const welcomeShownRef = useRef(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  // Only show reading controls on homepage
  const showReadingControls = pathname === '/'

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

          {/* Mobile Desk link - visible for everyone on mobile */}
          <Link
            href="/desk"
            className="sm:hidden p-1.5 rounded-md text-[var(--color-link)] hover:text-[var(--color-link-hover)] hover:bg-[var(--color-bg-hover)] transition-colors"
          >
            <NotebookPen className="w-5 h-5" />
          </Link>

          <ThemeToggle />

          {isLoading ? (
            <div className="flex items-center space-x-4">
              <div className="w-20 h-5 bg-[var(--color-bg-tertiary)] rounded animate-pulse" />
              <div className="w-16 h-9 bg-[var(--color-bg-tertiary)] rounded-md animate-pulse" />
            </div>
          ) : isAuthenticated ? (
                <>
                  {/* Reading controls - compact filter icons (only on homepage) */}
                  {showReadingControls && (
                    <div className="hidden sm:flex items-center gap-0.5">
                      <button
                        onClick={() => setFilter(filter === 'unread' ? 'all' : 'unread')}
                        className={`relative group p-1.5 rounded-md transition-colors ${
                          filter === 'unread'
                            ? 'bg-[var(--color-link-hover)] text-white'
                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
                        }`}
                      >
                        <Glasses className="w-4 h-4" />
                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs bg-[var(--color-bg-card)] border border-[var(--color-border-light)] text-[var(--color-text-primary)] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md z-50">
                          Unread
                        </span>
                      </button>
                      <button
                        onClick={() => setFilter(filter === 'read' ? 'all' : 'read')}
                        className={`relative group p-1.5 rounded-md transition-colors ${
                          filter === 'read'
                            ? 'bg-[var(--color-link-hover)] text-white'
                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs bg-[var(--color-bg-card)] border border-[var(--color-border-light)] text-[var(--color-text-primary)] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md z-50">
                          Read
                        </span>
                      </button>
                      <button
                        onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                        className="relative group p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                      >
                        {viewMode === 'grid' ? <LayoutGrid className="w-4 h-4" /> : <ListIcon className="w-4 h-4" />}
                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs bg-[var(--color-bg-card)] border border-[var(--color-border-light)] text-[var(--color-text-primary)] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md z-50">
                          {viewMode === 'grid' ? 'Grid view' : 'List view'}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Profile dropdown */}
                  <div className="relative" ref={profileMenuRef}>
                    <button
                      onClick={() => setShowProfileMenu(!showProfileMenu)}
                      className="flex items-center text-[var(--color-text-secondary)] hover:text-[var(--color-link)] transition-colors cursor-pointer"
                    >
                      <User className="w-5 h-5 mr-1" />
                      <span className="hidden md:inline">{user?.display_name}</span>
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </button>

                    {/* Profile dropdown menu */}
                    {showProfileMenu && (
                      <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--color-bg-card)] border border-[var(--color-border-light)] rounded-lg shadow-lg z-50">
                        {/* User info - visible on mobile */}
                        <div className="px-4 py-3 border-b border-[var(--color-border-light)]">
                          <p className="text-sm font-medium text-[var(--color-text-primary)]">{user?.display_name}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">@{user?.username}</p>
                        </div>

                        {canWritePosts(user?.role) && (
                          <Link
                            href="/dashboard"
                            onClick={() => setShowProfileMenu(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                          >
                            <NotebookPen className="w-4 h-4" />
                            Dashboard
                          </Link>
                        )}
                        <Link
                          href="/boxes"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                        >
                          <Box className="w-4 h-4" />
                          My Boxes
                        </Link>
                        <div className="border-t border-[var(--color-border-light)]" />
                        <button
                          onClick={() => {
                            setShowProfileMenu(false)
                            logout()
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    )}
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
                              {canWritePosts(user?.role) ? (
                                <>
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
                                </>
                              ) : (
                                <>
                                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                                    Track your reading and save favorites.
                                  </p>
                                  <Link
                                    href="/boxes"
                                    className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-link)] hover:text-[var(--color-link-hover)] mt-2"
                                  >
                                    <Box className="w-3 h-3" />
                                    View my boxes
                                  </Link>
                                </>
                              )}
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

                  {/* Write button - only for writers/admins */}
                  {canWritePosts(user?.role) && (
                    <Link
                      href="/dashboard/new"
                      className="btn-primary inline-flex items-center px-4 py-2 rounded-md"
                    >
                      <PenLine className="w-4 h-4 mr-2" />
                      Write
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link
                    href="/signup"
                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  >
                    Read
                  </Link>
                  <Link
                    href="/join"
                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  >
                    Write
                  </Link>
                  <Link
                    href="/login"
                    className="btn-primary inline-flex items-center px-3 sm:px-4 py-2 rounded-md"
                  >
                    <LogIn className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Sign In</span>
                  </Link>
                </>
              )}
        </nav>
      </div>
    </header>

      {/* Mobile filter bar - only on homepage for logged in users */}
      {isAuthenticated && showReadingControls && (
        <div className="sm:hidden bg-[var(--color-bg-navbar)] border-b border-[var(--color-border-light)] px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilter(filter === 'unread' ? 'all' : 'unread')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  filter === 'unread'
                    ? 'bg-[var(--color-link)] text-white'
                    : 'text-[var(--color-text-muted)]'
                }`}
              >
                Unread
              </button>
              <button
                onClick={() => setFilter(filter === 'read' ? 'all' : 'read')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  filter === 'read'
                    ? 'bg-[var(--color-link)] text-white'
                    : 'text-[var(--color-text-muted)]'
                }`}
              >
                Read
              </button>
            </div>
            <button
              onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
              className="p-1.5 text-[var(--color-text-muted)]"
              title={viewMode === 'list' ? 'Show with images' : 'Compact view'}
            >
              {viewMode === 'list' ? <LayoutGrid className="w-4 h-4" /> : <ListIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
