-- ATV Homepage · D1 schema
-- 初始化：wrangler d1 execute atv-homepage --file=schema.sql

CREATE TABLE IF NOT EXISTS links (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  url         TEXT NOT NULL,
  icon        TEXT,
  folder_id   TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_pinned   INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_links_folder ON links (folder_id);
CREATE INDEX IF NOT EXISTS idx_links_sort ON links (sort_order);

CREATE TABLE IF NOT EXISTS folders (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#6366f1',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS login_attempts (
  key           TEXT PRIMARY KEY,
  fails         INTEGER NOT NULL DEFAULT 0,
  locked_until  INTEGER NOT NULL DEFAULT 0,
  last_attempt  INTEGER NOT NULL DEFAULT 0
);

-- 默认数据：仅两个示例网址（首字占位图标），其余留给用户自定义
INSERT OR IGNORE INTO links (id, title, url, icon, folder_id, sort_order, is_pinned, created_at, updated_at)
VALUES
  ('seed-cloudflare', 'Cloudflare', 'https://dash.cloudflare.com', NULL, NULL, 0, 1, strftime('%s','now') * 1000, strftime('%s','now') * 1000),
  ('seed-github',     'GitHub',     'https://github.com',          NULL, NULL, 1, 1, strftime('%s','now') * 1000, strftime('%s','now') * 1000);

-- 默认壁纸（图片在 web/public/default.jpg，随静态资源发布）
INSERT OR IGNORE INTO settings (key, value) VALUES ('wallpaper_url', '/default.jpg');
