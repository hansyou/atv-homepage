<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { Link } from '../../api/types'
import { useCatalog } from '../../stores/catalog'
import { useUi } from '../../stores/ui'

const props = defineProps<{ link: Link | null }>()
const emit = defineEmits<{ done: [] }>()

const catalog = useCatalog()
const ui = useUi()

const form = reactive({
  title: '',
  url: '',
  icon: '',
  folder_id: '',
  is_pinned: false,
})
const error = ref('')
const saving = ref(false)

watch(
  () => props.link,
  (link) => {
    form.title = link?.title ?? ''
    form.url = link?.url ?? ''
    form.icon = link?.icon ?? ''
    form.folder_id = link?.folder_id ?? ''
    form.is_pinned = link ? link.is_pinned === 1 : false
    error.value = ''
  },
  { immediate: true },
)

async function submit(): Promise<void> {
  saving.value = true
  error.value = ''
  try {
    const payload = {
      title: form.title,
      url: form.url,
      icon: form.icon,
      folder_id: form.folder_id || null,
      is_pinned: form.is_pinned,
    }
    if (props.link) {
      await catalog.updateLink(props.link.id, payload)
      ui.toast('已保存', 'success')
    } else {
      await catalog.createLink(payload)
      ui.toast('网址已创建', 'success')
    }
    emit('done')
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="editor" @submit.prevent="submit">
    <h3 class="editor__title">{{ link ? '编辑网址' : '新建网址' }}</h3>

    <div class="editor__field field">
      <label class="field__label" for="link-title">名称</label>
      <input id="link-title" v-model="form.title" class="input" placeholder="例如：我的博客" maxlength="80" required />
    </div>

    <div class="editor__field field">
      <label class="field__label" for="link-url">网址</label>
      <input id="link-url" v-model="form.url" class="input" type="url" placeholder="https://example.com" required />
    </div>

    <div class="editor__field field">
      <label class="field__label" for="link-icon">图标链接（选填）</label>
      <input id="link-icon" v-model="form.icon" class="input" placeholder="留空则用名称首字（字母/汉字）占位" />
    </div>

    <div class="editor__field field">
      <label class="field__label" for="link-folder">文件夹</label>
      <select id="link-folder" v-model="form.folder_id" class="input select">
        <option value="">不放入文件夹（显示在启动台）</option>
        <option v-for="folder in catalog.folders" :key="folder.id" :value="folder.id">{{ folder.name }}</option>
      </select>
    </div>

    <label class="editor__check">
      <input v-model="form.is_pinned" type="checkbox" />
      <span class="editor__check-box" aria-hidden="true" />
      放入首页快捷位（最多 5 个）
    </label>

    <p v-if="error" class="field__error editor__error">{{ error }}</p>

    <div class="editor__actions">
      <button type="button" class="btn" @click="emit('done')">取消</button>
      <button type="submit" class="btn btn--primary" :disabled="saving">{{ saving ? '保存中…' : '保存' }}</button>
    </div>
  </form>
</template>

<style scoped>
.editor {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.editor__title {
  margin: 0;
  font-size: 19px;
  font-weight: 620;
}

.editor__check {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--text-dim);
  cursor: pointer;
  user-select: none;
}

.editor__check input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.editor__check-box {
  width: 20px;
  height: 20px;
  border-radius: 7px;
  border: 1px solid var(--stroke-strong);
  display: grid;
  place-items: center;
  transition:
    background var(--dur-fast) ease,
    border-color var(--dur-fast) ease,
    transform var(--dur-fast) var(--ease-spring);
}

.editor__check-box::after {
  content: '';
  width: 9px;
  height: 5px;
  border-left: 2px solid #fff;
  border-bottom: 2px solid #fff;
  transform: rotate(-45deg) scale(0.6);
  opacity: 0;
  transition: opacity var(--dur-fast) ease, transform var(--dur-fast) var(--ease-spring);
}

.editor__check input:checked + .editor__check-box {
  background: var(--accent-strong);
  border-color: var(--accent-strong);
  transform: scale(1.06);
}

.editor__check input:checked + .editor__check-box::after {
  opacity: 1;
  transform: rotate(-45deg) scale(1);
}

.editor__error {
  margin: 0;
}

.editor__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 6px;
}
</style>
