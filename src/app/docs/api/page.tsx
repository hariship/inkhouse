'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Copy, Check, ExternalLink, Key, Play, Square, ChevronRight } from 'lucide-react'
import ThemeToggle from '@/components/common/ThemeToggle'

const BASE_URL = '/api/v1'

interface EndpointConfig {
  id: string
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  title: string
  description: string
  params?: { name: string; type: string; required?: boolean; description: string }[]
  body?: { name: string; type: string; required?: boolean; description: string }[]
  defaultBody?: Record<string, unknown>
}

const ENDPOINTS: EndpointConfig[] = [
  {
    id: 'list-posts',
    method: 'GET',
    path: '/posts',
    title: 'List Posts',
    description: 'Retrieve a list of your posts with optional filtering and pagination.',
    params: [
      { name: 'status', type: 'string', description: 'Filter by status: draft, published, archived' },
      { name: 'page', type: 'number', description: 'Page number (default: 1)' },
      { name: 'limit', type: 'number', description: 'Items per page (default: 10, max: 100)' },
    ],
  },
  {
    id: 'create-post',
    method: 'POST',
    path: '/posts',
    title: 'Create Post',
    description: 'Create a new blog post.',
    body: [
      { name: 'title', type: 'string', required: true, description: 'Post title (max 200 chars)' },
      { name: 'content', type: 'string', required: true, description: 'Post content (HTML)' },
      { name: 'description', type: 'string', description: 'Short description/excerpt' },
      { name: 'status', type: 'string', description: 'draft or published (default: draft)' },
      { name: 'category', type: 'string', description: 'Post category' },
      { name: 'image_url', type: 'string', description: 'Featured image URL' },
      { name: 'featured', type: 'boolean', description: 'Mark as featured post (default: false)' },
      { name: 'allow_comments', type: 'boolean', description: 'Allow comments (default: true)' },
    ],
    defaultBody: {
      title: 'My New Post',
      content: '<p>Hello from the API!</p>',
      status: 'draft',
    },
  },
  {
    id: 'get-post',
    method: 'GET',
    path: '/posts/:id',
    title: 'Get Post',
    description: 'Retrieve a single post by its ID.',
  },
  {
    id: 'update-post',
    method: 'PATCH',
    path: '/posts/:id',
    title: 'Update Post',
    description: 'Update an existing post. Only include fields you want to change.',
    body: [
      { name: 'title', type: 'string', description: 'Post title' },
      { name: 'content', type: 'string', description: 'Post content (HTML)' },
      { name: 'description', type: 'string', description: 'Short description' },
      { name: 'status', type: 'string', description: 'draft, published, or archived' },
      { name: 'category', type: 'string', description: 'Post category' },
      { name: 'image_url', type: 'string', description: 'Featured image URL' },
      { name: 'featured', type: 'boolean', description: 'Mark as featured post' },
      { name: 'allow_comments', type: 'boolean', description: 'Allow comments' },
    ],
    defaultBody: {
      title: 'Updated Title',
      status: 'published',
    },
  },
  {
    id: 'delete-post',
    method: 'DELETE',
    path: '/posts/:id',
    title: 'Delete Post',
    description: 'Permanently delete a post.',
  },
]

const METHOD_COLORS = {
  GET: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  POST: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  PATCH: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  DELETE: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className="p-1.5 rounded hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      title="Copy"
    >
      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
    </button>
  )
}

function Playground({
  endpoint,
  apiKey,
  setApiKey,
}: {
  endpoint: EndpointConfig
  apiKey: string
  setApiKey: (key: string) => void
}) {
  const [postId, setPostId] = useState('')
  const [body, setBody] = useState('')
  const [response, setResponse] = useState<string | null>(null)
  const [statusCode, setStatusCode] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [responseTime, setResponseTime] = useState<number | null>(null)

  const needsId = endpoint.path.includes(':id')
  const needsBody = ['POST', 'PATCH'].includes(endpoint.method)

  useEffect(() => {
    if (endpoint.defaultBody) {
      setBody(JSON.stringify(endpoint.defaultBody, null, 2))
    } else {
      setBody('')
    }
    setResponse(null)
    setStatusCode(null)
    setResponseTime(null)
  }, [endpoint])

  const executeRequest = async () => {
    if (!apiKey) {
      setResponse(JSON.stringify({ error: 'Enter your API key above' }, null, 2))
      return
    }

    if (needsId && !postId) {
      setResponse(JSON.stringify({ error: 'Enter a post ID' }, null, 2))
      return
    }

    setIsLoading(true)
    setResponse(null)
    setStatusCode(null)

    const startTime = performance.now()

    try {
      let url = `${BASE_URL}${endpoint.path}`
      if (needsId) {
        url = url.replace(':id', postId)
      }

      const options: RequestInit = {
        method: endpoint.method,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }

      if (needsBody && body) {
        try {
          JSON.parse(body)
          options.body = body
        } catch {
          setResponse(JSON.stringify({ error: 'Invalid JSON' }, null, 2))
          setIsLoading(false)
          return
        }
      }

      const res = await fetch(url, options)
      const endTime = performance.now()
      setResponseTime(Math.round(endTime - startTime))
      setStatusCode(res.status)
      const data = await res.json()
      setResponse(JSON.stringify(data, null, 2))
    } catch {
      setResponse(JSON.stringify({ error: 'Request failed' }, null, 2))
    } finally {
      setIsLoading(false)
    }
  }

  const [origin, setOrigin] = useState('https://inkhouse.haripriya.org')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin)
    }
  }, [])

  const url = `${origin}${BASE_URL}${needsId ? endpoint.path.replace(':id', postId || '{id}') : endpoint.path}`

  const curlParts = [
    { label: 'curl', value: `-X ${endpoint.method}` },
    { label: 'url', value: `"${url}"` },
    { label: '-H', value: `"Authorization: Bearer ${apiKey || 'your_api_key'}"` },
    { label: '-H', value: `"Content-Type: application/json"` },
    ...(needsBody && body ? [{ label: '-d', value: `'${body.replace(/\n/g, '').replace(/\s+/g, ' ')}'` }] : []),
  ]

  const curlCommand = `curl -X ${endpoint.method} "${url}" \\\n  -H "Authorization: Bearer ${apiKey || 'your_api_key'}" \\\n  -H "Content-Type: application/json"${needsBody && body ? ` \\\n  -d '${body.replace(/\n/g, '')}'` : ''}`

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg-secondary)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border-light)] bg-[var(--color-bg-card)]">
        <div className="flex items-center gap-2 mb-3">
          <span className={`px-2 py-0.5 text-xs font-bold rounded border ${METHOD_COLORS[endpoint.method]}`}>
            {endpoint.method}
          </span>
          <code className="text-sm text-[var(--color-text-primary)]">{endpoint.path}</code>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="ink_..."
            className="w-full px-3 py-1.5 text-sm border border-[var(--color-border-medium)] rounded bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-mono"
          />
        </div>
      </div>

      {/* Inputs */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {needsId && (
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">
              Post ID
            </label>
            <input
              type="text"
              value={postId}
              onChange={(e) => setPostId(e.target.value)}
              placeholder="123"
              className="w-full px-3 py-1.5 text-sm border border-[var(--color-border-medium)] rounded bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
            />
          </div>
        )}

        {needsBody && (
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">
              Request Body
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 text-sm border border-[var(--color-border-medium)] rounded bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-mono"
            />
          </div>
        )}

        {/* Terminal */}
        <div className="rounded-lg overflow-hidden border border-[var(--color-border-light)] bg-[var(--color-bg-primary)]">
          {/* Header */}
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-b border-[var(--color-border-light)]">
            <button
              onClick={executeRequest}
              disabled={isLoading}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 bg-[var(--color-text-secondary)] text-[var(--color-bg-primary)] active:scale-95 hover:bg-[var(--color-text-primary)]"
              title={isLoading ? 'Stop' : 'Run'}
            >
              {isLoading ? (
                <Square className="w-3 h-3 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>
            <CopyButton text={curlCommand} />
          </div>

          {/* Body */}
          <div className="p-4 font-mono text-sm max-h-96 overflow-auto">
            {/* Command */}
            <div className="text-[var(--color-text-secondary)]">
              <span className="text-[var(--color-text-muted)]">$ </span>
              {curlParts.map((part, i) => (
                <div key={i} className={i > 0 ? 'pl-4' : 'inline'}>
                  {i > 0 && <span className="text-[var(--color-text-muted)]">  </span>}
                  <span className="text-[var(--color-link)]">{part.label}</span>{' '}
                  <span className="text-[var(--color-text-primary)]">{part.value}</span>
                  {i < curlParts.length - 1 && <span className="text-[var(--color-text-muted)]"> \</span>}
                </div>
              ))}
            </div>

            {/* Output */}
            {isLoading && (
              <div className="mt-4 text-[var(--color-text-muted)] flex items-center gap-2">
                <span className="inline-block w-2 h-5 bg-[var(--color-text-muted)] animate-pulse" />
              </div>
            )}

            {response && !isLoading && (
              <div className="mt-4 border-t border-[var(--color-border-light)] pt-4">
                <div className="flex items-center gap-2 mb-3 text-[var(--color-text-muted)]">
                  {statusCode && (
                    <span className={statusCode >= 200 && statusCode < 300 ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-error)]'}>
                      [{statusCode}]
                    </span>
                  )}
                  {responseTime && <span>{responseTime}ms</span>}
                </div>
                <pre className="text-[var(--color-text-primary)] whitespace-pre-wrap">{response}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ApiDocsPage() {
  const [activeEndpoint, setActiveEndpoint] = useState<EndpointConfig>(ENDPOINTS[0])
  const [apiKey, setApiKey] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'endpoint'>('overview')

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--color-bg-card)] border-b border-[var(--color-border-light)]">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-lg font-bold text-[var(--color-text-primary)]">
                Inkhouse
              </Link>
              <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
              <span className="text-sm text-[var(--color-text-secondary)]">API Reference</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/api-keys"
                className="text-sm text-[var(--color-link)] hover:underline flex items-center gap-1"
              >
                <Key className="w-4 h-4" />
                Get API Key
                <ExternalLink className="w-3 h-3" />
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1800px] mx-auto flex">
        {/* Sidebar */}
        <aside className="hidden lg:block w-60 shrink-0 border-r border-[var(--color-border-light)] h-[calc(100vh-56px)] sticky top-14 overflow-y-auto">
          <nav className="p-4">
            <div className="mb-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full text-left py-1.5 text-sm font-medium ${
                  activeTab === 'overview'
                    ? 'text-[var(--color-link)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Overview
              </button>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                Endpoints
              </h3>
              {ENDPOINTS.map((ep) => (
                <button
                  key={ep.id}
                  onClick={() => {
                    setActiveEndpoint(ep)
                    setActiveTab('endpoint')
                  }}
                  className={`w-full text-left py-1.5 text-sm flex items-center gap-2 ${
                    activeEndpoint.id === ep.id && activeTab === 'endpoint'
                      ? 'text-[var(--color-link)]'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <span className={`w-14 text-[10px] font-bold px-1 rounded text-center ${METHOD_COLORS[ep.method]}`}>
                    {ep.method}
                  </span>
                  {ep.title}
                </button>
              ))}
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="lg:grid lg:grid-cols-2">
            {/* Documentation */}
            <div className="p-6 lg:border-r border-[var(--color-border-light)] overflow-auto">
              {activeTab === 'overview' ? (
                <>
                  {/* Introduction */}
                  <section className="mb-10">
                    <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-3">
                      Inkhouse API
                    </h1>
                    <p className="text-[var(--color-text-secondary)] mb-3">
                      The Inkhouse API lets you programmatically manage your blog posts.
                      All endpoints require authentication and return JSON responses.
                    </p>
                    <div className="p-3 bg-[var(--color-bg-secondary)] rounded-lg">
                      <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">Base URL</p>
                      <code className="text-sm text-[var(--color-link)]">
                        https://inkhouse.haripriya.org/api/v1
                      </code>
                    </div>
                  </section>

                  {/* Authentication */}
                  <section className="mb-10">
                    <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-3">
                      Authentication
                    </h2>
                    <p className="text-[var(--color-text-secondary)] mb-3">
                      All requests require a Bearer token in the Authorization header.
                      Generate an API key from your{' '}
                      <Link href="/dashboard/api-keys" className="text-[var(--color-link)] hover:underline">
                        dashboard
                      </Link>.
                    </p>
                    <div className="p-3 bg-[var(--color-bg-secondary)] rounded-lg font-mono text-sm">
                      <span className="text-[var(--color-text-muted)]">Authorization:</span>{' '}
                      <span className="text-[var(--color-text-primary)]">Bearer ink_your_api_key</span>
                    </div>
                  </section>

                  {/* Rate Limits */}
                  <section className="mb-10">
                    <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-3">
                      Rate Limits
                    </h2>
                    <p className="text-[var(--color-text-secondary)] mb-3">
                      API requests are limited to <strong>1,000 requests per hour</strong> per API key.
                    </p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-border-light)]">
                          <th className="text-left py-2 text-[var(--color-text-muted)] font-medium">Header</th>
                          <th className="text-left py-2 text-[var(--color-text-muted)] font-medium">Description</th>
                        </tr>
                      </thead>
                      <tbody className="text-[var(--color-text-secondary)]">
                        <tr className="border-b border-[var(--color-border-light)]">
                          <td className="py-2 font-mono text-xs">X-RateLimit-Limit</td>
                          <td className="py-2">Max requests per hour</td>
                        </tr>
                        <tr className="border-b border-[var(--color-border-light)]">
                          <td className="py-2 font-mono text-xs">X-RateLimit-Remaining</td>
                          <td className="py-2">Requests remaining</td>
                        </tr>
                        <tr>
                          <td className="py-2 font-mono text-xs">X-RateLimit-Reset</td>
                          <td className="py-2">Reset timestamp (ISO)</td>
                        </tr>
                      </tbody>
                    </table>
                  </section>

                  {/* Errors */}
                  <section>
                    <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-3">
                      Errors
                    </h2>
                    <p className="text-[var(--color-text-secondary)] mb-3">
                      Errors return a JSON object with <code className="text-xs bg-[var(--color-bg-tertiary)] px-1 rounded">success: false</code> and an error code.
                    </p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-border-light)]">
                          <th className="text-left py-2 text-[var(--color-text-muted)] font-medium">Code</th>
                          <th className="text-left py-2 text-[var(--color-text-muted)] font-medium">Status</th>
                          <th className="text-left py-2 text-[var(--color-text-muted)] font-medium">Description</th>
                        </tr>
                      </thead>
                      <tbody className="text-[var(--color-text-secondary)]">
                        <tr className="border-b border-[var(--color-border-light)]">
                          <td className="py-2 font-mono text-xs">UNAUTHORIZED</td>
                          <td className="py-2">401</td>
                          <td className="py-2">Invalid API key</td>
                        </tr>
                        <tr className="border-b border-[var(--color-border-light)]">
                          <td className="py-2 font-mono text-xs">FORBIDDEN</td>
                          <td className="py-2">403</td>
                          <td className="py-2">No access to resource</td>
                        </tr>
                        <tr className="border-b border-[var(--color-border-light)]">
                          <td className="py-2 font-mono text-xs">NOT_FOUND</td>
                          <td className="py-2">404</td>
                          <td className="py-2">Resource not found</td>
                        </tr>
                        <tr className="border-b border-[var(--color-border-light)]">
                          <td className="py-2 font-mono text-xs">VALIDATION_ERROR</td>
                          <td className="py-2">400</td>
                          <td className="py-2">Invalid request</td>
                        </tr>
                        <tr>
                          <td className="py-2 font-mono text-xs">RATE_LIMITED</td>
                          <td className="py-2">429</td>
                          <td className="py-2">Too many requests</td>
                        </tr>
                      </tbody>
                    </table>
                  </section>
                </>
              ) : (
                /* Endpoint Details */
                <section>
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-2 py-1 text-xs font-bold rounded border ${METHOD_COLORS[activeEndpoint.method]}`}>
                      {activeEndpoint.method}
                    </span>
                    <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                      {activeEndpoint.title}
                    </h2>
                  </div>
                  <p className="text-[var(--color-text-secondary)] mb-3">
                    {activeEndpoint.description}
                  </p>
                  <div className="p-3 bg-[var(--color-bg-secondary)] rounded-lg font-mono text-sm mb-5">
                    <span className="text-[var(--color-text-muted)]">{activeEndpoint.method}</span>{' '}
                    <span className="text-[var(--color-text-primary)]">{activeEndpoint.path}</span>
                  </div>

                  {activeEndpoint.params && activeEndpoint.params.length > 0 && (
                    <div className="mb-5">
                      <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                        Query Parameters
                      </h3>
                      <div className="space-y-3">
                        {activeEndpoint.params.map((param) => (
                          <div key={param.name} className="flex flex-col sm:flex-row sm:gap-4">
                            <div className="w-48 shrink-0 flex items-baseline gap-1.5">
                              <code className="text-base text-[var(--color-link)]">{param.name}</code>
                              <span className="text-sm text-[var(--color-text-muted)]">{param.type}</span>
                            </div>
                            <p className="text-base text-[var(--color-text-secondary)]">{param.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeEndpoint.body && activeEndpoint.body.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                        Request Body
                      </h3>
                      <div className="space-y-3">
                        {activeEndpoint.body.map((field) => (
                          <div key={field.name} className="flex flex-col sm:flex-row sm:gap-4">
                            <div className="w-48 shrink-0 flex items-baseline gap-1.5">
                              <code className="text-base text-[var(--color-link)]">{field.name}</code>
                              {field.required && <span className="text-red-500">*</span>}
                              <span className="text-sm text-[var(--color-text-muted)]">{field.type}</span>
                            </div>
                            <p className="text-base text-[var(--color-text-secondary)]">{field.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>

            {/* Playground */}
            <div className="hidden lg:block h-[calc(100vh-56px)] sticky top-14">
              <Playground
                endpoint={activeEndpoint}
                apiKey={apiKey}
                setApiKey={setApiKey}
              />
            </div>
          </div>

          {/* Mobile Playground */}
          <div className="lg:hidden border-t border-[var(--color-border-light)]">
            <div className="p-4">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <Play className="w-5 h-5" />
                Try it out
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  Select Endpoint
                </label>
                <select
                  value={activeEndpoint.id}
                  onChange={(e) => setActiveEndpoint(ENDPOINTS.find(ep => ep.id === e.target.value) || ENDPOINTS[0])}
                  className="w-full px-3 py-2 border border-[var(--color-border-medium)] rounded bg-[var(--color-bg-card)] text-[var(--color-text-primary)]"
                >
                  {ENDPOINTS.map((ep) => (
                    <option key={ep.id} value={ep.id}>
                      {ep.method} {ep.path} - {ep.title}
                    </option>
                  ))}
                </select>
              </div>
              <Playground
                endpoint={activeEndpoint}
                apiKey={apiKey}
                setApiKey={setApiKey}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
