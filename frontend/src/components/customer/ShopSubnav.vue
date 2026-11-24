<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuth } from '@/stores/auth';
import { useShopper } from '@/stores/shopper';

const route = useRoute();
const { token, user } = useAuth();
const { wishlist } = useShopper();

const isSeller = computed(() => user.value?.role === 'Seller' || user.value?.role === 'Admin');

const links = computed(() =>
  isSeller.value
    ? [
        { href: '/shop', label: '👁 Góc Người Mua (Xem Trước)' },
        { href: '/inventory', label: '📦 Quay Lại Tồn Kho' },
        { href: '/orders', label: '📋 Quản Lý Đơn Hàng' },
      ]
    : [
        { href: '/shop', label: 'Mua Sắm' },
        { href: '/shop/wishlist', label: `Yêu Thích${wishlist.value.length ? ` (${wishlist.value.length})` : ''}` },
        ...(token.value ? [{ href: '/shop/my-orders', label: 'Đơn Hàng Của Tôi' }] : []),
        { href: '/shop/track-order', label: 'Tra Cứu Đơn' },
      ]
);
</script>

<template>
  <nav class="customer-subnav" aria-label="Điều hướng khu mua sắm">
    <router-link
      v-for="l in links"
      :key="l.href"
      :to="l.href"
      :class="['customer-subnav-link', (l.href === '/shop' ? route.path === '/shop' : route.path.startsWith(l.href)) ? 'active' : '']"
    >
      {{ l.label }}
    </router-link>
  </nav>
</template>
