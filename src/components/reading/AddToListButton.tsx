'use client'

import { useState, useEffect, useRef } from 'react'
import { Box, Plus, Check } from 'lucide-react'
import { ReadingList } from '@/types'

interface AddToListButtonProps {
  postId: number
  size?: 'sm' | 'md'
}

export default function AddToListButton({ postId, size = 'md' }: AddToListButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [lists, setLists] = useState<ReadingList[]>([])
  const [postLists, setPostLists] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newListName, setNewListName] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const iconSize = size === 'sm' ? 16 : 20

  // Fetch lists when dropdown opens
  useEffect(() => {
    if (!isOpen) return

    const fetchLists = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/reading-lists')
        if (response.ok) {
          const data = await response.json()
          setLists(data.data || [])

          // Check which lists contain this post
          const listsWithPost = new Set<string>()
          for (const list of data.data || []) {
            const detailRes = await fetch(`/api/reading-lists/${list.id}`)
            if (detailRes.ok) {
              const detailData = await detailRes.json()
              const hasPost = detailData.data?.items?.some(
                (item: { post_id: number }) => item.post_id === postId
              )
              if (hasPost) {
                listsWithPost.add(list.id)
              }
            }
          }
          setPostLists(listsWithPost)
        }
      } catch (error) {
        console.error('Failed to fetch lists:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLists()
  }, [isOpen, postId])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setShowCreateForm(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggleList = async (listId: string) => {
    const isInList = postLists.has(listId)

    try {
      if (isInList) {
        // Remove from list
        const response = await fetch(
          `/api/reading-lists/${listId}/items?postId=${postId}`,
          { method: 'DELETE' }
        )
        if (response.ok) {
          setPostLists((prev) => {
            const newSet = new Set(prev)
            newSet.delete(listId)
            return newSet
          })
        }
      } else {
        // Add to list
        const response = await fetch(`/api/reading-lists/${listId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ post_id: postId }),
        })
        if (response.ok) {
          setPostLists((prev) => new Set(prev).add(listId))
        }
      }
    } catch (error) {
      console.error('Failed to update list:', error)
    }
  }

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault()

    // Auto-generate name if not provided
    const boxName = newListName.trim() || `Box ${lists.length + 1}`

    try {
      const response = await fetch('/api/reading-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: boxName }),
      })

      if (response.ok) {
        const data = await response.json()
        setLists((prev) => [data.data, ...prev])

        // Automatically add post to new list
        await fetch(`/api/reading-lists/${data.data.id}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ post_id: postId }),
        })
        setPostLists((prev) => new Set(prev).add(data.data.id))

        setNewListName('')
        setShowCreateForm(false)
      }
    } catch (error) {
      console.error('Failed to create list:', error)
    }
  }

  return (
    <div className="relative group/addlist" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className={`
          flex items-center gap-1.5 rounded-md transition-colors
          ${size === 'sm' ? 'p-1' : 'p-1.5'}
          text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]
        `}
        aria-label="Add to box"
      >
        <Box size={iconSize} className="flex-shrink-0" />
      </button>
      {!isOpen && (
        <span className="absolute -bottom-7 right-0 px-2 py-0.5 text-xs bg-[var(--color-bg-card)] border border-[var(--color-border-light)] text-[var(--color-text-primary)] rounded opacity-0 group-hover/addlist:opacity-100 transition-opacity whitespace-nowrap shadow-md z-50 pointer-events-none">
          Add to box
        </span>
      )}

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 w-56 bg-[var(--color-bg-card)] rounded-lg shadow-lg border border-[var(--color-border-light)] z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-2">
            <div className="text-xs font-medium text-[var(--color-text-muted)] px-2 py-1 mb-1">
              Add to box
            </div>

            {isLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--color-button-primary)]"></div>
              </div>
            ) : (
              <>
                {lists.length === 0 && !showCreateForm ? (
                  <p className="text-sm text-[var(--color-text-secondary)] px-2 py-2">
                    No boxes yet
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto">
                    {lists.map((list) => (
                      <button
                        key={list.id}
                        onClick={() => handleToggleList(list.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--color-bg-secondary)] text-left"
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            postLists.has(list.id)
                              ? 'bg-[var(--color-link)] border-[var(--color-link)] text-white'
                              : 'border-[var(--color-border-medium)]'
                          }`}
                        >
                          {postLists.has(list.id) && <Check size={12} />}
                        </div>
                        <span className="text-sm text-[var(--color-text-primary)] truncate">
                          {list.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="border-t border-[var(--color-border-light)] mt-2 pt-2">
                  {showCreateForm ? (
                    <form onSubmit={handleCreateList} className="px-2">
                      <input
                        type="text"
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        placeholder="Name (optional)"
                        className="w-full px-2 py-1.5 text-sm border border-[var(--color-border-medium)] rounded bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-link)]"
                        autoFocus
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreateForm(false)
                            setNewListName('')
                          }}
                          className="flex-1 text-xs text-[var(--color-text-secondary)] py-1"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 text-xs btn-primary py-1 rounded"
                        >
                          Create
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--color-bg-secondary)] text-[var(--color-link)]"
                    >
                      <Plus size={16} />
                      <span className="text-sm">Create new box</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
