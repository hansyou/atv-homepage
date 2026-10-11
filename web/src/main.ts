import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { vIntersect } from './directives/intersect'
import './styles/theme.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.directive('intersect', vIntersect)
app.mount('#app')
