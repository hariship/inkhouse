'use client'

import { ReadingFilter, SortOption, ViewMode } from '@/types'
import ViewModeToggle from './ViewModeToggle'
import { Glasses, Check, Bookmark } from 'lucide-react'

interface FilterBarProps {
  filter: ReadingFilter
  sort?: SortOption
  viewMode: ViewMode
  onFilterChange: (filter: ReadingFilter) => void
  onSortChange?: (sort: SortOption) => void
  onViewModeChange: (mode: ViewMode) => void
  showViewToggle?: boolean
}

const filterOptions: { value: ReadingFilter; label: string; icon?: React.ReactNode }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread', icon: <Glasses size={14} /> },
  { value: 'read', label: 'Read', icon: <Check size={14} /> },
  { value: 'saved', label: 'Saved', icon: <Bookmark size={14} /> },
]

export default function FilterBar({
  filter,
  viewMode,
  onFilterChange,
  onViewModeChange,
  showViewToggle = true,
}: FilterBarProps) {
  return (
    <div className="flex items-center justify-end gap-3 mb-2">
      {/* Reading filter - compact dropdown style */}
      <div className="flex items-center gap-1.5">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onFilterChange(option.value)}
            className={`
              flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full transition-colors
              ${filter === option.value
                ? 'bg-[var(--color-button-primary)] text-white'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
              }
            `}
            title={option.label}
          >
            {option.icon}
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        ))}
      </div>

      {/* View mode toggle */}
      {showViewToggle && (
        <ViewModeToggle
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
        />
      )}
    </div>
  )
}
