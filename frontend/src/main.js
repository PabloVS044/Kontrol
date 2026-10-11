import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { i18n } from './locales/index.js'
import { useTheme } from './composables/useTheme.js'
import { initLocale } from './composables/useLocale.js'
import { installLocalizedValidation } from './utils/formValidation.js'
import '../globals.css'

// Antes de montar, para que el primer render ya tenga el tema resuelto.
useTheme().initTheme()

// Igual con el idioma: antes vivía en el `onMounted` del navbar, así que las
// rutas sin navbar (login, registro, configuración, landing) nacían en inglés
// aunque la preferencia guardada dijera español.
initLocale()

// Los avisos de los campos obligatorios los pinta el navegador en SU idioma
// ("Please fill out this field."), así que aparecían en inglés dentro de
// pantallas en español. Con esto el texto sale del diccionario.
installLocalizedValidation(i18n.global.t)

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)
app.mount('#app')
