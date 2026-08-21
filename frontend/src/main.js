import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { i18n } from './locales/index.js'
import { useTheme } from './composables/useTheme.js'
import '../globals.css'

// Antes de montar, para que el primer render ya tenga el tema resuelto.
useTheme().initTheme()

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)
app.mount('#app')
