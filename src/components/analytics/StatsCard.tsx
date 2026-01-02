interface StatsCardProps {
  label: string
  value: number
  icon?: React.ReactNode
  tooltip?: string
}

export function StatsCard({ label, value, icon, tooltip }: StatsCardProps) {
  return (
    <div className="bg-[var(--color-bg-card)] rounded-lg p-4 shadow-[var(--shadow-light)] overflow-visible">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">
            {value.toLocaleString()}
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
        </div>
        {icon && (
          <div className="text-[var(--color-text-muted)] group relative">
            {icon}
            {tooltip && (
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                {tooltip}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
