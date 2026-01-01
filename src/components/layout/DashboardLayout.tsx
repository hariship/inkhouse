'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { PenLine, FileText, User, LogOut, Home, Users, Settings, Menu, X, Key, NotebookPen, Lightbulb } from 'lucide-react'
import ThemeToggle from '@/components/common/ThemeToggle'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

interface DashboardLayoutProps {
  children: React.ReactNode
}

// Feature tooltip expiry: 5 days from first release
const API_KEYS_FEATURE_DATE = new Date('2025-12-31').getTime()
const SUGGESTIONS_FEATURE_DATE = new Date('2026-01-05').getTime()
const TOOLTIP_DURATION_MS = 5 * 24 * 60 * 60 * 1000 // 5 days

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showApiKeysTooltip, setShowApiKeysTooltip] = useState(false)
  const [showSuggestionsTooltip, setShowSuggestionsTooltip] = useState(false)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const isSuperAdmin = user?.role === 'super_admin'

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // Show "New" badges for 5 days after feature release
  useEffect(() => {
    const now = Date.now()
    if (now < API_KEYS_FEATURE_DATE + TOOLTIP_DURATION_MS) {
      setShowApiKeysTooltip(true)
    }
    if (now < SUGGESTIONS_FEATURE_DATE + TOOLTIP_DURATION_MS) {
      setShowSuggestionsTooltip(true)
    }
  }, [])

  // Fetch pending requests count for admins
  useEffect(() => {
    const fetchPendingCount = async () => {
      if (!isAdmin) return
      try {
        const response = await fetch('/api/membership/requests?status=pending&count_only=true')
        const data = await response.json()
        if (data.success) {
          setPendingRequestsCount(data.count || 0)
        }
      } catch (err) {
        console.error('Failed to fetch pending requests count:', err)
      }
    }
    fetchPendingCount()
    // Refetch when pathname changes (e.g., after approving/rejecting)
    const interval = setInterval(fetchPendingCount, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [isAdmin, pathname])

  const writerLinks = [
    { href: '/dashboard', label: 'My Posts', icon: FileText },
    { href: '/dashboard/new', label: 'New Post', icon: PenLine },
    { href: '/dashboard/suggestions', label: 'Suggestions', icon: Lightbulb },
    { href: '/dashboard/api-keys', label: 'API Keys', icon: Key },
    { href: '/dashboard/profile', label: 'Profile', icon: User },
  ]

  const adminLinks = [
    { href: '/admin', label: 'Admin Dashboard', icon: Settings },
    { href: '/admin/requests', label: 'Requests', icon: Users },
    { href: '/admin/members', label: 'Members', icon: Users },
    { href: '/admin/posts', label: 'All Posts', icon: FileText },
  ]

  const superAdminLinks = [
    { href: '/dashboard/desk', label: 'From the Desk', icon: NotebookPen },
  ]

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true)
  }

  const handleLogoutConfirm = async () => {
    setShowLogoutConfirm(false)
    await logout()
    window.location.href = '/'
  }

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false)
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-secondary)]">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[var(--color-bg-card)] border-b border-[var(--color-border-light)] flex items-center justify-between px-4 z-40">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          <Menu className="w-6 h-6" />
        </button>
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Inkhouse"
            width={40}
            height={40}
            className="h-10 w-10 dark:hidden"
          />
          <Image
            src="/logo-dark.png"
            alt="Inkhouse"
            width={40}
            height={40}
            className="h-10 w-10 hidden dark:block"
          />
        </Link>
        <ThemeToggle />
      </header>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-[var(--color-bg-card)] border-r border-[var(--color-border-light)] z-50 transform transition-transform duration-200 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-[var(--color-border-light)] flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="Inkhouse"
                width={36}
                height={36}
                className="h-9 w-9 dark:hidden"
              />
              <Image
                src="/logo-dark.png"
                alt="Inkhouse"
                width={36}
                height={36}
                className="h-9 w-9 hidden dark:block"
              />
              <span className="text-xl font-bold text-[var(--color-text-primary)]">
                Inkhouse
              </span>
            </Link>
            <div className="flex items-center space-x-2">
              <ThemeToggle />
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* User info */}
          <div className="p-4 border-b border-[var(--color-border-light)]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                <span className="text-[var(--color-link)] font-medium">
                  {user?.display_name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-[var(--color-text-primary)] text-sm">
                  {user?.display_name}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  @{user?.username}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <Link
              href="/"
              className="flex items-center space-x-3 px-3 py-2 rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
            >
              <Home className="w-5 h-5" />
              <span>View Site</span>
            </Link>

            <div className="pt-4">
              <p className="px-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                Writer
              </p>
              {writerLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md mt-1 ${
                    pathname === link.href
                      ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-link)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
                  }`}
                >
                  <link.icon className="w-5 h-5" />
                  <span>{link.label}</span>
                  {link.href === '/dashboard/api-keys' && showApiKeysTooltip && (
                    <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-cyan-800 text-white font-medium">
                      New
                    </span>
                  )}
                  {link.href === '/dashboard/suggestions' && showSuggestionsTooltip && (
                    <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-cyan-800 text-white font-medium">
                      New
                    </span>
                  )}
                </Link>
              ))}
            </div>

            {isSuperAdmin && (
              <div className="pt-4">
                <p className="px-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                  Super Admin
                </p>
                {superAdminLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-md mt-1 ${
                      pathname === link.href || pathname.startsWith(link.href + '/')
                        ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-link)]'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
                    }`}
                  >
                    <link.icon className="w-5 h-5" />
                    <span>{link.label}</span>
                  </Link>
                ))}
              </div>
            )}

            {isAdmin && (
              <div className="pt-4">
                <p className="px-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                  Admin
                </p>
                {adminLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-md mt-1 ${
                      pathname === link.href
                        ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-link)]'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
                    }`}
                  >
                    <link.icon className="w-5 h-5" />
                    <span>{link.label}</span>
                    {link.href === '/admin/requests' && pendingRequestsCount > 0 && (
                      <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-cyan-800 text-white font-medium">
                        {pendingRequestsCount}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-[var(--color-border-light)]">
            <button
              onClick={handleLogoutClick}
              className="flex items-center space-x-3 px-3 py-2 w-full rounded-md text-[var(--color-error)] hover:bg-[var(--color-error-light)] transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmLabel="Logout"
        cancelLabel="Cancel"
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
        variant="danger"
      />

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen pt-14 lg:pt-0 bg-[var(--color-bg-tertiary)]">
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
