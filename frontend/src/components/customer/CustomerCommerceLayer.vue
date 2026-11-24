<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { Order } from '@/types';
import { useAuth } from '@/stores/auth';
import { useCart } from '@/stores/cart';
import { invalidateCatalog } from '@/composables/useCatalog';
import CustomerCartModal from './CustomerCartModal.vue';
import CustomerCheckoutModal from './CustomerCheckoutModal.vue';
import OrderSuccessModal from './OrderSuccessModal.vue';

const route = useRoute();
const { user } = useAuth();
const { clearCart, setIsCheckoutOpen } = useCart();

const placedOrder = ref<Order | null>(null);
const payment = ref<'COD' | 'ONLINE'>('COD');

const isSellerOrAdmin = computed(
  () => user.value?.role === 'Seller' || user.value?.role === 'Admin'
);
const hidden = computed(() => route.path === '/login' || isSellerOrAdmin.value);

async function handleSuccess(order: Order, method: 'COD' | 'ONLINE') {
  clearCart();
  await invalidateCatalog();
  setIsCheckoutOpen(false);
  payment.value = method;
  placedOrder.value = order;
}
</script>

<template>
  <template v-if="!hidden">
    <CustomerCartModal />
    <CustomerCheckoutModal @success="handleSuccess" />
    <OrderSuccessModal :order="placedOrder" :payment="payment" @close="placedOrder = null" />
  </template>
</template>
