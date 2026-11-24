import { createRouter, createWebHistory } from 'vue-router';
import { authState } from '@/stores/auth';
import { STORAGE_KEYS } from '@/lib/constants';
import HomeView from '@/views/HomeView.vue';
import LoginView from '@/views/LoginView.vue';
import ShopView from '@/views/ShopView.vue';
import ProductDetailView from '@/views/ProductDetailView.vue';
import WishlistView from '@/views/shop/WishlistView.vue';
import MyOrdersView from '@/views/shop/MyOrdersView.vue';
import TrackOrderView from '@/views/shop/TrackOrderView.vue';
import OrdersView from '@/views/OrdersView.vue';
import InventoryView from '@/views/InventoryView.vue';
import IncomeStatisticsView from '@/views/IncomeStatisticsView.vue';
import ShopProfileView from '@/views/ShopProfileView.vue';
import SellerAccountView from '@/views/SellerAccountView.vue';
import AdminView from '@/views/admin/AdminView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/shop', name: 'shop', component: ShopView },
    { path: '/shop/wishlist', name: 'wishlist', component: WishlistView },
    { path: '/shop/my-orders', name: 'my-orders', component: MyOrdersView },
    { path: '/shop/track-order', name: 'track-order', component: TrackOrderView },
    { path: '/product-detail/:id', name: 'product-detail', component: ProductDetailView },
    { path: '/orders', name: 'orders', component: OrdersView },
    { path: '/inventory', name: 'inventory', component: InventoryView },
    { path: '/income-statistics', name: 'income-statistics', component: IncomeStatisticsView },
    { path: '/transactions', name: 'transactions', component: IncomeStatisticsView },
    { path: '/vouchers', name: 'vouchers', component: InventoryView },
    { path: '/shop-profile', name: 'shop-profile', component: ShopProfileView },
    { path: '/seller/account', name: 'seller-account', component: SellerAccountView },
    { path: '/admin', name: 'admin', component: AdminView },
    { path: '/admin/sellers', name: 'admin-sellers', component: AdminView },
    { path: '/admin/users', name: 'admin-users', component: AdminView },
    { path: '/admin/products', name: 'admin-products', component: AdminView },
    { path: '/admin/payouts', name: 'admin-payouts', component: AdminView },
    { path: '/admin/settings', name: 'admin-settings', component: AdminView },
    { path: '/:pathMatch(.*)*', redirect: '/shop' },
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

router.beforeEach((to) => {
  const path = to.path;
  const token = authState.token;
  const role = authState.user?.role;

  const isLoginPage = path === '/login';
  const isPublicShopperPage =
    path === '/shop' ||
    path.startsWith('/shop/track-order') ||
    path.startsWith('/shop/wishlist') ||
    path.startsWith('/shop-profile') ||
    path.startsWith('/product-detail');

  const isSellerAdminOnlyPage =
    path === '/inventory' ||
    path === '/orders' ||
    path === '/income-statistics' ||
    path === '/vouchers' ||
    path === '/transactions' ||
    path.startsWith('/seller') ||
    path.startsWith('/admin');

  if (!token && !isLoginPage && !isPublicShopperPage) {
    sessionStorage.setItem(STORAGE_KEYS.REDIRECT_PATH, to.fullPath);
    return '/login';
  }

  if (token && role === 'Customer' && (isSellerAdminOnlyPage || path === '/')) {
    return path === '/orders' ? '/shop/my-orders' : '/shop';
  }

  if (token && role === 'Seller' && path.startsWith('/admin')) {
    return '/';
  }

  if (token && isLoginPage) {
    return role === 'Admin' ? '/admin' : role === 'Customer' ? '/shop' : '/';
  }

  return true;
});

export default router;
