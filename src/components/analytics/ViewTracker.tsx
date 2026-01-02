'use client'

import { useEffect, useRef } from 'react'

interface ViewTrackerProps {
  postId: number
}

export function ViewTracker({ postId }: ViewTrackerProps) {
  const tracked = useRef(false)

  useEffect(() => {
    // Only track once per page load
    if (tracked.current) return
    tracked.current = true

    // Use sendBeacon for non-blocking tracking
    // Falls back to fetch if sendBeacon is not available
    const trackView = () => {
      const data = JSON.stringify({ post_id: postId })

      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/track', data)
      } else {
        // Fallback for older browsers
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: data,
          keepalive: true,
        }).catch(() => {
          // Fail silently
        })
      }
    }

    // Small delay to ensure the page has loaded
    const timer = setTimeout(trackView, 100)
    return () => clearTimeout(timer)
  }, [postId])

  // This component renders nothing
  return null
}
