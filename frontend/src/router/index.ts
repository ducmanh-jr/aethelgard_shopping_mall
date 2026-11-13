import { createRouter, createWebHistory } from 'vue-router';
import ProductsView from '../views/ProductsView.vue';
import OrdersView from '../views/OrdersView.vue';
import LoginView from '../views/LoginView.vue';
import AiAssistantView from '../views/AiAssistantView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'products', component: ProductsView },
    { path: '/orders', name: 'orders', component: OrdersView },
    { path: '/ai', name: 'ai', component: AiAssistantView },
    { path: '/login', name: 'login', component: LoginView }
  ]
});

export default router;
