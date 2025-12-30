'use client'

export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-secondary)] flex items-center justify-center">
      <div className="text-center">
        <span
          className="font-mono text-2xl text-[var(--color-text-primary)] inline-block overflow-hidden whitespace-nowrap animate-typewriter"
          style={{
            borderRight: '2px solid var(--color-text-primary)',
            animation: 'typing 1s steps(12, end) forwards, blink 0.6s step-end infinite',
          }}
        >
          ACCESSING...
        </span>
      </div>

      <style>{`
        @keyframes typing {
          from { width: 0 }
          to { width: 12ch }
        }

        @keyframes blink {
          50% { border-color: transparent }
        }

        .animate-typewriter {
          width: 0;
        }
      `}</style>
    </div>
  )
}
