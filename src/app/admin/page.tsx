'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Users, FileText, UserPlus, Mail } from 'lucide-react'

interface Stats {
  totalUsers: number
  totalPosts: number
  pendingRequests: number
  subscribers: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalPosts: 0,
    pendingRequests: 0,
    subscribers: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats')
        const data = await response.json()
        if (data.success) {
          setStats(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statCards = [
    {
      label: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      href: '/admin/members',
      color: 'bg-[var(--color-info)]',
    },
    {
      label: 'Total Posts',
      value: stats.totalPosts,
      icon: FileText,
      href: '/admin/posts',
      color: 'bg-[var(--color-success)]',
    },
    {
      label: 'Pending Requests',
      value: stats.pendingRequests,
      icon: UserPlus,
      href: '/admin/requests',
      color: 'bg-[var(--color-warning)]',
    },
    {
      label: 'Subscribers',
      value: stats.subscribers,
      icon: Mail,
      href: '#',
      color: 'bg-[var(--color-button-primary)]',
    },
  ]

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] mb-6 sm:mb-8">
        Admin Dashboard
      </h1>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-button-primary)]"></div>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
            {statCards.map((stat) => (
              <Link
                key={stat.label}
                href={stat.href}
                className="bg-[var(--color-bg-card)] rounded-lg shadow p-3 sm:p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center">
                  <div
                    className={`${stat.color} p-2 sm:p-3 rounded-lg text-white mr-2 sm:mr-4`}
                  >
                    <stat.icon className="w-4 h-4 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-3xl font-bold text-[var(--color-text-primary)]">
                      {stat.value}
                    </p>
                    <p className="text-xs sm:text-sm text-[var(--color-text-muted)]">
                      {stat.label}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="bg-[var(--color-bg-card)] rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-[var(--color-text-primary)] mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Link
                href="/admin/requests"
                className="p-3 sm:p-4 border border-[var(--color-border-light)] rounded-lg text-center hover:bg-[var(--color-bg-hover)]"
              >
                <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2 text-[var(--color-link)]" />
                <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
                  Review Requests
                </p>
              </Link>
              <Link
                href="/admin/members"
                className="p-3 sm:p-4 border border-[var(--color-border-light)] rounded-lg text-center hover:bg-[var(--color-bg-hover)]"
              >
                <Users className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2 text-[var(--color-link)]" />
                <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
                  Manage Members
                </p>
              </Link>
              <Link
                href="/admin/posts"
                className="p-3 sm:p-4 border border-[var(--color-border-light)] rounded-lg text-center hover:bg-[var(--color-bg-hover)]"
              >
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2 text-[var(--color-link)]" />
                <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
                  Moderate Posts
                </p>
              </Link>
              <Link
                href="/dashboard/new"
                className="p-3 sm:p-4 border border-[var(--color-border-light)] rounded-lg text-center hover:bg-[var(--color-bg-hover)]"
              >
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2 text-[var(--color-link)]" />
                <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
                  Write Post
                </p>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
