import './assets/main.css'

import ToastPlugin from 'vue-toast-notification'
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp({});
createApp(App).mount('#app')
app.use(ToastPlugin);
