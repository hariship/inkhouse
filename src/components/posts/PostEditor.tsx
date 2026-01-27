'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Post, PostFormData } from '@/types'
import { Save, Eye, Upload, X, Pencil } from 'lucide-react'
import { ExcalidrawModal } from '@/components/editor/ExcalidrawModal'
import { useTheme } from '@/contexts/ThemeContext'

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import('react-quill-new')
    const Quill = (await import('react-quill-new')).Quill

    // Register custom Divider (HR) Blot
    const BlockEmbed = Quill.import('blots/block/embed') as any
    class DividerBlot extends BlockEmbed {
      static blotName = 'divider'
      static tagName = 'hr'
    }
    Quill.register(DividerBlot)

    return RQ
  },
  {
    ssr: false,
    loading: () => <div className="h-96 bg-[var(--color-bg-tertiary)] animate-pulse rounded-md" />
  }
)
import 'react-quill-new/dist/quill.snow.css'

interface PostEditorProps {
  post?: Post
  onSave: (data: PostFormData) => Promise<void>
  isLoading?: boolean
  isDeskPost?: boolean
}

const DRAFT_KEY = 'inkhouse-draft'

export function PostEditor({ post, onSave, isLoading, isDeskPost }: PostEditorProps) {
  const [quillEditor, setQuillEditor] = useState<any>(null)
  const { theme } = useTheme()
  const [isDrawingOpen, setIsDrawingOpen] = useState(false)
  const [isContentDrawingOpen, setIsContentDrawingOpen] = useState(false)
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false)
  const [quoteText, setQuoteText] = useState('')
  const [quoteAuthor, setQuoteAuthor] = useState('')
  const quillRawRef = useRef<any>(null)

  // Listen for draw modal event from Quill toolbar
  useEffect(() => {
    const handleOpenDraw = () => setIsContentDrawingOpen(true)
    window.addEventListener('openDrawModal', handleOpenDraw)
    return () => window.removeEventListener('openDrawModal', handleOpenDraw)
  }, [])

  // Listen for quote dialog event from Quill toolbar
  useEffect(() => {
    const handleOpenQuote = () => setIsQuoteDialogOpen(true)
    window.addEventListener('openQuoteDialog', handleOpenQuote)
    return () => window.removeEventListener('openQuoteDialog', handleOpenQuote)
  }, [])

  // Helper to get Quill editor instance
  const getQuill = useCallback(() => {
    return quillEditor
  }, [quillEditor])

  // Insert drawing as featured image
  const handleInsertDrawing = useCallback((imageUrl: string) => {
    setFormData((prev) => ({ ...prev, image_url: imageUrl }))
  }, [])

  // Insert drawing into content
  const handleInsertContentDrawing = useCallback((imageUrl: string) => {
    const quill = getQuill()
    if (quill && typeof quill.insertEmbed === 'function') {
      const range = quill.getSelection() || { index: quill.getLength() }
      quill.insertEmbed(range.index, 'image', imageUrl)
      quill.setSelection(range.index + 1)
    } else {
      // Fallback: append image HTML to content
      setFormData((prev) => ({
        ...prev,
        content: prev.content + `<p><img src="${imageUrl}" /></p>`
      }))
    }
  }, [getQuill])



  // Quill modules - custom handlers for HR, Draw, and Image (uploads to Cloudinary)
  const quillModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['blockquote', 'code-block'],
        ['link', 'image'],
        ['divider', 'draw', 'quote'],
        ['clean'],
      ],
      handlers: {
        divider: function(this: any) {
          const quill = this.quill
          if (quill) {
            const range = quill.getSelection(true)
            quill.insertEmbed(range.index, 'divider', true, 'user')
            quill.setSelection(range.index + 1)
          }
        },
        draw: function(this: any) {
          // This will be handled by opening the modal
          // We need to trigger the state change from outside
          const event = new CustomEvent('openDrawModal')
          window.dispatchEvent(event)
        },
        quote: function(this: any) {
          quillRawRef.current = this.quill
          const event = new CustomEvent('openQuoteDialog')
          window.dispatchEvent(event)
        },
        // Custom image handler - uploads to Cloudinary instead of embedding base64
        image: function(this: any) {
          const quill = this.quill
          const input = document.createElement('input')
          input.setAttribute('type', 'file')
          input.setAttribute('accept', 'image/*')
          input.click()

          input.onchange = async () => {
            const file = input.files?.[0]
            if (!file) return

            const range = quill.getSelection(true)

            // Show loading placeholder
            quill.insertText(range.index, 'Uploading image...', { italic: true })
            const placeholderLength = 'Uploading image...'.length

            try {
              const formData = new FormData()
              formData.append('file', file)

              const response = await fetch('/api/upload-image', {
                method: 'POST',
                body: formData,
              })

              const data = await response.json()

              // Remove placeholder
              quill.deleteText(range.index, placeholderLength)

              if (data.success && data.url) {
                quill.insertEmbed(range.index, 'image', data.url)
                quill.setSelection(range.index + 1)
              } else {
                alert('Failed to upload image')
              }
            } catch {
              quill.deleteText(range.index, placeholderLength)
              alert('Failed to upload image')
            }
          }
        },
      },
    },
  }), [])

  const [formData, setFormData] = useState<PostFormData>({
    title: post?.title || '',
    description: post?.description || '',
    content: post?.content || '',
    category: post?.category || '',
    image_url: post?.image_url || '',
    status: post?.status || 'draft',
    featured: post?.featured || false,
    allow_comments: post?.allow_comments !== false,
  })
  const [isPreview, setIsPreview] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [draftLoaded, setDraftLoaded] = useState(false)

  // Load draft from server first, then localStorage as fallback (only for new posts)
  useEffect(() => {
    if (post || draftLoaded) return

    const loadDraft = async () => {
      try {
        // Try server first
        const response = await fetch('/api/drafts')
        const result = await response.json()

        if (result.success && result.data) {
          setFormData({
            title: result.data.title || '',
            description: result.data.description || '',
            content: result.data.content || '',
            category: result.data.category || '',
            image_url: result.data.image_url || '',
            status: 'draft',
            featured: result.data.featured || false,
            allow_comments: result.data.allow_comments !== false,
          })
          setLastSaved(new Date(result.data.updated_at))
          setDraftLoaded(true)
          return
        }
      } catch {
        // Server draft failed, try localStorage
      }

      // Fallback to localStorage
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        try {
          const draft = JSON.parse(saved)
          setFormData(draft.data)
          setLastSaved(new Date(draft.timestamp))
        } catch {
          // Ignore parse errors
        }
      }
      setDraftLoaded(true)
    }

    loadDraft()
  }, [post, draftLoaded])

  // Save draft to server (debounced)
  const saveDraftToServer = useCallback(async (data: PostFormData) => {
    if (!data.title && !data.content) return

    setIsSavingDraft(true)
    try {
      await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } catch {
      // Silently fail - localStorage is the backup
    } finally {
      setIsSavingDraft(false)
    }
  }, [])

  // Auto-save draft every 30 seconds (only for new posts)
  useEffect(() => {
    if (post) return // Don't auto-save for existing posts

    const interval = setInterval(() => {
      if (formData.title || formData.content) {
        // Save to localStorage (immediate)
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            data: formData,
            timestamp: new Date().toISOString(),
          })
        )
        // Save to server (async)
        saveDraftToServer(formData)
        setLastSaved(new Date())
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [formData, post, saveDraftToServer])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleContentChange = (value: string) => {
    setFormData((prev) => ({ ...prev, content: value }))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formDataToSend = new FormData()
      formDataToSend.append('file', file)

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formDataToSend,
      })

      const data = await response.json()
      if (data.success) {
        setFormData((prev) => ({ ...prev, image_url: data.url }))
      } else {
        alert('Failed to upload image')
      }
    } catch {
      alert('Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (status: 'draft' | 'published') => {
    await onSave({ ...formData, status })

    // Clear draft after successful save (for new posts)
    if (!post) {
      localStorage.removeItem(DRAFT_KEY)
      // Clear server draft
      try {
        await fetch('/api/drafts', { method: 'DELETE' })
      } catch {
        // Ignore errors
      }
    }
  }

  const saveDraft = useCallback(async () => {
    if (formData.title || formData.content) {
      // Save to localStorage
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          data: formData,
          timestamp: new Date().toISOString(),
        })
      )
      // Save to server
      await saveDraftToServer(formData)
      setLastSaved(new Date())
    }
  }, [formData, saveDraftToServer])

  const handleQuoteInsert = useCallback(() => {
    if (!quoteText.trim()) return

    const escapeHtml = (text: string) =>
      text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    const escapedQuote = escapeHtml(quoteText.trim())
    const escapedAuthor = quoteAuthor.trim() ? escapeHtml(quoteAuthor.trim()) : ''

    const html = escapedAuthor
      ? `<blockquote><p>${escapedQuote}</p><p>\u2014 ${escapedAuthor}</p></blockquote>`
      : `<blockquote><p>${escapedQuote}</p></blockquote>`

    const quill = quillRawRef.current
    if (quill) {
      const range = quill.getSelection() || { index: quill.getLength() - 1 }
      quill.clipboard.dangerouslyPasteHTML(range.index, html)
    } else {
      setFormData(prev => ({ ...prev, content: prev.content + html }))
    }

    setQuoteText('')
    setQuoteAuthor('')
    setIsQuoteDialogOpen(false)
  }, [quoteText, quoteAuthor])

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header - Compact */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
        <h1 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)]">
          {post ? (isDeskPost ? 'Edit Desk Post' : 'Edit Post') : (isDeskPost ? 'New Desk Post' : 'New Post')}
        </h1>
        <div className="flex items-center space-x-2">
          {!post && (
            <span className="text-xs text-gray-500 hidden sm:inline">
              {isSavingDraft ? 'Saving...' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : ''}
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className="inline-flex items-center px-2 py-1.5 border border-[var(--color-border-medium)] rounded text-xs sm:text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
          >
            {isPreview ? (
              'Edit'
            ) : (
              <>
                <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                Preview
              </>
            )}
          </button>
          {!post && (
            <button
              type="button"
              onClick={saveDraft}
              className="inline-flex items-center px-2 py-1.5 border border-[var(--color-border-medium)] rounded text-xs sm:text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
            >
              <Save className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              Draft
            </button>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {isPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-bg-card)] rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[var(--color-bg-card)] border-b border-[var(--color-border-light)] px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Preview</h2>
              <button
                onClick={() => setIsPreview(false)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-4">
                {formData.title || 'Untitled'}
              </h1>
              {formData.image_url && (
                <img
                  src={formData.image_url}
                  alt={formData.title}
                  className="w-full h-64 object-cover rounded-lg mb-6"
                />
              )}
              <div
                className="prose max-w-none break-words"
                dangerouslySetInnerHTML={{ __html: formData.content }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="space-y-3">
        {/* Title & Category Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-2 py-1.5 border border-[var(--color-border-medium)] rounded text-sm text-[var(--color-text-primary)] bg-[var(--color-bg-card)] focus:ring-[var(--color-link)] focus:border-[var(--color-link)]"
              placeholder="Enter post title..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
              Category
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-2 py-1.5 border border-[var(--color-border-medium)] rounded text-sm text-[var(--color-text-primary)] bg-[var(--color-bg-card)] focus:ring-[var(--color-link)] focus:border-[var(--color-link)]"
            >
              <option value="">Select</option>
              <option value="Technology">Technology</option>
              <option value="Life">Life</option>
              <option value="Travel">Travel</option>
              <option value="Food">Food</option>
              <option value="Culture">Culture</option>
              <option value="Career">Career</option>
              <option value="Motives">Motives</option>
              <option value="Personal">Personal</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
              Featured Image
            </label>
            <div className="flex items-center space-x-1">
              <label className="inline-flex items-center px-2 py-1.5 border border-[var(--color-border-medium)] rounded cursor-pointer hover:bg-[var(--color-bg-hover)] text-xs">
                <Upload className="w-3 h-3 mr-1" />
                {isUploading ? '...' : 'Upload'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
              <button
                type="button"
                onClick={() => setIsDrawingOpen(true)}
                className="inline-flex items-center px-2 py-1.5 border border-[var(--color-border-medium)] rounded hover:bg-[var(--color-bg-hover)] text-xs"
                title="Create a drawing"
              >
                <Pencil className="w-3 h-3" />
              </button>
              {formData.image_url && (
                <img
                  src={formData.image_url}
                  alt="Featured"
                  className="h-7 w-10 object-cover rounded"
                />
              )}
            </div>
          </div>
        </div>

        {/* Description Row */}
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
            Description
          </label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full px-2 py-1.5 border border-[var(--color-border-medium)] rounded text-sm text-[var(--color-text-primary)] bg-[var(--color-bg-card)] focus:ring-[var(--color-link)] focus:border-[var(--color-link)]"
            placeholder="Brief description for previews..."
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
            Content *
          </label>
          <div id="quill-container" className="bg-[var(--color-bg-card)] rounded">
            <ReactQuill
              theme="snow"
              value={formData.content}
              onChange={handleContentChange}
              onChangeSelection={(range: any, source: any, editor: any) => {
                if (editor && !quillEditor) {
                  setQuillEditor(editor)
                }
              }}
              modules={quillModules}
              className="h-[350px] sm:h-[600px]"
            />
          </div>
        </div>

        {/* Options */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-8 sm:pt-12">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              name="featured"
              checked={formData.featured}
              onChange={handleChange}
              className="rounded border-[var(--color-border-medium)] text-[var(--color-button-primary)] focus:ring-[var(--color-link)]"
            />
            <span className="ml-2 text-sm text-[var(--color-text-secondary)]">
              Featured post
            </span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              name="allow_comments"
              checked={formData.allow_comments}
              onChange={handleChange}
              className="rounded border-[var(--color-border-medium)] text-[var(--color-button-primary)] focus:ring-[var(--color-link)]"
            />
            <span className="ml-2 text-sm text-[var(--color-text-secondary)]">
              Allow comments
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-4 pt-6 border-t border-[var(--color-border-light)]">
          <button
            type="button"
            onClick={() => handleSubmit('draft')}
            disabled={isLoading || !formData.title || !formData.content}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 border border-[var(--color-border-medium)] rounded-md text-sm sm:text-base text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save as Draft'}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit('published')}
            disabled={isLoading || !formData.title || !formData.content}
            className="w-full sm:w-auto btn-primary px-4 sm:px-6 py-2 rounded-md text-sm sm:text-base disabled:opacity-50"
          >
            {isLoading ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Excalidraw Drawing Modal - Featured Image */}
      <ExcalidrawModal
        isOpen={isDrawingOpen}
        onClose={() => setIsDrawingOpen(false)}
        onInsert={handleInsertDrawing}
        theme={theme}
      />

      {/* Excalidraw Drawing Modal - Content */}
      <ExcalidrawModal
        isOpen={isContentDrawingOpen}
        onClose={() => setIsContentDrawingOpen(false)}
        onInsert={handleInsertContentDrawing}
        theme={theme}
      />

      {/* Quote Dialog */}
      {isQuoteDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-bg-card)] rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-[var(--color-border-light)] flex justify-between items-center">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Insert Quote</h3>
              <button
                onClick={() => setIsQuoteDialogOpen(false)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Quote *
                </label>
                <textarea
                  value={quoteText}
                  onChange={(e) => setQuoteText(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-[var(--color-border-medium)] rounded-md text-sm text-[var(--color-text-primary)] bg-[var(--color-bg-card)] focus:ring-[var(--color-link)] focus:border-[var(--color-link)]"
                  placeholder="Enter the quote..."
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Attribution
                </label>
                <input
                  type="text"
                  value={quoteAuthor}
                  onChange={(e) => setQuoteAuthor(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border-medium)] rounded-md text-sm text-[var(--color-text-primary)] bg-[var(--color-bg-card)] focus:ring-[var(--color-link)] focus:border-[var(--color-link)]"
                  placeholder="Author name (optional)"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleQuoteInsert() }}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsQuoteDialogOpen(false)}
                  className="px-4 py-2 border border-[var(--color-border-medium)] rounded-md text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleQuoteInsert}
                  disabled={!quoteText.trim()}
                  className="btn-primary px-4 py-2 rounded-md text-sm disabled:opacity-50"
                >
                  Insert Quote
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
