<script setup lang="ts">
import { useAuth } from '../../stores/auth'
import { useUi } from '../../stores/ui'
import LaunchpadGrid from './LaunchpadGrid.vue'

const auth = useAuth()
const ui = useUi()
</script>

<template>
  <div class="lp">
    <header class="lp__head">
      <h2 class="lp__title">启动台</h2>
      <div class="lp__actions">
        <button v-if="auth.authed" class="btn lp__edit" @click="ui.toggleLaunchpadEditing()">
          {{ ui.launchpadEditing ? '完成' : '编辑顺序' }}
        </button>
        <button class="btn btn--primary lp__manage" @click="ui.openDrawer('site')">
          {{ auth.authed ? '管理内容' : '登录管理' }}
        </button>
      </div>
    </header>

    <LaunchpadGrid />
  </div>
</template>

<style scoped>
.lp__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: clamp(22px, 3.6vh, 42px);
}

.lp__title {
  margin: 0;
  font-size: clamp(28px, 4.2vw, 50px);
  font-weight: 680;
  letter-spacing: 0.02em;
  background: linear-gradient(180deg, #ffffff 30%, rgba(226, 232, 255, 0.7));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.lp__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: none;
}

.lp__edit {
  min-width: 92px;
}

@media (max-width: 560px) {
  .lp__head {
    align-items: center;
  }
}
</style>
