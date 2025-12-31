'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Navbar } from '@/components/layout/Navbar'
import { useAuth } from '@/contexts/AuthContext'
import { ReadingList } from '@/types'
import { Plus, Box, Trash2, Edit2, Search, X } from 'lucide-react'

interface SearchPost {
  id: number
  title: string
  normalized_title: string
  description?: string
  image_url?: string
  author: {
    display_name: string
  }
}

export default function ListsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [lists, setLists] = useState<ReadingList[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingList, setEditingList] = useState<ReadingList | null>(null)
  const [newListName, setNewListName] = useState('')
  const [newListDescription, setNewListDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Create modal search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchPost[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedPosts, setSelectedPosts] = useState<SearchPost[]>([])

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/boxes')
    }
  }, [authLoading, isAuthenticated, router])

  // Fetch lists
  useEffect(() => {
    if (!isAuthenticated) return

    const fetchLists = async () => {
      try {
        const response = await fetch('/api/reading-lists')
        if (response.ok) {
          const data = await response.json()
          setLists(data.data || [])
        }
      } catch (error) {
        console.error('Failed to fetch lists:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLists()
  }, [isAuthenticated])

  // Search posts for create modal
  useEffect(() => {
    if (!searchQuery.trim() || !showCreateModal) {
      setSearchResults([])
      return
    }

    const searchPosts = async () => {
      setIsSearching(true)
      try {
        const response = await fetch(`/api/posts?search=${encodeURIComponent(searchQuery)}&limit=5`)
        if (response.ok) {
          const data = await response.json()
          // Filter out already selected posts
          const selectedIds = new Set(selectedPosts.map(p => p.id))
          setSearchResults(data.data.filter((post: SearchPost) => !selectedIds.has(post.id)))
        }
      } catch (error) {
        console.error('Failed to search posts:', error)
      } finally {
        setIsSearching(false)
      }
    }

    const debounce = setTimeout(searchPosts, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery, showCreateModal, selectedPosts])

  const handleSelectPost = (post: SearchPost) => {
    setSelectedPosts(prev => [...prev, post])
    setSearchResults(prev => prev.filter(p => p.id !== post.id))
    setSearchQuery('')
  }

  const handleRemovePost = (postId: number) => {
    setSelectedPosts(prev => prev.filter(p => p.id !== postId))
  }

  const resetCreateModal = () => {
    setShowCreateModal(false)
    setNewListName('')
    setNewListDescription('')
    setSearchQuery('')
    setSearchResults([])
    setSelectedPosts([])
  }

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsSaving(true)
    try {
      // Auto-generate name if not provided
      const boxName = newListName.trim() || `Box ${lists.length + 1}`

      const response = await fetch('/api/reading-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: boxName,
          description: newListDescription,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const newList = data.data

        // Add selected posts to the new box
        for (const post of selectedPosts) {
          await fetch(`/api/reading-lists/${newList.id}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ post_id: post.id }),
          })
        }

        // Update list with item count
        newList.item_count = selectedPosts.length
        setLists((prev) => [newList, ...prev])
        resetCreateModal()
      }
    } catch (error) {
      console.error('Failed to create box:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateList = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingList || !newListName.trim()) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/reading-lists/${editingList.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newListName,
          description: newListDescription,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setLists((prev) =>
          prev.map((l) => (l.id === editingList.id ? { ...l, ...data.data } : l))
        )
        setEditingList(null)
        setNewListName('')
        setNewListDescription('')
      }
    } catch (error) {
      console.error('Failed to update box:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteList = async (listId: string) => {
    if (!confirm('Are you sure you want to delete this box?')) return

    try {
      const response = await fetch(`/api/reading-lists/${listId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setLists((prev) => prev.filter((l) => l.id !== listId))
      }
    } catch (error) {
      console.error('Failed to delete box:', error)
    }
  }

  const openEditModal = (list: ReadingList) => {
    setEditingList(list)
    setNewListName(list.name)
    setNewListDescription(list.description || '')
  }

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-tertiary)]">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-button-primary)]"></div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-tertiary)]">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Box className="w-6 h-6 text-[var(--color-link)]" />
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              My Boxes
            </h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2 rounded-md"
          >
            <Plus size={18} />
            New Box
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-button-primary)]"></div>
          </div>
        ) : lists.length === 0 ? (
          <div className="text-center py-12 bg-[var(--color-bg-card)] rounded-lg">
            <Box className="mx-auto h-12 w-12 text-[var(--color-text-muted)] mb-4" />
            <h2 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
              No boxes yet
            </h2>
            <p className="text-[var(--color-text-secondary)] mb-4">
              Create a box to hold posts you discover
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary px-4 py-2 rounded-md"
            >
              Create your first box
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {lists.map((list) => (
              <div
                key={list.id}
                className="bg-[var(--color-bg-card)] rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <Link href={`/boxes/${list.id}`} className="flex-1 min-w-0 flex items-start gap-3">
                    <Box className="w-5 h-5 text-[var(--color-link)] mt-0.5 flex-shrink-0" />
                    <div>
                      <h2 className="text-lg font-medium text-[var(--color-text-primary)] hover:text-[var(--color-link)]">
                        {list.name}
                      </h2>
                      {list.description && (
                        <p className="mt-1 text-sm text-[var(--color-text-secondary)] line-clamp-2">
                          {list.description}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                        {list.item_count || 0} {list.item_count === 1 ? 'post' : 'posts'}
                      </p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => openEditModal(list)}
                      className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] rounded-md"
                      title="Edit box"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteList(list.id)}
                      className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-light)] rounded-md"
                      title="Delete box"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal - Search first, then name */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-bg-card)] rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
              Create New Box
            </h2>

            {/* Search bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posts to add..."
                className="w-full pl-10 pr-10 py-2.5 bg-[var(--color-bg-primary)] border border-[var(--color-border-medium)] rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-link)]"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Search results dropdown */}
              {searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border-medium)] rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {isSearching ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--color-button-primary)]"></div>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="py-1">
                      {searchResults.map((post) => (
                        <button
                          key={post.id}
                          type="button"
                          onClick={() => handleSelectPost(post)}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[var(--color-bg-secondary)] text-left"
                        >
                          {post.image_url && (
                            <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                              <Image
                                src={post.image_url}
                                alt={post.title}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--color-text-primary)] line-clamp-1">
                              {post.title}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)]">
                              {post.author.display_name}
                            </p>
                          </div>
                          <Plus size={16} className="text-[var(--color-link)] flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-sm text-[var(--color-text-muted)]">
                      No posts found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Selected posts */}
            <div className="flex-1 overflow-y-auto mb-4 min-h-[100px]">
              {selectedPosts.length === 0 ? (
                <div className="text-center py-6 text-[var(--color-text-muted)] text-sm">
                  Search and select posts to add to your box
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-[var(--color-text-muted)] mb-2">
                    {selectedPosts.length} {selectedPosts.length === 1 ? 'post' : 'posts'} selected
                  </p>
                  {selectedPosts.map((post) => (
                    <div
                      key={post.id}
                      className="flex items-center gap-3 p-2 bg-[var(--color-bg-secondary)] rounded-md"
                    >
                      {post.image_url && (
                        <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                          <Image
                            src={post.image_url}
                            alt={post.title}
                            width={32}
                            height={32}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <p className="flex-1 text-sm text-[var(--color-text-primary)] line-clamp-1">
                        {post.title}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRemovePost(post.id)}
                        className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-error)]"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Name field (optional) */}
            <form onSubmit={handleCreateList}>
              <div className="border-t border-[var(--color-border-light)] pt-4">
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border-medium)] rounded-md text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-link)]"
                  placeholder="Box name (optional)"
                />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={resetCreateModal}
                  className="px-4 py-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || selectedPosts.length === 0}
                  className="btn-primary px-4 py-2 rounded-md disabled:opacity-50"
                >
                  {isSaving ? 'Creating...' : `Create Box${selectedPosts.length > 0 ? ` (${selectedPosts.length})` : ''}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingList && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-bg-card)] rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
              Edit Box
            </h2>
            <form onSubmit={handleUpdateList}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-border-medium)] rounded-md text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-link)]"
                    placeholder="Box name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={newListDescription}
                    onChange={(e) => setNewListDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-border-medium)] rounded-md text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-link)] resize-none"
                    rows={3}
                    placeholder="What's this box about?"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setEditingList(null)
                    setNewListName('')
                    setNewListDescription('')
                  }}
                  className="px-4 py-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !newListName.trim()}
                  className="btn-primary px-4 py-2 rounded-md disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
