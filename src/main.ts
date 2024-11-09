import './assets/main.css'


import { createApp } from 'vue'
import App from './App.vue'
import Toast from "primevue/toast";
import ToastService from "primevue/toastservice";

const app = createApp({});
createApp(App).mount('#app')
app.use(ToastService);
