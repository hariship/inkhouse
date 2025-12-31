'use client'

import { LayoutGrid, List } from 'lucide-react'
import { ViewMode } from '@/types'

interface ViewModeToggleProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  persistToServer?: boolean
}

export default function ViewModeToggle({
  viewMode,
  onViewModeChange,
  persistToServer = true,
}: ViewModeToggleProps) {
  const handleChange = async (mode: ViewMode) => {
    onViewModeChange(mode)

    if (persistToServer) {
      try {
        await fetch('/api/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ view_mode: mode }),
        })
      } catch (error) {
        console.error('Failed to persist view mode:', error)
      }
    }
  }

  return (
    <div className="flex items-center bg-[var(--color-bg-secondary)] rounded-md p-0.5">
      <button
        onClick={() => handleChange('grid')}
        className={`
          p-1.5 rounded transition-colors
          ${viewMode === 'grid'
            ? 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] shadow-sm'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
          }
        `}
        title="Grid view"
        aria-label="Grid view"
        aria-pressed={viewMode === 'grid'}
      >
        <LayoutGrid size={18} />
      </button>
      <button
        onClick={() => handleChange('list')}
        className={`
          p-1.5 rounded transition-colors
          ${viewMode === 'list'
            ? 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] shadow-sm'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
          }
        `}
        title="List view"
        aria-label="List view"
        aria-pressed={viewMode === 'list'}
      >
        <List size={18} />
      </button>
    </div>
  )
}
