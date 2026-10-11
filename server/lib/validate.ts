/** 请求体校验工具 */

export class ValidationError extends Error {}

export function fail(message: string): never {
  throw new ValidationError(message)
}

export function asObject(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('请求体必须是 JSON 对象')
  return body as Record<string, unknown>
}

export function asString(value: unknown, name: string, opts: { max?: number; required?: boolean; min?: number } = {}): string {
  const { max = 200, required = true, min = 1 } = opts
  if (value === undefined || value === null || value === '') {
    if (required) fail(`字段 ${name} 必填`)
    return ''
  }
  if (typeof value !== 'string') fail(`字段 ${name} 必须是字符串`)
  const trimmed = value.trim()
  if (trimmed.length < min) fail(`字段 ${name} 太短`)
  if (trimmed.length > max) fail(`字段 ${name} 超长（最多 ${max} 字符）`)
  return trimmed
}

export function asHttpUrl(value: unknown, name: string, opts: { allowEmpty?: boolean } = {}): string {
  const raw = asString(value, name, { max: 2000, required: !opts.allowEmpty })
  if (!raw) return ''
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    fail(`字段 ${name} 不是合法 URL`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') fail(`字段 ${name} 仅支持 http/https`)
  return url.toString()
}

/** 图标可为 http(s) URL 或站内相对路径 */
export function asIconUrl(value: unknown, name: string): string {
  const raw = asString(value, name, { max: 2000, required: false })
  if (!raw) return ''
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw
  return asHttpUrl(raw, name)
}

export function asBoolean(value: unknown, name: string): boolean {
  if (value === undefined || value === null) return false
  if (typeof value !== 'boolean') fail(`字段 ${name} 必须是布尔值`)
  return value
}

/** 宽松布尔：兼容备份文件里的 0/1 与 'true'/'false' */
export function asLooseBoolean(value: unknown, name: string): boolean {
  if (value === undefined || value === null || value === '') return false
  if (typeof value === 'boolean') return value
  if (value === 1 || value === 0) return value === 1
  if (value === 'true' || value === 'false') return value === 'true'
  fail(`字段 ${name} 必须是布尔值`)
}

export function asOrder(value: unknown, name: string, fallback = 0): number {
  if (value === undefined || value === null) return fallback
  const n = typeof value === 'string' ? Number(value) : value
  if (typeof n !== 'number' || !Number.isFinite(n)) fail(`字段 ${name} 必须是数字`)
  return Math.max(0, Math.round(n))
}

export function asId(value: unknown, name = 'id'): string {
  const raw = asString(value, name, { max: 64 })
  if (!/^[\w-]+$/.test(raw)) fail(`字段 ${name} 格式不正确`)
  return raw
}

export function newId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16)
}
