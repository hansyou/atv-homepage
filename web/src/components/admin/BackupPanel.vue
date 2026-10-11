<script setup lang="ts">
import { computed, ref } from 'vue'
import type { BackupFile } from '../../api/types'
import { useCatalog } from '../../stores/catalog'
import { useUi } from '../../stores/ui'

const catalog = useCatalog()
const ui = useUi()

const raw = ref('')
const pending = ref<BackupFile | null>(null)
const error = ref('')
const busy = ref(false)

const summary = computed(() => {
  if (!pending.value) return ''
  const { links, folders, settings } = pending.value.data
  return `备份包含 ${links.length} 个网址、${folders.length} 个文件夹、${settings.length} 项设置`
})

async function onExport(): Promise<void> {
  try {
    const data = await catalog.exportBackup()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `atv-homepage-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    ui.toast('备份文件已下载', 'success')
  } catch (err) {
    ui.toast((err as Error).message, 'error')
  }
}

function onFileChange(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    raw.value = String(reader.result ?? '')
    parse()
  }
  reader.readAsText(file)
  input.value = ''
}

function parse(): void {
  error.value = ''
  pending.value = null
  if (!raw.value.trim()) {
    error.value = '请先选择备份文件或粘贴备份内容'
    return
  }
  try {
    const data = JSON.parse(raw.value) as BackupFile
    if (data?.app !== 'atv-homepage' || !data?.data) {
      error.value = '不是有效的 ATV Homepage 备份文件'
      return
    }
    pending.value = data
  } catch {
    error.value = 'JSON 解析失败，请检查文件内容'
  }
}

async function onRestore(): Promise<void> {
  if (!pending.value) return
  if (!(await ui.confirm('恢复将覆盖当前全部网址与文件夹，确定继续吗？', { danger: true }))) return
  busy.value = true
  try {
    await catalog.restoreBackup(pending.value)
    ui.toast('恢复成功', 'success')
    raw.value = ''
    pending.value = null
  } catch (err) {
    ui.toast((err as Error).message, 'error')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="backup">
    <section class="backup__card">
      <h3 class="backup__title">导出备份</h3>
      <p class="backup__desc">下载包含全部网址、文件夹与设置的 JSON 文件。</p>
      <button class="btn btn--primary" @click="onExport">下载备份文件</button>
    </section>

    <section class="backup__card">
      <h3 class="backup__title">恢复备份</h3>
      <p class="backup__desc">选择备份文件或粘贴内容，确认后覆盖当前数据。</p>

      <input class="backup__file" type="file" accept="application/json,.json" @change="onFileChange" />

      <textarea v-model="raw" class="textarea backup__textarea" rows="5" placeholder="或把备份 JSON 粘贴到这里" @input="pending = null" />

      <div class="backup__actions">
        <button class="btn" :disabled="!raw.trim()" @click="parse">解析内容</button>
        <button class="btn btn--danger" :disabled="!pending || busy" @click="onRestore">
          {{ busy ? '恢复中…' : '覆盖恢复' }}
        </button>
      </div>

      <p v-if="error" class="field__error backup__error">{{ error }}</p>
      <p v-else-if="summary" class="backup__summary">{{ summary }}</p>
    </section>
  </div>
</template>

<style scoped>
.backup {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.backup__card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 20px;
  border-radius: var(--radius-md);
  border: 1px solid var(--stroke);
  background: rgba(255, 255, 255, 0.035);
}

.backup__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.backup__desc {
  margin: 0;
  font-size: 13px;
  color: var(--text-faint);
  line-height: 1.6;
}

.backup__file {
  width: 100%;
  font-size: 13px;
  color: var(--text-dim);
}

.backup__file::file-selector-button {
  margin-right: 12px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--stroke-strong);
  background: var(--glass);
  color: var(--text);
  cursor: pointer;
}

.backup__textarea {
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  line-height: 1.6;
}

.backup__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.backup__error {
  margin: 0;
}

.backup__summary {
  margin: 0;
  font-size: 13px;
  color: var(--accent);
}
</style>
