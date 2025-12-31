'use client'

import { useState, useEffect } from 'react'
import { ApiKey, ApiKeyWithSecret } from '@/types'
import { Key, Plus, Copy, Check, Trash2, AlertTriangle, X } from 'lucide-react'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyExpiry, setNewKeyExpiry] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Created key modal state
  const [createdKey, setCreatedKey] = useState<ApiKeyWithSecret | null>(null)
  const [copied, setCopied] = useState(false)

  // Delete confirmation state
  const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchKeys = async () => {
    try {
      const response = await fetch('/api/api-keys')
      const data = await response.json()
      if (data.success) {
        setKeys(data.data)
      } else {
        setError(data.error)
      }
    } catch {
      setError('Failed to fetch API keys')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchKeys()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    setError('')

    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName,
          expires_in_days: newKeyExpiry,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setCreatedKey(data.data)
        setShowCreateModal(false)
        setNewKeyName('')
        setNewKeyExpiry(null)
        fetchKeys()
      } else {
        setError(data.error)
      }
    } catch {
      setError('Failed to create API key')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!keyToDelete) return
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/api-keys/${keyToDelete.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        setKeys((prev) => prev.filter((k) => k.id !== keyToDelete.id))
        setKeyToDelete(null)
      } else {
        setError(data.error)
      }
    } catch {
      setError('Failed to revoke API key')
    } finally {
      setIsDeleting(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatLastUsed = (dateString?: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(dateString)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-button-primary)]"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">
            API Keys
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Manage API keys for programmatic access to your posts
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary px-4 py-2 rounded-md inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Key
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 mb-6">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 mb-6">
        <p className="text-sm text-[var(--color-text-secondary)]">
          API keys allow you to access the Inkhouse API to manage your posts programmatically.
          See the{' '}
          <a href="/docs/api" className="text-[var(--color-link)] hover:underline">
            API documentation
          </a>{' '}
          for usage details.
        </p>
      </div>

      {/* Keys List */}
      {keys.length === 0 ? (
        <div className="text-center py-12 bg-[var(--color-bg-card)] rounded-lg">
          <Key className="w-12 h-12 mx-auto text-[var(--color-text-muted)] mb-4" />
          <p className="text-[var(--color-text-muted)]">No API keys yet</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Create your first API key to get started
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <div
              key={key.id}
              className={`bg-[var(--color-bg-card)] rounded-lg p-4 border ${
                key.status === 'revoked'
                  ? 'border-[var(--color-border-light)] opacity-60'
                  : 'border-[var(--color-border-light)]'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-[var(--color-text-muted)]" />
                    <span className="font-medium text-[var(--color-text-primary)]">
                      {key.name}
                    </span>
                    {key.status === 'revoked' && (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                        Revoked
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--color-text-muted)]">
                    <span className="font-mono">{key.key_prefix}</span>
                    <span>Created {formatDate(key.created_at)}</span>
                    <span>Last used: {formatLastUsed(key.last_used_at)}</span>
                    {key.expires_at && (
                      <span>
                        Expires {formatDate(key.expires_at)}
                      </span>
                    )}
                  </div>
                </div>
                {key.status === 'active' && (
                  <button
                    onClick={() => setKeyToDelete(key)}
                    className="text-[var(--color-error)] hover:bg-[var(--color-error-light)] p-2 rounded-md transition-colors"
                    title="Revoke key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-bg-card)] rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Create API Key
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Key Name
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  required
                  maxLength={100}
                  placeholder="e.g., Production App"
                  className="w-full px-4 py-2 border border-[var(--color-border-medium)] rounded-md text-[var(--color-text-primary)] bg-[var(--color-bg-card)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Expiration
                </label>
                <select
                  value={newKeyExpiry ?? ''}
                  onChange={(e) => setNewKeyExpiry(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-4 py-2 border border-[var(--color-border-medium)] rounded-md text-[var(--color-text-primary)] bg-[var(--color-bg-card)]"
                >
                  <option value="">No expiration</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                  <option value="365">1 year</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-[var(--color-border-medium)] rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newKeyName.trim()}
                  className="flex-1 btn-primary px-4 py-2 rounded-md disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Created Key Modal */}
      {createdKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-bg-card)] rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                API Key Created
              </h3>
              <button
                onClick={() => setCreatedKey(null)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg mb-4">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Copy this key now. You won&apos;t be able to see it again!
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                {createdKey.name}
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-[var(--color-bg-tertiary)] rounded-md font-mono text-sm text-[var(--color-text-primary)] break-all">
                  {createdKey.secret}
                </code>
                <button
                  onClick={() => copyToClipboard(createdKey.secret)}
                  className="p-2 border border-[var(--color-border-medium)] rounded-md hover:bg-[var(--color-bg-hover)] shrink-0"
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5 text-[var(--color-text-muted)]" />
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={() => setCreatedKey(null)}
              className="w-full btn-primary py-2 rounded-md"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!keyToDelete}
        title="Revoke API Key"
        message={`Are you sure you want to revoke "${keyToDelete?.name}"? This action cannot be undone and any applications using this key will lose access.`}
        confirmLabel={isDeleting ? 'Revoking...' : 'Revoke'}
        cancelLabel="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setKeyToDelete(null)}
        variant="danger"
      />
    </div>
  )
}
