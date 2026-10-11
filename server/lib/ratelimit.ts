/** 登录失败限速：同 IP 连续 5 次失败锁定 10 分钟 */

const MAX_FAILS = 5
const LOCK_MS = 10 * 60 * 1000
const WINDOW_MS = 60 * 60 * 1000

export async function checkLoginAllowed(db: D1Database, key: string): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const now = Date.now()
  const row = await db.prepare('SELECT fails, locked_until, last_attempt FROM login_attempts WHERE key = ?').bind(key).first<{
    fails: number
    locked_until: number
    last_attempt: number
  }>()
  if (!row) return { allowed: true, retryAfterSec: 0 }
  if (row.locked_until > now) return { allowed: false, retryAfterSec: Math.ceil((row.locked_until - now) / 1000) }
  // 超过窗口期自动重置
  if (now - row.last_attempt > WINDOW_MS) {
    await db.prepare('DELETE FROM login_attempts WHERE key = ?').bind(key).run()
    return { allowed: true, retryAfterSec: 0 }
  }
  return { allowed: true, retryAfterSec: 0 }
}

export async function recordLoginFailure(db: D1Database, key: string): Promise<void> {
  const now = Date.now()
  const row = await db.prepare('SELECT fails FROM login_attempts WHERE key = ?').bind(key).first<{ fails: number }>()
  const fails = (row?.fails ?? 0) + 1
  const lockedUntil = fails >= MAX_FAILS ? now + LOCK_MS : 0
  await db
    .prepare(
      `INSERT INTO login_attempts (key, fails, locked_until, last_attempt) VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET fails = excluded.fails, locked_until = excluded.locked_until, last_attempt = excluded.last_attempt`,
    )
    .bind(key, fails, lockedUntil, now)
    .run()
}

export async function clearLoginFailures(db: D1Database, key: string): Promise<void> {
  await db.prepare('DELETE FROM login_attempts WHERE key = ?').bind(key).run()
}
