'use client'

import { useState, useCallback, useEffect } from 'react'
import { X, Upload, Loader2 } from 'lucide-react'
import '@excalidraw/excalidraw/index.css'

interface ExcalidrawModalProps {
  isOpen: boolean
  onClose: () => void
  onInsert: (imageUrl: string) => void
  theme: 'light' | 'dark'
}

export function ExcalidrawModal({ isOpen, onClose, onInsert, theme }: ExcalidrawModalProps) {
  const [Excalidraw, setExcalidraw] = useState<any>(null)
  const [exportToBlob, setExportToBlob] = useState<any>(null)
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load Excalidraw only on client side when modal opens
  useEffect(() => {
    if (isOpen && !Excalidraw) {
      import('@excalidraw/excalidraw').then((module) => {
        setExcalidraw(() => module.Excalidraw)
        setExportToBlob(() => module.exportToBlob)
        setIsLoaded(true)
      }).catch((err) => {
        console.error('Failed to load Excalidraw:', err)
        setError('Failed to load drawing tool')
      })
    }
  }, [isOpen, Excalidraw])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null)
      setIsExporting(false)
    }
  }, [isOpen])

  const handleExport = useCallback(async () => {
    if (!excalidrawAPI || !exportToBlob) {
      setError('Drawing not ready. Please try again.')
      return
    }

    setIsExporting(true)
    setError(null)

    try {
      const elements = excalidrawAPI.getSceneElements()

      if (!elements || elements.length === 0) {
        setError('Please draw something first!')
        setIsExporting(false)
        return
      }

      // Export to blob
      const blob = await exportToBlob({
        elements,
        appState: {
          exportWithDarkMode: theme === 'dark',
          exportBackground: true,
        },
        files: excalidrawAPI.getFiles(),
      })

      // Convert blob to base64
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64 = reader.result as string

        try {
          const response = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ base64 }),
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error('Upload failed:', response.status, errorText)
            setError(`Upload failed: ${response.status}`)
            setIsExporting(false)
            return
          }

          const data = await response.json()
          console.log('Upload response:', data)

          if (data.success && data.url) {
            onInsert(data.url)
            onClose()
          } else {
            setError(data.error || 'Failed to upload drawing')
          }
        } catch (uploadError) {
          console.error('Upload error:', uploadError)
          setError(`Upload error: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`)
        }

        setIsExporting(false)
      }

      reader.onerror = () => {
        setError('Failed to process drawing')
        setIsExporting(false)
      }

      reader.readAsDataURL(blob)
    } catch (err) {
      console.error('Export error:', err)
      setError('Failed to export drawing. Please try again.')
      setIsExporting(false)
    }
  }, [excalidrawAPI, exportToBlob, theme, onInsert, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: '#ffffff' }}>
      {/* Header - Always light mode for better UX */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          borderColor: '#e5e7eb',
          backgroundColor: '#ffffff'
        }}
      >
        <h2
          className="text-lg font-semibold"
          style={{ color: '#1f2937' }}
        >
          Create Drawing
        </h2>
        <div className="flex items-center gap-3">
          {error && (
            <span className="text-sm text-red-500">{error}</span>
          )}
          <button
            onClick={handleExport}
            disabled={isExporting || !isLoaded}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Insert Drawing
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-200"
            style={{ color: '#6b7280' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Excalidraw Canvas - Always light mode for usability, exports with theme */}
      <div style={{ flex: 1, width: '100%', height: 'calc(100vh - 60px)' }}>
        {!isLoaded ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#6b7280' }} />
          </div>
        ) : Excalidraw ? (
          <Excalidraw
            excalidrawAPI={(api: any) => setExcalidrawAPI(api)}
            theme="light"
            initialData={{
              appState: {
                viewBackgroundColor: '#ffffff',
              },
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p style={{ color: '#6b7280' }}>Failed to load drawing tool</p>
          </div>
        )}
      </div>
    </div>
  )
}
