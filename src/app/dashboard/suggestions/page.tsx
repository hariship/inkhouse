'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { SuggestionWithAuthor, FeatureUpdate } from '@/types'
import { Lightbulb, Plus, X, Trash2, Check, Ban, Megaphone, Sparkles, Wrench, Bug } from 'lucide-react'

type MainTab = 'suggestions' | 'updates'
type FilterType = 'all' | 'mine' | 'shipped'

export default function SuggestionsPage() {
  const { user } = useAuth()
  const [mainTab, setMainTab] = useState<MainTab>('suggestions')

  // Suggestions state
  const [suggestions, setSuggestions] = useState<SuggestionWithAuthor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [totalWriters, setTotalWriters] = useState(0)
  const [threshold, setThreshold] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [votingId, setVotingId] = useState<string | null>(null)

  // Updates state
  const [updates, setUpdates] = useState<FeatureUpdate[]>([])
  const [updatesLoading, setUpdatesLoading] = useState(true)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [updateTitle, setUpdateTitle] = useState('')
  const [updateDescription, setUpdateDescription] = useState('')
  const [updateCategory, setUpdateCategory] = useState<'new' | 'improved' | 'fixed'>('new')
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false)

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const isSuperAdmin = user?.role === 'super_admin'

  // Fetch suggestions
  const fetchSuggestions = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filter === 'mine') params.set('filter', 'mine')
      if (filter === 'shipped') params.set('status', 'shipped')

      const response = await fetch(`/api/suggestions?${params}`)
      const data = await response.json()
      if (data.success) {
        setSuggestions(data.data)
        setTotalWriters(data.meta?.total_writers || 0)
        setThreshold(data.meta?.threshold || 0)
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error)
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  // Fetch updates
  const fetchUpdates = useCallback(async () => {
    try {
      const response = await fetch('/api/feature-updates')
      const data = await response.json()
      if (data.success) {
        setUpdates(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch updates:', error)
    } finally {
      setUpdatesLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions])

  useEffect(() => {
    if (mainTab === 'updates') {
      fetchUpdates()
    }
  }, [mainTab, fetchUpdates])

  const handleVote = async (id: string) => {
    if (votingId) return
    setVotingId(id)

    try {
      const response = await fetch(`/api/suggestions/${id}/vote`, { method: 'POST' })
      const data = await response.json()

      if (data.success) {
        setSuggestions(prev => prev.map(s =>
          s.id === id
            ? { ...s, vote_count: data.data.vote_count, has_voted: data.data.has_voted }
            : s
        ))
      }
    } catch (error) {
      console.error('Failed to vote:', error)
    } finally {
      setVotingId(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), description: newDescription.trim() })
      })
      const data = await response.json()

      if (data.success) {
        setSuggestions(prev => [data.data, ...prev])
        setNewTitle('')
        setNewDescription('')
        setShowModal(false)
      } else {
        alert(data.error || 'Failed to submit suggestion')
      }
    } catch (error) {
      console.error('Failed to submit:', error)
      alert('Failed to submit suggestion')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this suggestion?')) return

    try {
      const response = await fetch(`/api/suggestions/${id}`, { method: 'DELETE' })
      if (response.ok) {
        setSuggestions(prev => prev.filter(s => s.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  const handleStatusChange = async (id: string, status: 'shipped' | 'closed') => {
    try {
      const response = await fetch(`/api/suggestions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      const data = await response.json()

      if (data.success) {
        setSuggestions(prev => prev.map(s =>
          s.id === id ? { ...s, status } : s
        ))
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!updateTitle.trim() || isSubmittingUpdate) return

    setIsSubmittingUpdate(true)
    try {
      const response = await fetch('/api/feature-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: updateTitle.trim(),
          description: updateDescription.trim(),
          category: updateCategory,
        })
      })
      const data = await response.json()

      if (data.success) {
        setUpdates(prev => [data.data, ...prev])
        setUpdateTitle('')
        setUpdateDescription('')
        setUpdateCategory('new')
        setShowUpdateModal(false)
      } else {
        alert(data.error || 'Failed to create update')
      }
    } catch (error) {
      console.error('Failed to create update:', error)
      alert('Failed to create update')
    } finally {
      setIsSubmittingUpdate(false)
    }
  }

  const handleDeleteUpdate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this update?')) return

    try {
      const response = await fetch(`/api/feature-updates/${id}`, { method: 'DELETE' })
      if (response.ok) {
        setUpdates(prev => prev.filter(u => u.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete update:', error)
    }
  }

  const getPercentage = (voteCount: number) => {
    if (totalWriters === 0) return 0
    return Math.round((voteCount / totalWriters) * 100)
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'new': return <Sparkles className="w-3 h-3" />
      case 'improved': return <Wrench className="w-3 h-3" />
      case 'fixed': return <Bug className="w-3 h-3" />
      default: return null
    }
  }

  const getCategoryStyle = (category: string) => {
    switch (category) {
      case 'new': return 'bg-cyan-700 dark:bg-cyan-900 text-white'
      case 'improved': return 'bg-teal-700 dark:bg-teal-900 text-white'
      case 'fixed': return 'bg-slate-600 dark:bg-slate-800 text-white'
      default: return ''
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">
            Notice Board
          </h1>
          <p className="text-sm sm:text-base text-[var(--color-text-secondary)]">
            {mainTab === 'suggestions'
              ? `Vote on ideas to improve Inkhouse (${threshold} votes for 50%)`
              : 'Recent feature updates and improvements'}
          </p>
        </div>
        {mainTab === 'suggestions' && (
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary inline-flex items-center justify-center px-3 sm:px-4 py-2 rounded-md text-sm sm:text-base w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Suggestion
          </button>
        )}
        {mainTab === 'updates' && isSuperAdmin && (
          <button
            onClick={() => setShowUpdateModal(true)}
            className="btn-primary inline-flex items-center justify-center px-3 sm:px-4 py-2 rounded-md text-sm sm:text-base w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Update
          </button>
        )}
      </div>

      {/* Main Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[var(--color-border-light)]">
        <button
          onClick={() => setMainTab('suggestions')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            mainTab === 'suggestions'
              ? 'border-[var(--color-link)] text-[var(--color-link)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <Lightbulb className="w-4 h-4 inline mr-2" />
          Suggestions
        </button>
        <button
          onClick={() => setMainTab('updates')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            mainTab === 'updates'
              ? 'border-[var(--color-link)] text-[var(--color-link)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <Megaphone className="w-4 h-4 inline mr-2" />
          Updates
          <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-cyan-800 text-white font-medium">
            New
          </span>
        </button>
      </div>

      {/* Suggestions Tab */}
      {mainTab === 'suggestions' && (
        <>
          {/* Filters */}
          <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
            {([
              { key: 'all', label: 'All' },
              { key: 'mine', label: 'My Suggestions' },
              { key: 'shipped', label: 'Shipped' }
            ] as const).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap ${
                  filter === f.key
                    ? 'btn-primary'
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-[var(--color-bg-card)] rounded-lg shadow-[var(--shadow-light)] p-4 border-2 border-transparent">
                  <div className="flex gap-4">
                    <div className="min-w-[40px] flex items-center justify-center">
                      <div className="h-7 w-7 bg-[var(--color-bg-tertiary)] rounded-full animate-pulse" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="h-5 bg-[var(--color-bg-tertiary)] rounded animate-pulse" style={{ width: `${50 + i * 15}%` }} />
                      <div className="h-4 w-2/3 bg-[var(--color-bg-tertiary)] rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-12 bg-[var(--color-bg-card)] rounded-lg">
              <Lightbulb className="w-12 h-12 mx-auto text-[var(--color-text-muted)] mb-4" />
              <p className="text-[var(--color-text-muted)] mb-4">
                {filter === 'mine'
                  ? "You haven't submitted any suggestions yet"
                  : filter === 'shipped'
                  ? 'No shipped suggestions yet'
                  : 'No suggestions yet. Be the first!'}
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="text-[var(--color-link)] hover:text-[var(--color-link-hover)]"
              >
                Submit a suggestion →
              </button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {suggestions.map((suggestion) => {
                const percentage = getPercentage(suggestion.vote_count)
                const thresholdReached = suggestion.vote_count >= threshold
                const isAuthor = suggestion.author_id === user?.id
                const canDelete = isAuthor && suggestion.vote_count === 0

                return (
                  <div
                    key={suggestion.id}
                    onClick={() => suggestion.status === 'open' && handleVote(suggestion.id)}
                    className={`group relative rounded-lg shadow-[var(--shadow-light)] p-3 sm:p-4 transition-all ${
                      suggestion.status === 'open'
                        ? 'cursor-pointer hover:shadow-md ' + (suggestion.has_voted
                            ? 'bg-[var(--color-link)]/10 border-2 border-[var(--color-link)] hover:bg-[var(--color-link)]/15'
                            : 'bg-[var(--color-bg-card)] hover:bg-[var(--color-link)]/5 hover:border-[var(--color-link)]/30 border-2 border-transparent')
                        : 'bg-[var(--color-bg-card)] border-2 border-transparent'
                    }`}
                  >
                    {suggestion.status === 'open' && (
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs bg-[var(--color-bg-card)] border border-[var(--color-border-light)] text-[var(--color-text-primary)] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md z-10">
                        {suggestion.has_voted ? 'Click to remove vote' : 'Click to upvote'}
                      </span>
                    )}

                    <div className="flex gap-3 sm:gap-4">
                      <div className={`flex items-center justify-center min-w-[40px] text-xl font-bold ${
                        suggestion.has_voted ? 'text-[var(--color-link)]' : 'text-[var(--color-text-secondary)]'
                      }`}>
                        {votingId === suggestion.id ? (
                          <span className="animate-pulse">{suggestion.vote_count}</span>
                        ) : (
                          suggestion.vote_count
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-medium text-[var(--color-text-primary)] text-sm sm:text-base">
                            {suggestion.title}
                          </h3>
                          {suggestion.status === 'shipped' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-success-light)] text-[var(--color-success)]">
                              Shipped
                            </span>
                          )}
                          {suggestion.status === 'closed' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]">
                              Closed
                            </span>
                          )}
                          {thresholdReached && suggestion.status === 'open' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                              50%+ reached
                            </span>
                          )}
                        </div>
                        {suggestion.description && (
                          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mb-2 line-clamp-2">
                            {suggestion.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                          <span>@{suggestion.author?.username || 'unknown'}</span>
                          <span>·</span>
                          <span>{new Date(suggestion.created_at).toLocaleDateString()}</span>
                          <span>·</span>
                          <span>{percentage}% support ({suggestion.vote_count}/{totalWriters})</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(suggestion.id)}
                            className="p-1.5 text-[var(--color-error)] opacity-0 group-hover:opacity-100 hover:opacity-80 transition-opacity"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin && suggestion.status === 'open' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(suggestion.id, 'shipped')}
                              className="p-1.5 text-[var(--color-success)] opacity-0 group-hover:opacity-100 hover:opacity-80 transition-opacity"
                              title="Mark as Shipped"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(suggestion.id, 'closed')}
                              className="p-1.5 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 hover:opacity-80 transition-opacity"
                              title="Close"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Updates Tab */}
      {mainTab === 'updates' && (
        <>
          {updatesLoading ? (
            <div className="bg-[var(--color-bg-card)] rounded-lg shadow-[var(--shadow-light)] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border-light)]">
                    <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase">Update</th>
                    {isSuperAdmin && <th className="w-10"></th>}
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3].map((i) => (
                    <tr key={i} className="border-b border-[var(--color-border-light)] last:border-0">
                      <td className="px-4 py-3"><div className="h-4 w-20 bg-[var(--color-bg-tertiary)] rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-16 bg-[var(--color-bg-tertiary)] rounded-full animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-[var(--color-bg-tertiary)] rounded animate-pulse" style={{ width: `${50 + i * 15}%` }} /></td>
                      {isSuperAdmin && <td></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : updates.length === 0 ? (
            <div className="text-center py-12 bg-[var(--color-bg-card)] rounded-lg">
              <Megaphone className="w-12 h-12 mx-auto text-[var(--color-text-muted)] mb-4" />
              <p className="text-[var(--color-text-muted)]">
                No updates yet. Check back soon!
              </p>
            </div>
          ) : (
            <div className="bg-[var(--color-bg-card)] rounded-lg shadow-[var(--shadow-light)] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border-light)]">
                    <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase">Update</th>
                    {isSuperAdmin && <th className="w-10"></th>}
                  </tr>
                </thead>
                <tbody>
                  {updates.map((update) => (
                    <tr
                      key={update.id}
                      className="group border-b border-[var(--color-border-light)] last:border-0 hover:bg-[var(--color-bg-hover)]"
                    >
                      <td className="px-4 py-3 text-sm text-[var(--color-text-muted)] whitespace-nowrap">
                        {new Date(update.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${getCategoryStyle(update.category)}`}>
                          {getCategoryIcon(update.category)}
                          {update.category.charAt(0).toUpperCase() + update.category.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--color-text-primary)] text-sm">
                          {update.title}
                        </div>
                        {update.description && (
                          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 line-clamp-1">
                            {update.description}
                          </p>
                        )}
                      </td>
                      {isSuperAdmin && (
                        <td className="px-2 py-3">
                          <button
                            onClick={() => handleDeleteUpdate(update.id)}
                            className="p-1.5 text-[var(--color-error)] opacity-0 group-hover:opacity-100 hover:opacity-80 transition-opacity"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Suggestion Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--color-bg-card)] rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                New Suggestion
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  Title <span className="text-[var(--color-error)]">*</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Dark mode for the editor"
                  maxLength={200}
                  className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-link)]"
                  required
                />
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  {newTitle.length}/200 characters
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Add more details about your suggestion..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-link)] resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim() || isSubmitting}
                  className="btn-primary px-4 py-2 text-sm rounded-md disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feature Update Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--color-bg-card)] rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                New Feature Update
              </h2>
              <button
                onClick={() => setShowUpdateModal(false)}
                className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitUpdate} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  Category <span className="text-[var(--color-error)]">*</span>
                </label>
                <div className="flex gap-2">
                  {(['new', 'improved', 'fixed'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setUpdateCategory(cat)}
                      className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        updateCategory === cat
                          ? getCategoryStyle(cat)
                          : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
                      }`}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  Title <span className="text-[var(--color-error)]">*</span>
                </label>
                <input
                  type="text"
                  value={updateTitle}
                  onChange={(e) => setUpdateTitle(e.target.value)}
                  placeholder="e.g., Analytics Dashboard"
                  className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-link)]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  Description
                </label>
                <textarea
                  value={updateDescription}
                  onChange={(e) => setUpdateDescription(e.target.value)}
                  placeholder="Describe what's new or changed..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-link)] resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className="px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!updateTitle.trim() || isSubmittingUpdate}
                  className="btn-primary px-4 py-2 text-sm rounded-md disabled:opacity-50"
                >
                  {isSubmittingUpdate ? 'Publishing...' : 'Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
