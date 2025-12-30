'use client'

import { useState, useEffect } from 'react'
import { User } from '@/types'
import { User as UserIcon, Shield, Ban } from 'lucide-react'
import Image from 'next/image'

export default function MembersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users')
        const data = await response.json()
        if (data.success) {
          setUsers(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch users:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [])

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

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-button-primary)]"></div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] mb-6">
        Manage Members ({users.length})
      </h1>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-3">
        {users.map((user) => (
          <div
            key={user.id}
            className="bg-[var(--color-bg-card)] rounded-lg shadow p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                {user.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt={user.display_name}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-[var(--color-text-muted)]" />
                  </div>
                )}
                <div className="ml-3">
                  <div className="font-medium text-[var(--color-text-primary)] text-sm">
                    {user.display_name}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    @{user.username}
                  </div>
                </div>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() =>
                    handleUpdateRole(
                      user.id,
                      user.role === 'admin' ? 'writer' : 'admin'
                    )
                  }
                  disabled={processingId === user.id}
                  className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-info)]"
                >
                  <Shield className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    handleUpdateStatus(
                      user.id,
                      user.status === 'active' ? 'suspended' : 'active'
                    )
                  }
                  disabled={processingId === user.id}
                  className={`p-2 ${
                    user.status === 'active'
                      ? 'text-[var(--color-text-muted)] hover:text-[var(--color-error)]'
                      : 'text-[var(--color-error)] hover:text-[var(--color-success)]'
                  }`}
                >
                  <Ban className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${
                  user.role === 'admin'
                    ? 'bg-[var(--color-info-light)] text-[var(--color-info)]'
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
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
              <span className="text-xs text-[var(--color-text-muted)]">
                Joined {new Date(user.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block bg-[var(--color-bg-card)] rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-[var(--color-border-light)]">
          <thead className="bg-[var(--color-bg-tertiary)]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-muted)] uppercase">
                Joined
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-text-muted)] uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-light)]">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {user.avatar_url ? (
                      <Image
                        src={user.avatar_url}
                        alt={user.display_name}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-[var(--color-text-muted)]" />
                      </div>
                    )}
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
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      user.role === 'admin'
                        ? 'bg-[var(--color-info-light)] text-[var(--color-info)]'
                        : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      user.status === 'active'
                        ? 'bg-[var(--color-success-light)] text-[var(--color-success)]'
                        : 'bg-[var(--color-error-light)] text-[var(--color-error)]'
                    }`}
                  >
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-muted)]">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() =>
                        handleUpdateRole(
                          user.id,
                          user.role === 'admin' ? 'writer' : 'admin'
                        )
                      }
                      disabled={processingId === user.id}
                      className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-info)]"
                      title={user.role === 'admin' ? 'Remove admin' : 'Make admin'}
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        handleUpdateStatus(
                          user.id,
                          user.status === 'active' ? 'suspended' : 'active'
                        )
                      }
                      disabled={processingId === user.id}
                      className={`p-2 ${
                        user.status === 'active'
                          ? 'text-[var(--color-text-muted)] hover:text-[var(--color-error)]'
                          : 'text-[var(--color-error)] hover:text-[var(--color-success)]'
                      }`}
                      title={user.status === 'active' ? 'Suspend' : 'Activate'}
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
