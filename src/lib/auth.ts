import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { cookies } from 'next/headers'
import { JWTPayload } from '@/types'

const JWT_SECRET = process.env.JWT_SECRET!
const REFRESH_SECRET = process.env.REFRESH_SECRET!

const ACCESS_TOKEN_EXPIRY = '4h'
const REFRESH_TOKEN_EXPIRY = '30d'

export function generateAccessToken(payload: JWTPayload): string {
  // Strip JWT-specific properties to avoid conflict with expiresIn
  const { exp, iat, nbf, ...cleanPayload } = payload as JWTPayload & { exp?: number; iat?: number; nbf?: number }
  return jwt.sign(cleanPayload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY })
}

export function generateRefreshToken(payload: JWTPayload): string {
  // Strip JWT-specific properties to avoid conflict with expiresIn
  const { exp, iat, nbf, ...cleanPayload } = payload as JWTPayload & { exp?: number; iat?: number; nbf?: number }
  return jwt.sign(cleanPayload, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY })
}

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as JWTPayload
  } catch {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function getAuthUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) return null

  return verifyAccessToken(token)
}

export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies()

  cookieStore.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 4 * 60 * 60, // 4 hours
    path: '/',
  })

  cookieStore.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
  })
}

export async function clearAuthCookies() {
  const cookieStore = await cookies()
  cookieStore.delete('access_token')
  cookieStore.delete('refresh_token')
}

export function generateTempPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

/**
 * Check if a user is super admin based on database role
 */
export function isSuperAdmin(user: { role: string } | null): boolean {
  if (!user) return false
  return user.role === 'super_admin'
}

/**
 * Check if user has admin-level access (super_admin or admin)
 */
export function isAdmin(user: { role: string } | null): boolean {
  if (!user) return false
  return user.role === 'super_admin' || user.role === 'admin'
}
