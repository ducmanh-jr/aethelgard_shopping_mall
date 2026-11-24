<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ShoppingBag,
  Heart,
  User,
  LogIn,
  LogOut,
  ChevronDown,
  Store,
  Package,
  ShieldCheck,
  LayoutDashboard,
} from 'lucide-vue-next';
import { useAuth } from '@/stores/auth';
import { useCart } from '@/stores/cart';
import { useShopper } from '@/stores/shopper';
import NotificationBell from './NotificationBell.vue';

const route = useRoute();
const router = useRouter();
const { user, token, logout } = useAuth(router);
const { totalQty, setIsCartOpen } = useCart();
const { wishlist } = useShopper();

const isUserMenuOpen = ref(false);
const userMenuRef = ref<HTMLDivElement | null>(null);

function handleClickOutside(event: MouseEvent) {
  if (userMenuRef.value && !userMenuRef.value.contains(event.target as Node)) {
    isUserMenuOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
});

watch(
  () => route.path,
  () => {
    isUserMenuOpen.value = false;
  }
);

const isLoginPage = computed(() => route.path === '/login');
const isSeller = computed(() => user.value?.role === 'Seller');
const isAdmin = computed(() => user.value?.role === 'Admin');
const isManagement = computed(() => isSeller.value || isAdmin.value);
const displayName = computed(
  () => user.value?.fullName || user.value?.email?.split('@')[0]?.toUpperCase() || 'Khách Mua Sắm'
);
const initial = computed(() => displayName.value.charAt(0).toUpperCase());
</script>

<template>
  <header v-if="!isLoginPage" class="navbar sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
    <div class="nav-container max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
      <div class="logo flex items-center">
        <router-link to="/" class="flex items-center gap-3 group" style="text-decoration: none; color: inherit">
          <div class="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-white font-serif font-bold text-xl shadow-md border border-slate-800 tracking-tighter group-hover:scale-105 transition-all duration-200">
            <span class="bg-gradient-to-tr from-slate-200 via-white to-slate-400 bg-clip-text text-transparent italic">Æ</span>
          </div>
          <div class="flex flex-col">
            <span class="text-lg font-extrabold tracking-[0.16em] text-slate-900 uppercase font-serif leading-tight">
              Aethelgard
            </span>
            <span class="text-[9px] tracking-[0.2em] text-slate-400 font-semibold uppercase -mt-0.5">
              Trung Tâm Mua Sắm • Tích Hợp AI
            </span>
          </div>
        </router-link>
      </div>

      <nav class="nav-links flex items-center gap-1 md:gap-2 overflow-x-auto max-w-full whitespace-nowrap">
        <router-link
          :to="isAdmin ? '/admin' : isSeller ? '/' : '/shop'"
          :class="[
            'nav-link px-3 py-1.5 rounded-xl text-sm font-semibold transition-all',
            (isAdmin ? route.path.startsWith('/admin') : isSeller ? route.path === '/' : route.path === '/shop')
              ? 'bg-sky-50 text-sky-700 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80',
          ]"
        >
          {{ isAdmin ? 'Quản Trị Sàn' : 'Cửa Hàng' }}
        </router-link>

        <router-link
          v-if="!isManagement"
          :to="token ? '/shop/my-orders' : '/shop/track-order'"
          :class="[
            'nav-link px-3 py-1.5 rounded-xl text-sm font-semibold transition-all',
            route.path.startsWith('/shop/my-orders') || route.path.startsWith('/shop/track-order')
              ? 'bg-sky-50 text-sky-700 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80',
          ]"
        >
          {{ token ? 'Đơn Hàng Của Tôi' : 'Tra Cứu Đơn' }}
        </router-link>

        <router-link
          v-if="isManagement"
          to="/shop"
          :class="[
            'nav-link px-3 py-1.5 rounded-xl text-sm font-semibold transition-all',
            route.path === '/shop' || route.path.startsWith('/shop/')
              ? 'bg-sky-50 text-sky-700 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80',
          ]"
          title="Xem sàn dưới góc nhìn người mua"
        >
          Góc Người Mua
        </router-link>

        <template v-if="token && isManagement">
          <router-link
            to="/inventory"
            :class="[
              'nav-link px-3 py-1.5 rounded-xl text-sm font-semibold transition-all',
              route.path === '/inventory' ? 'bg-sky-50 text-sky-700 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80',
            ]"
          >
            Tồn Kho
          </router-link>
          <router-link
            to="/orders"
            :class="[
              'nav-link px-3 py-1.5 rounded-xl text-sm font-semibold transition-all',
              route.path === '/orders' ? 'bg-sky-50 text-sky-700 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80',
            ]"
          >
            Đơn Hàng
          </router-link>
          <router-link
            to="/income-statistics"
            :class="[
              'nav-link px-3 py-1.5 rounded-xl text-sm font-semibold transition-all',
              route.path === '/income-statistics' ? 'bg-sky-50 text-sky-700 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80',
            ]"
          >
            Doanh Thu
          </router-link>
          <router-link
            v-if="isSeller"
            to="/shop-profile"
            :class="[
              'nav-link px-3 py-1.5 rounded-xl text-sm font-semibold transition-all',
              route.path === '/shop-profile' ? 'bg-sky-50 text-sky-700 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80',
            ]"
          >
            Hồ Sơ Shop
          </router-link>
        </template>
      </nav>

      <div class="nav-actions flex items-center gap-2.5">
        <NotificationBell />

        <router-link
          v-if="!isManagement"
          to="/shop/wishlist"
          :class="[
            'relative p-2.5 rounded-xl border transition-all flex items-center justify-center',
            route.path.startsWith('/shop/wishlist')
              ? 'border-sky-300 bg-sky-50'
              : 'border-slate-200 hover:border-sky-300 hover:bg-sky-50',
          ]"
          title="Danh sách yêu thích"
          aria-label="Danh sách yêu thích"
        >
          <Heart class="w-4 h-4 text-slate-700" />
          <span
            v-if="wishlist.length > 0"
            class="absolute -top-1.5 -right-1.5 min-w-[18px] h-4.5 px-1 rounded-full bg-sky-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs"
          >
            {{ wishlist.length }}
          </span>
        </router-link>

        <button
          v-if="!isManagement"
          type="button"
          class="relative p-2.5 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-slate-700 transition-all flex items-center justify-center cursor-pointer"
          title="Mở giỏ hàng mua sắm"
          @click="setIsCartOpen(true)"
        >
          <ShoppingBag class="w-4 h-4 text-slate-700" />
          <span
            v-if="totalQty > 0"
            class="absolute -top-1.5 -right-1.5 min-w-[18px] h-4.5 px-1 rounded-full bg-sky-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs"
          >
            {{ totalQty }}
          </span>
        </button>

        <div v-if="token && user" ref="userMenuRef" class="relative">
          <button
            type="button"
            class="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full text-xs font-bold text-slate-800 transition-all cursor-pointer"
            :aria-expanded="isUserMenuOpen"
            @click="isUserMenuOpen = !isUserMenuOpen"
          >
            <div class="w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center text-[10px] font-black">
              {{ initial }}
            </div>
            <span class="hidden sm:inline max-w-[110px] truncate">{{ displayName }}</span>
            <span
              :class="[
                'text-[10px] px-1.5 py-0.5 rounded font-semibold',
                isAdmin ? 'bg-slate-900 text-white' : 'bg-sky-100 text-sky-700',
              ]"
            >
              {{ user.role }}
            </span>
            <ChevronDown
              :class="['w-3.5 h-3.5 text-slate-400 transition-transform duration-200', isUserMenuOpen ? 'rotate-180' : '']"
            />
          </button>

          <div
            :class="[
              'absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-2 origin-top-right transition-all duration-200 transform z-50',
              isUserMenuOpen
                ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 scale-95 -translate-y-2 pointer-events-none',
            ]"
          >
            <div class="p-3 border-b border-slate-100 mb-1">
              <div class="font-bold text-slate-900 text-sm truncate">{{ displayName }}</div>
              <div class="text-[11px] text-slate-400 truncate">{{ user.email }}</div>
              <div class="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-sky-700 text-[10px] font-bold">
                <ShieldCheck class="w-3 h-3" />
                <span>{{ user.role }}</span>
              </div>
            </div>

            <div class="space-y-0.5 text-xs font-semibold text-slate-700">
              <template v-if="isAdmin">
                <router-link to="/admin" class="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-sky-50 hover:text-sky-700 transition-colors">
                  <LayoutDashboard class="w-4 h-4 text-sky-600" />
                  <span>Tổng Quan Quản Trị</span>
                </router-link>
                <router-link to="/admin/sellers" class="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-sky-50 hover:text-sky-700 transition-colors">
                  <Store class="w-4 h-4 text-sky-600" />
                  <span>Duyệt Gian Hàng</span>
                </router-link>
              </template>

              <template v-if="isSeller">
                <router-link to="/seller/account" class="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-sky-50 hover:text-sky-700 transition-colors">
                  <User class="w-4 h-4 text-slate-400" />
                  <span>Cài Đặt Tài Khoản</span>
                </router-link>
                <router-link to="/shop-profile" class="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-sky-50 hover:text-sky-700 transition-colors">
                  <Store class="w-4 h-4 text-slate-400" />
                  <span>Hồ Sơ Gian Hàng</span>
                </router-link>
              </template>

              <router-link
                v-if="!isManagement"
                to="/shop/my-orders"
                class="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-sky-50 hover:text-sky-700 transition-colors"
              >
                <Package class="w-4 h-4 text-slate-400" />
                <span>Đơn Hàng Của Tôi</span>
              </router-link>

              <button
                type="button"
                class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                @click="logout"
              >
                <LogOut class="w-4 h-4 text-rose-500" />
                <span>Đăng Xuất</span>
              </button>
            </div>
          </div>
        </div>

        <router-link
          v-else
          to="/login"
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-md shadow-sky-100 transition-all"
        >
          <LogIn class="w-4 h-4" />
          <span>Đăng Nhập</span>
        </router-link>
      </div>
    </div>
  </header>
</template>
