'use client'

import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PenLine, FileText, User, LogOut, Home, Users, Settings } from 'lucide-react'
import ThemeToggle from '@/components/common/ThemeToggle'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  const isAdmin = user?.role === 'admin'

  const writerLinks = [
    { href: '/dashboard', label: 'My Posts', icon: FileText },
    { href: '/dashboard/new', label: 'New Post', icon: PenLine },
    { href: '/dashboard/profile', label: 'Profile', icon: User },
  ]

  const adminLinks = [
    { href: '/admin', label: 'Admin Dashboard', icon: Settings },
    { href: '/admin/requests', label: 'Requests', icon: Users },
    { href: '/admin/members', label: 'Members', icon: Users },
    { href: '/admin/posts', label: 'All Posts', icon: FileText },
  ]

  const handleLogout = async () => {
    await logout()
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-secondary)]">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-[var(--color-bg-card)] border-r border-[var(--color-border-light)]">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-[var(--color-border-light)] flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold text-[var(--color-text-primary)]">
                Inkhouse
              </span>
            </Link>
            <ThemeToggle />
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
                </Link>
              ))}
            </div>

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
                  </Link>
                ))}
              </div>
            )}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-[var(--color-border-light)]">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 px-3 py-2 w-full rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 min-h-screen">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
