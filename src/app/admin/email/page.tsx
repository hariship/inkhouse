'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Mail, Send, Users, Newspaper, UserCircle, PenLine, BookOpen } from 'lucide-react'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import dynamic from 'next/dynamic'

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => <div className="h-64 bg-[var(--color-bg-tertiary)] animate-pulse rounded-md" />
})
import 'react-quill-new/dist/quill.snow.css'

type EmailType = 'newsletter' | 'announcement' | 'writers' | 'readers' | 'custom'

export default function AdminEmailPage() {
  const { user } = useAuth()
  const [emailType, setEmailType] = useState<EmailType>('newsletter')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [customEmail, setCustomEmail] = useState('')
  const [recipientCount, setRecipientCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  // Custom colors for email - includes Inkhouse cyan/teal
  const customColors = [
    '#0D9488', // Inkhouse teal
    '#0891B2', // cyan
    '#2563EB', // blue
    '#7C3AED', // purple
    '#DB2777', // pink
    '#DC2626', // red
    '#EA580C', // orange
    '#CA8A04', // yellow
    '#16A34A', // green
    '#000000', // black
    '#374151', // gray
    '#FFFFFF', // white
  ]

  // Background colors with transparent option
  const backgroundColors = [
    'transparent', // no background
    ...customColors,
  ]

  // Quill modules for rich text editing
  const quillModules = useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ color: customColors }, { background: backgroundColors }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link'],
      ['clean'],
    ],
  }), [])

  // Only super_admin can access
  if (user?.role !== 'super_admin') {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--color-error)]">Access denied. Super admin only.</p>
      </div>
    )
  }

  // Fetch recipient count when type changes
  useEffect(() => {
    if (emailType === 'custom') {
      setRecipientCount(0)
      return
    }

    const fetchCount = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/admin/email/recipients?type=${emailType}`)
        const data = await res.json()
        if (data.success) {
          setRecipientCount(data.data.count)
        }
      } catch (error) {
        console.error('Failed to fetch recipient count:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCount()
  }, [emailType])

  const handleSend = async () => {
    setShowConfirm(false)
    setIsSending(true)
    setResult(null)

    try {
      const res = await fetch('/api/admin/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: emailType,
          subject,
          body,
          customEmail: emailType === 'custom' ? customEmail : undefined,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setResult({
          success: true,
          message: `Sent ${data.data.sentCount} email(s) successfully${data.data.failedCount > 0 ? `, ${data.data.failedCount} failed` : ''}`,
        })
        // Only clear custom email on success, keep subject and body for resending
        setCustomEmail('')
      } else {
        setResult({ success: false, message: data.error || 'Failed to send' })
      }
    } catch (error) {
      setResult({ success: false, message: 'Failed to send emails' })
    } finally {
      setIsSending(false)
    }
  }

  const canSend = subject.trim() && body.trim() && (emailType !== 'custom' || customEmail.trim())

  const getTypeIcon = (type: EmailType) => {
    switch (type) {
      case 'newsletter': return <Newspaper className="w-4 h-4" />
      case 'announcement': return <Users className="w-4 h-4" />
      case 'writers': return <PenLine className="w-4 h-4" />
      case 'readers': return <BookOpen className="w-4 h-4" />
      case 'custom': return <UserCircle className="w-4 h-4" />
    }
  }

  const getTypeLabel = (type: EmailType) => {
    switch (type) {
      case 'newsletter': return 'Subscribers'
      case 'announcement': return 'All Users'
      case 'writers': return 'Writers Only'
      case 'readers': return 'Readers Only'
      case 'custom': return 'Custom Email'
    }
  }

  const getRecipientLabel = (type: EmailType) => {
    switch (type) {
      case 'newsletter': return 'subscriber'
      case 'announcement': return 'user'
      case 'writers': return 'writer'
      case 'readers': return 'reader'
      default: return 'recipient'
    }
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Mail className="w-6 h-6 text-[var(--color-link)]" />
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">
            Send Email
          </h1>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Compose and send emails to subscribers or users
        </p>
      </div>

      <div className="bg-[var(--color-bg-card)] rounded-lg shadow-[var(--shadow-light)] p-6">
        {/* Email Type Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            Email Type
          </label>
          <div className="flex flex-wrap gap-2">
            {(['newsletter', 'announcement', 'writers', 'readers', 'custom'] as EmailType[]).map((type) => (
              <button
                key={type}
                onClick={() => setEmailType(type)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  emailType === type
                    ? 'bg-cyan-800 text-white'
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
                }`}
              >
                {getTypeIcon(type)}
                {getTypeLabel(type)}
              </button>
            ))}
          </div>
        </div>

        {/* Recipient Info */}
        {emailType !== 'custom' && (
          <div className="mb-6 p-3 bg-[var(--color-bg-tertiary)] rounded-md">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Recipients:{' '}
              {isLoading ? (
                <span className="animate-pulse">Loading...</span>
              ) : (
                <span className="font-medium text-[var(--color-text-primary)]">
                  {recipientCount} {getRecipientLabel(emailType)}
                  {recipientCount !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
        )}

        {/* Custom Email Input */}
        {emailType === 'custom' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Recipient Email
            </label>
            <input
              type="email"
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full px-4 py-2 border border-[var(--color-border-medium)] rounded-md text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] focus:ring-[var(--color-link)] focus:border-[var(--color-link)] focus:outline-none"
            />
          </div>
        )}

        {/* Subject */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter email subject"
            className="w-full px-4 py-2 border border-[var(--color-border-medium)] rounded-md text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] focus:ring-[var(--color-link)] focus:border-[var(--color-link)] focus:outline-none"
          />
        </div>

        {/* Body */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            Message
          </label>
          <div className="email-editor">
            <ReactQuill
              theme="snow"
              value={body}
              onChange={setBody}
              modules={quillModules}
              placeholder="Write your message here..."
              className="bg-[var(--color-bg-primary)] rounded-md"
            />
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-2">
            Use the toolbar to format text, add colors, and insert links.
          </p>
        </div>

        {/* Result Message */}
        {result && (
          <div
            className={`mb-6 p-3 rounded-md ${
              result.success
                ? 'bg-[var(--color-success-light)] text-[var(--color-success)]'
                : 'bg-red-50 text-[var(--color-error)] dark:bg-red-900/20'
            }`}
          >
            {result.message}
          </div>
        )}

        {/* Send Button */}
        <button
          onClick={() => setShowConfirm(true)}
          disabled={!canSend || isSending}
          className="btn-primary inline-flex items-center px-6 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4 mr-2" />
          {isSending ? 'Sending...' : 'Send Email'}
        </button>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirm}
        title="Send Email"
        message={
          emailType === 'custom'
            ? `Send this email to ${customEmail}?`
            : `Send this email to ${recipientCount} ${getRecipientLabel(emailType)}${recipientCount !== 1 ? 's' : ''}?`
        }
        confirmLabel="Send"
        cancelLabel="Cancel"
        onConfirm={handleSend}
        onCancel={() => setShowConfirm(false)}
      />

      <style jsx global>{`
        .email-editor .ql-container {
          min-height: 200px;
          font-size: 16px;
        }
        .email-editor .ql-editor {
          min-height: 200px;
        }
        .email-editor .ql-toolbar {
          background: var(--color-bg-tertiary);
          border-color: var(--color-border-medium) !important;
          border-radius: 6px 6px 0 0;
        }
        .email-editor .ql-container {
          border-color: var(--color-border-medium) !important;
          border-radius: 0 0 6px 6px;
        }
        .email-editor .ql-editor.ql-blank::before {
          color: var(--color-text-muted);
          font-style: normal;
        }
      `}</style>
    </div>
  )
}
