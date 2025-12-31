'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { ViewMode, ReadingFilter } from '@/types'
import { useAuth } from './AuthContext'

interface ReadingContextType {
  viewMode: ViewMode
  filter: ReadingFilter
  setViewMode: (mode: ViewMode) => void
  setFilter: (filter: ReadingFilter) => void
}

const ReadingContext = createContext<ReadingContextType | undefined>(undefined)

export function ReadingProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  // Default to 'list' (compact) on mobile, 'grid' on desktop
  const [viewMode, setViewModeState] = useState<ViewMode>('grid')
  const [filter, setFilterState] = useState<ReadingFilter>('unread')
  const [loaded, setLoaded] = useState(false)

  // Set initial view mode based on screen size (mobile defaults to compact list)
  useEffect(() => {
    const isMobile = window.innerWidth < 640 // sm breakpoint
    if (isMobile) {
      setViewModeState('list')
    }
  }, [])

  // Load preferences when authenticated
  useEffect(() => {
    if (!isAuthenticated || loaded) return

    const loadPreferences = async () => {
      try {
        const response = await fetch('/api/preferences')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            setViewModeState(data.data.view_mode || 'grid')
            setFilterState(data.data.default_filter || 'unread')
          }
        }
      } catch (error) {
        console.error('Failed to load preferences:', error)
      } finally {
        setLoaded(true)
      }
    }

    loadPreferences()
  }, [isAuthenticated, loaded])

  // Reset to default when user logs out
  useEffect(() => {
    if (!isAuthenticated && loaded) {
      setFilterState('all')
      setLoaded(false)
    }
  }, [isAuthenticated, loaded])

  const setViewMode = async (mode: ViewMode) => {
    setViewModeState(mode)

    if (isAuthenticated) {
      try {
        await fetch('/api/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ view_mode: mode }),
        })
      } catch (error) {
        console.error('Failed to save view mode:', error)
      }
    }
  }

  const setFilter = async (newFilter: ReadingFilter) => {
    setFilterState(newFilter)

    // Persist filter preference when authenticated
    if (isAuthenticated) {
      try {
        await fetch('/api/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ default_filter: newFilter }),
        })
      } catch (error) {
        console.error('Failed to save filter preference:', error)
      }
    }
  }

  return (
    <ReadingContext.Provider value={{ viewMode, filter, setViewMode, setFilter }}>
      {children}
    </ReadingContext.Provider>
  )
}

export function useReading() {
  const context = useContext(ReadingContext)
  if (context === undefined) {
    return {
      viewMode: 'grid' as ViewMode,
      filter: 'all' as ReadingFilter,
      setViewMode: () => {},
      setFilter: () => {},
    }
  }
  return context
}
