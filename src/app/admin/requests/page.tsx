'use client'

import { useState, useEffect } from 'react'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { MembershipRequest } from '@/types'
import Link from 'next/link'
import { X, Copy, Check } from 'lucide-react'

function RequestsContent() {
  const [requests, setRequests] = useState<MembershipRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [approvalModal, setApprovalModal] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchRequests = async () => {
    try {
      const response = await fetch(`/api/membership/requests?status=${statusFilter}`)
      const data = await response.json()
      if (data.success) {
        setRequests(data.data)
      } else {
        setError(data.error)
      }
    } catch {
      setError('Failed to fetch requests')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [statusFilter])

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setProcessingId(id)
    try {
      const response = await fetch(`/api/membership/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      const data = await response.json()

      if (data.success) {
        // Remove from list
        setRequests((prev) => prev.filter((r) => r.id !== id))
        if (action === 'approve' && data.tempPassword) {
          const request = requests.find(r => r.id === id)
          setApprovalModal({ email: request?.email || '', password: data.tempPassword })
          setCopied(false)
        }
      } else {
        alert(data.error || 'Failed to process request')
      }
    } catch {
      alert('Network error')
    } finally {
      setProcessingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-button-primary)]"></div>
      </div>
    )
  }

  const handleCopy = async () => {
    if (approvalModal) {
      await navigator.clipboard.writeText(approvalModal.password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Approval Success Modal */}
      {approvalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-bg-card)] rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                User Approved
              </h3>
              <button
                onClick={() => setApprovalModal(null)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[var(--color-text-secondary)] mb-4">
              The user has been approved. Share these credentials with them:
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-[var(--color-text-muted)]">Email</label>
                <p className="text-[var(--color-text-primary)] font-medium">{approvalModal.email}</p>
              </div>

              <div>
                <label className="text-sm text-[var(--color-text-muted)]">Temporary Password</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 bg-[var(--color-bg-tertiary)] px-3 py-2 rounded text-[var(--color-text-primary)] font-mono">
                    {approvalModal.password}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="p-2 bg-[var(--color-bg-tertiary)] rounded hover:bg-[var(--color-bg-hover)]"
                    title="Copy password"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-[var(--color-success)]" />
                    ) : (
                      <Copy className="w-5 h-5 text-[var(--color-text-secondary)]" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-sm text-[var(--color-text-muted)] mt-4">
              The user should change this password after their first login.
            </p>

            <button
              onClick={() => setApprovalModal(null)}
              className="mt-6 w-full btn-primary py-2 rounded-md"
            >
              Done
            </button>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Membership Requests
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            Review and manage join requests
          </p>
        </div>
        <Link
          href="/admin"
          className="text-[var(--color-link)] hover:text-[var(--color-link)]"
        >
          Back to Admin
        </Link>
      </div>

      <div className="mb-6">
        <div className="flex space-x-2">
          {['pending', 'approved', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                statusFilter === status
                  ? 'btn-primary'
                  : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 mb-6">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="text-center py-12 bg-[var(--color-bg-card)] rounded-lg">
          <p className="text-[var(--color-text-muted)]">
            No {statusFilter} requests found
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="bg-[var(--color-bg-card)] rounded-lg shadow p-6"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
                      {request.name}
                    </h3>
                    <span className="text-sm text-[var(--color-text-muted)]">
                      @{request.username}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                    {request.email}
                  </p>
                  {request.bio && (
                    <p className="text-[var(--color-text-secondary)] mt-2">
                      {request.bio}
                    </p>
                  )}
                  <div className="mt-3">
                    <h4 className="text-sm font-medium text-[var(--color-text-secondary)]">
                      Why they want to join:
                    </h4>
                    <p className="text-[var(--color-text-secondary)] mt-1">
                      {request.writing_sample}
                    </p>
                  </div>
                  {request.portfolio_url && (
                    <a
                      href={request.portfolio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-link)] hover:text-[var(--color-link)] text-sm mt-2 inline-block"
                    >
                      View Portfolio
                    </a>
                  )}
                  <p className="text-xs text-[var(--color-text-muted)] mt-3">
                    Submitted {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>

                {statusFilter === 'pending' && (
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleAction(request.id, 'approve')}
                      disabled={processingId === request.id}
                      className="px-4 py-2 bg-[var(--color-success)] text-white rounded-md hover:opacity-80 disabled:opacity-50 text-sm"
                    >
                      {processingId === request.id ? '...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleAction(request.id, 'reject')}
                      disabled={processingId === request.id}
                      className="px-4 py-2 bg-[var(--color-error)] text-white rounded-md hover:opacity-80 disabled:opacity-50 text-sm"
                    >
                      {processingId === request.id ? '...' : 'Reject'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminRequestsPage() {
  return (
    <AuthGuard requiredRole="admin">
      <RequestsContent />
    </AuthGuard>
  )
}
