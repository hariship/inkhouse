'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { User, JWTPayload } from '@/types'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const isLoggingOut = useRef(false)

  // Auto-logout when session expires
  const handleSessionExpiry = useCallback(async () => {
    if (isLoggingOut.current) return
    isLoggingOut.current = true

    setUser(null)
    // Redirect to login with a message
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard') || window.location.pathname.startsWith('/admin')) {
      window.location.href = '/login?expired=true'
    }

    isLoggingOut.current = false
  }, [])

  // Set up global fetch interceptor for 401 responses
  useEffect(() => {
    const originalFetch = window.fetch

    window.fetch = async (...args) => {
      const response = await originalFetch(...args)

      // Check if we got a 401 and it's not the auth endpoints
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url
      const isAuthEndpoint = url.includes('/api/auth/')

      if (response.status === 401 && !isAuthEndpoint && user) {
        // Try to refresh the token first
        const refreshResponse = await originalFetch('/api/auth/me')
        if (!refreshResponse.ok) {
          // Refresh failed, session truly expired
          handleSessionExpiry()
        }
        // If refresh succeeded, the original request already failed
        // User should retry their action
      }

      return response
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [user, handleSessionExpiry])

  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        return true
      } else {
        setUser(null)
        return false
      }
    } catch {
      setUser(null)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial auth check
  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  // Proactive token refresh - refresh every 3 hours to stay ahead of 4-hour expiry
  useEffect(() => {
    if (!user) return

    const REFRESH_INTERVAL = 3 * 60 * 60 * 1000 // 3 hours in ms

    const interval = setInterval(() => {
      refreshUser()
    }, REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [user, refreshUser])

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setUser(data.user)
        return { success: true }
      }

      return { success: false, error: data.error || 'Login failed' }
    } catch {
      return { success: false, error: 'Network error' }
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    // Return default state during SSR or when context is not available
    return {
      user: null,
      isLoading: true,
      isAuthenticated: false,
      login: async () => ({ success: false, error: 'Not initialized' }),
      logout: async () => {},
      refreshUser: async () => false,
    }
  }
  return context
}
