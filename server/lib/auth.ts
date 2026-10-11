import type { Context, Next } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import type { Bindings } from '../types'

const enc = new TextEncoder()
const dec = new TextDecoder()
export const SESSION_COOKIE = 'atv_session'
const SESSION_TTL = 7 * 24 * 60 * 60 // 7 天（秒）

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ''
  for (const b of arr) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(str: string): Uint8Array {
  const pad = str.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(pad + '='.repeat((4 - (pad.length % 4)) % 4))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function sessionSecret(env: Bindings): string {
  return env.SESSION_SECRET || env.ADMIN_PASSWORD || 'atv-homepage-dev-secret'
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(data)))
}

/** 生成签名会话 token：base64url(payload).base64url(hmac) */
export async function signToken(env: Bindings): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ exp: Date.now() + SESSION_TTL * 1000, rnd: crypto.randomUUID() })))
  return `${payload}.${await hmac(sessionSecret(env), payload)}`
}

export async function verifyToken(env: Bindings, token?: string | null): Promise<boolean> {
  if (!token) return false
  const dot = token.indexOf('.')
  if (dot <= 0) return false
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = await hmac(sessionSecret(env), payload)
  if (sig.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i)
  if (diff !== 0) return false
  try {
    const claims = JSON.parse(dec.decode(b64urlDecode(payload)))
    return typeof claims?.exp === 'number' && claims.exp > Date.now()
  } catch {
    return false
  }
}

/** 密码比对：先做 SHA-256 摘要再常量时间比较，避免直接字符串比较泄露时序 */
export async function verifyPassword(provided: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([sha256hex(provided), sha256hex(expected)])
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function sha256hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(input))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function isSecureRequest(c: Context): boolean {
  return c.req.url.startsWith('https://') || c.req.header('x-forwarded-proto') === 'https'
}

export async function setSessionCookie(c: Context, token: string): Promise<void> {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecureRequest(c),
    sameSite: 'Strict',
    path: '/',
    maxAge: SESSION_TTL,
  })
}

export async function clearSessionCookie(c: Context): Promise<void> {
  deleteCookie(c, SESSION_COOKIE, { path: '/' })
}

export async function isAuthenticated(c: Context): Promise<boolean> {
  return verifyToken(c.env, getCookie(c, SESSION_COOKIE))
}

/** 写操作鉴权中间件 */
export async function requireAuth(c: Context, next: Next) {
  if (!(await isAuthenticated(c))) return c.json({ error: 'unauthorized' }, 401)
  await next()
}
