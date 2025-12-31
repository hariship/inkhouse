'use client'

import { useState, useEffect } from 'react'
import { User } from '@/types'
import { User as UserIcon, Shield, Ban, LayoutGrid, List, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'

type ViewMode = 'grid' | 'list'

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function MembersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [searchQuery, setSearchQuery] = useState('')

  // Check if current user can modify target user
  const canModifyUser = (targetUser: User) => {
    // Super admins can modify anyone
    if (currentUser?.role === 'super_admin') return true
    // Admins cannot modify super_admins
    if (targetUser.role === 'super_admin') return false
    // Admins can modify everyone else
    return true
  }

  // Different limits per view mode
  const limit = viewMode === 'grid' ? 6 : 10

  const fetchUsers = async (pageNum: number, pageLimit: number) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/users?page=${pageNum}&limit=${pageLimit}`)
      const data = await response.json()
      if (data.success) {
        setUsers(data.data)
        setMeta(data.meta)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Reset to page 1 when view mode changes
  useEffect(() => {
    setPage(1)
  }, [viewMode])

  useEffect(() => {
    fetchUsers(page, limit)
  }, [page, limit])

  const handleUpdateRole = async (userId: string, role: 'admin' | 'writer') => {
    setProcessingId(userId)
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })

      if (response.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role } : u))
        )
      }
    } catch (error) {
      console.error('Failed to update role:', error)
    } finally {
      setProcessingId(null)
    }
  }

  const handleUpdateStatus = async (userId: string, status: 'active' | 'suspended') => {
    setProcessingId(userId)
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, status } : u))
        )
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setProcessingId(null)
    }
  }

  const renderAvatar = (user: User, size: 'sm' | 'lg' = 'sm') => {
    const sizeClasses = size === 'lg' ? 'w-16 h-16' : 'w-10 h-10'
    const iconSize = size === 'lg' ? 'w-8 h-8' : 'w-5 h-5'

    if (user.avatar_url) {
      return (
        <Image
          src={user.avatar_url}
          alt={user.display_name}
          width={size === 'lg' ? 64 : 40}
          height={size === 'lg' ? 64 : 40}
          className={`${sizeClasses} rounded-full object-cover`}
        />
      )
    }
    return (
      <div className={`${sizeClasses} rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center`}>
        <UserIcon className={`${iconSize} text-[var(--color-text-muted)]`} />
      </div>
    )
  }

  const renderActionButtons = (user: User) => {
    // If current user cannot modify this user, show empty space
    if (!canModifyUser(user)) {
      return <div className="flex space-x-1 w-16" /> // Same width to maintain alignment
    }

    return (
      <div className="flex space-x-1">
        <div className="relative group">
          <button
            onClick={() =>
              handleUpdateRole(user.id, user.role === 'admin' ? 'writer' : 'admin')
            }
            disabled={processingId === user.id}
            className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-info)] transition-colors"
          >
            <Shield className="w-4 h-4" />
          </button>
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {user.role === 'admin' ? 'Remove admin' : 'Make admin'}
          </span>
        </div>
        <div className="relative group">
          <button
            onClick={() =>
              handleUpdateStatus(user.id, user.status === 'active' ? 'suspended' : 'active')
            }
            disabled={processingId === user.id}
            className={`p-2 transition-colors ${
              user.status === 'active'
                ? 'text-[var(--color-text-muted)] hover:text-[var(--color-error)]'
                : 'text-[var(--color-error)] hover:text-[var(--color-success)]'
            }`}
          >
            <Ban className="w-4 h-4" />
          </button>
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {user.status === 'active' ? 'Suspend' : 'Activate'}
          </span>
        </div>
      </div>
    )
  }

  const renderBadges = (user: User) => (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`px-2 py-0.5 text-xs rounded-full ${
          user.role === 'admin'
            ? 'bg-[var(--color-role-admin-light)] text-[var(--color-role-admin)]'
            : 'bg-[var(--color-role-writer-light)] text-[var(--color-role-writer)]'
        }`}
      >
        {user.role}
      </span>
      <span
        className={`px-2 py-0.5 text-xs rounded-full ${
          user.status === 'active'
            ? 'bg-[var(--color-success-light)] text-[var(--color-success)]'
            : 'bg-[var(--color-error-light)] text-[var(--color-error)]'
        }`}
      >
        {user.status}
      </span>
    </div>
  )

  // Filter users by search query
  const filteredUsers = users.filter((user) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      user.display_name.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    )
  })

  const renderPagination = () => {
    if (meta.totalPages <= 1) return null

    return (
      <div className="flex items-center justify-between mt-6 px-2">
        <p className="text-sm text-[var(--color-text-muted)]">
          Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, meta.total)} of {meta.total}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-md border border-[var(--color-border-medium)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-[var(--color-text-secondary)] px-2">
            {page} / {meta.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            disabled={page === meta.totalPages}
            className="p-2 rounded-md border border-[var(--color-border-medium)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  if (isLoading && users.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-button-primary)]"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)]">
          Manage Members ({meta.total})
        </h1>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 w-40 sm:w-48 text-sm border border-[var(--color-border-medium)] rounded-md bg-[var(--color-bg-card)] text-[var(--color-text-primary)]"
            />
          </div>
          {/* View Toggle */}
          <div className="flex rounded-md border border-[var(--color-border-medium)] overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${
                viewMode === 'list'
                  ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]'
              }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${
                viewMode === 'grid'
                  ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="bg-[var(--color-bg-card)] rounded-lg shadow p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {renderAvatar(user, 'lg')}
                  <div>
                    <div className="font-medium text-[var(--color-text-primary)]">
                      {user.display_name}
                    </div>
                    <div className="text-sm text-[var(--color-text-muted)]">
                      @{user.username}
                    </div>
                  </div>
                </div>
                {renderActionButtons(user)}
              </div>
              <div className="flex items-center justify-between">
                {renderBadges(user)}
                <span className="text-xs text-[var(--color-text-muted)]">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View - Mobile Cards */}
      {viewMode === 'list' && (
        <>
          <div className="sm:hidden space-y-3">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="bg-[var(--color-bg-card)] rounded-lg shadow p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    {renderAvatar(user)}
                    <div className="ml-3">
                      <div className="font-medium text-[var(--color-text-primary)] text-sm">
                        {user.display_name}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        @{user.username}
                      </div>
                    </div>
                  </div>
                  {renderActionButtons(user)}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {renderBadges(user)}
                  <span className="text-xs text-[var(--color-text-muted)]">
                    Joined {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* List View - Desktop Table */}
          <div className="hidden sm:block bg-[var(--color-bg-card)] rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-[var(--color-border-light)]">
              <thead className="bg-[var(--color-bg-tertiary)]">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">
                    User
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">
                    Role
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">
                    Joined
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-[var(--color-text-muted)] uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-light)]">
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        {renderAvatar(user)}
                        <div className="ml-4">
                          <div className="font-medium text-[var(--color-text-primary)]">
                            {user.display_name}
                          </div>
                          <div className="text-sm text-[var(--color-text-muted)]">
                            @{user.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          user.role === 'admin'
                            ? 'bg-[var(--color-role-admin-light)] text-[var(--color-role-admin)]'
                            : 'bg-[var(--color-role-writer-light)] text-[var(--color-role-writer)]'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          user.status === 'active'
                            ? 'bg-[var(--color-success-light)] text-[var(--color-success)]'
                            : 'bg-[var(--color-error-light)] text-[var(--color-error)]'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-[var(--color-text-muted)]">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right text-sm">
                      <div className="flex justify-end">
                        {renderActionButtons(user)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Pagination */}
      {renderPagination()}
    </div>
  )
}
