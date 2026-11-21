import { createApp } from 'vue';
import './styles/globals.css';
import './styles/style.css';
import './styles/inventory.css';
import './styles/orders.css';
import './styles/income-statistics.css';
import './styles/shop-profile.css';
import './styles/profile-shoppe.css';
import './styles/login-sketch.css';
import './styles/customer.css';
import App from './App.vue';
import router from './router';

createApp(App).use(router).mount('#app');
