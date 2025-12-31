'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PostEditor } from '@/components/posts/PostEditor'
import { PostFormData } from '@/types'

export default function NewDeskPostPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if user has super admin access
    const checkAccess = async () => {
      try {
        const response = await fetch('/api/posts/my?type=desk')
        if (response.status === 403) {
          router.push('/dashboard')
        } else {
          setHasAccess(true)
        }
      } catch {
        router.push('/dashboard')
      }
    }
    checkAccess()
  }, [router])

  const handleSave = async (data: PostFormData) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, type: 'desk' }),
      })

      const result = await response.json()

      if (result.success) {
        router.push('/dashboard/desk')
      } else {
        alert(result.error || 'Failed to create desk post')
      }
    } catch {
      alert('Network error')
    } finally {
      setIsLoading(false)
    }
  }

  if (hasAccess === null) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-button-primary)]"></div>
      </div>
    )
  }

  return <PostEditor onSave={handleSave} isLoading={isLoading} isDeskPost />
}
