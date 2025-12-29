'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PostEditor } from '@/components/posts/PostEditor'
import { PostFormData } from '@/types'

export default function NewPostPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async (data: PostFormData) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.success) {
        router.push('/dashboard')
      } else {
        alert(result.error || 'Failed to create post')
      }
    } catch {
      alert('Network error')
    } finally {
      setIsLoading(false)
    }
  }

  return <PostEditor onSave={handleSave} isLoading={isLoading} />
}
