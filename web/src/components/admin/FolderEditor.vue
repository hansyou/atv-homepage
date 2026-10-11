<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { Folder } from '../../api/types'
import { useCatalog } from '../../stores/catalog'
import { useUi } from '../../stores/ui'

const props = defineProps<{ folder: Folder | null }>()
const emit = defineEmits<{ done: [] }>()

const catalog = useCatalog()
const ui = useUi()

const form = reactive({ name: '', color: '#6366f1' })
const error = ref('')
const saving = ref(false)

const PRESETS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#64748b']

watch(
  () => props.folder,
  (folder) => {
    form.name = folder?.name ?? ''
    form.color = folder?.color ?? '#6366f1'
    error.value = ''
  },
  { immediate: true },
)

async function submit(): Promise<void> {
  saving.value = true
  error.value = ''
  try {
    if (props.folder) {
      await catalog.updateFolder(props.folder.id, { name: form.name, color: form.color })
      ui.toast('已保存', 'success')
    } else {
      await catalog.createFolder({ name: form.name, color: form.color })
      ui.toast('文件夹已创建', 'success')
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
    <h3 class="editor__title">{{ folder ? '编辑文件夹' : '新建文件夹' }}</h3>

    <div class="editor__field field">
      <label class="field__label" for="folder-name">名称</label>
      <input id="folder-name" v-model="form.name" class="input" placeholder="例如：工作" maxlength="40" required />
    </div>

    <div class="field">
      <span class="field__label">主题色</span>
      <div class="editor__swatches">
        <button
          v-for="color in PRESETS"
          :key="color"
          type="button"
          class="editor__swatch"
          :class="{ 'is-active': form.color === color }"
          :style="{ background: color }"
          :aria-label="color"
          @click="form.color = color"
        />
        <input v-model="form.color" type="color" class="editor__color" aria-label="自定义颜色" />
      </div>
    </div>

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

.editor__swatches {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.editor__swatch {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid transparent;
  transition: transform var(--dur-fast) var(--ease-spring), border-color var(--dur-fast) ease;
}

.editor__swatch:hover {
  transform: scale(1.14);
}

.editor__swatch.is-active {
  border-color: #fff;
  transform: scale(1.12);
}

.editor__color {
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: none;
  cursor: pointer;
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
