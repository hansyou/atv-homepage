import { Hono } from 'hono'
import type { Bindings } from '../types'
import { clearSessionCookie, isAuthenticated, setSessionCookie, signToken, verifyPassword } from '../lib/auth'
import { checkLoginAllowed, clearLoginFailures, recordLoginFailure } from '../lib/ratelimit'
import { asObject, asString } from '../lib/validate'

const auth = new Hono<{ Bindings: Bindings }>()

auth.post('/login', async (c) => {
  const body = asObject(await c.req.json().catch(() => null))
  const password = asString(body.password, 'password', { max: 256 })
  const expected = c.env.ADMIN_PASSWORD
  if (!expected) return c.json({ error: '服务端未配置 ADMIN_PASSWORD' }, 500)

  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  const key = `login:${ip}`
  const { allowed, retryAfterSec } = await checkLoginAllowed(c.env.DB, key)
  if (!allowed) {
    c.header('Retry-After', String(retryAfterSec))
    return c.json({ error: `尝试过于频繁，请 ${Math.ceil(retryAfterSec / 60)} 分钟后再试` }, 429)
  }

  if (!(await verifyPassword(password, expected))) {
    await recordLoginFailure(c.env.DB, key)
    return c.json({ error: '密码错误' }, 401)
  }

  await clearLoginFailures(c.env.DB, key)
  await setSessionCookie(c, await signToken(c.env))
  return c.json({ ok: true })
})

auth.post('/logout', async (c) => {
  await clearSessionCookie(c)
  return c.json({ ok: true })
})

auth.get('/me', async (c) => {
  return c.json({ authed: await isAuthenticated(c) })
})

export default auth
