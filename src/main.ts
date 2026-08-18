import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { initTheme } from './composables/useTheme'
import './assets/styles/main.css'

// El index.html ya escribió el tema en el <html> antes del primer pintado;
// esto deja el estado de la app y el DOM diciendo lo mismo.
initTheme()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
