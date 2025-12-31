'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { PostEditor } from '@/components/posts/PostEditor'
import { Post, PostFormData } from '@/types'

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [post, setPost] = useState<Post | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`/api/posts/${id}`)
        const data = await response.json()

        if (data.success) {
          setPost(data.data)
        } else {
          alert('Post not found')
          router.push('/dashboard')
        }
      } catch {
        alert('Failed to load post')
        router.push('/dashboard')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPost()
  }, [id, router])

  const handleSave = async (data: PostFormData) => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.success) {
        router.push('/dashboard')
      } else {
        alert(result.error || 'Failed to update post')
      }
    } catch {
      alert('Network error')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto animate-pulse">
        {/* Header skeleton */}
        <div className="flex justify-between items-center mb-3">
          <div className="h-6 w-32 bg-[var(--color-bg-tertiary)] rounded" />
          <div className="flex space-x-2">
            <div className="h-8 w-16 bg-[var(--color-bg-tertiary)] rounded" />
            <div className="h-8 w-16 bg-[var(--color-bg-tertiary)] rounded" />
          </div>
        </div>
        {/* Form skeleton */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2 h-10 bg-[var(--color-bg-tertiary)] rounded" />
            <div className="h-10 bg-[var(--color-bg-tertiary)] rounded" />
            <div className="h-10 bg-[var(--color-bg-tertiary)] rounded" />
          </div>
          <div className="h-10 bg-[var(--color-bg-tertiary)] rounded" />
          <div className="h-[400px] bg-[var(--color-bg-tertiary)] rounded" />
        </div>
      </div>
    )
  }

  if (!post) {
    return null
  }

  return <PostEditor post={post} onSave={handleSave} isLoading={isSaving} />
}
