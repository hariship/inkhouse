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
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-button-primary)]"></div>
      </div>
    )
  }

  if (!post) {
    return null
  }

  return <PostEditor post={post} onSave={handleSave} isLoading={isSaving} />
}
