<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { Order } from '@/types';
import { orderService } from '@/services/order.service';
import { useAuth } from '@/stores/auth';
import OrderTimeline from '@/components/customer/OrderTimeline.vue';
import ShopSubnav from '@/components/customer/ShopSubnav.vue';
import { formatVND } from '@/lib/utils';
import { FALLBACK_IMAGE } from '@/lib/constants';
import {
  CUSTOMER_STATUS_LABELS,
  formatDateTimeVN,
  isValidVNPhone,
  normalizePhone,
  normalizeStatus,
} from '@/lib/customer';

const phoneTail = (p: string) => normalizePhone(p).replace(/\D/g, '').slice(-9);
const maskName = (name: string) =>
  name
    .split(' ')
    .map((w, i, arr) => (i === arr.length - 1 ? w : `${w.charAt(0)}.`))
    .join(' ');

const route = useRoute();
const { token } = useAuth();

const code = ref(String(route.query.code || ''));
const phone = ref(String(route.query.phone || ''));
const order = ref<Order | null>(null);
const error = ref('');
const isLoading = ref(false);

const vnpayStatus = computed(() => String(route.query.vnpay || ''));
const status = computed(() => normalizeStatus(order.value?.status));

async function lookup(orderCode: string, phoneNumber: string) {
  error.value = '';
  order.value = null;
  const normalizedCode = orderCode.trim().toUpperCase();
  if (!/^AG-\d{4}-\d{3,6}$/.test(normalizedCode)) {
    error.value = 'Mã đơn hàng có dạng AG-2026-XXXX';
    return;
  }
  if (!isValidVNPhone(phoneNumber)) {
    error.value = 'Vui lòng nhập đúng số điện thoại đã dùng khi đặt hàng';
    return;
  }
  isLoading.value = true;
  try {
    const found = await orderService.getOrderByCode(normalizedCode);
    if (!found || phoneTail(found.customerPhone || '') !== phoneTail(phoneNumber)) {
      error.value = 'Không tìm thấy đơn hàng khớp với mã đơn và số điện thoại đã nhập.';
      return;
    }
    order.value = found;
  } catch {
    error.value = 'Không tìm thấy đơn hàng khớp với mã đơn và số điện thoại đã nhập.';
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  if (route.query.code && route.query.phone) {
    lookup(String(route.query.code), String(route.query.phone));
  }
});

function onImgError(e: Event) {
  (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
}
</script>

<template>
  <div class="customer-page">
    <div class="customer-page-head">
      <div>
        <h1 class="customer-page-title">Tra Cứu Đơn Hàng</h1>
        <p class="customer-page-sub">
          Không cần đăng nhập — nhập mã đơn (in trong màn hình xác nhận/email) và số điện thoại người nhận.
        </p>
      </div>
      <ShopSubnav />
    </div>

    <div
      v-if="vnpayStatus === 'success'"
      style="
        background: #ecfdf5;
        border: 1px solid #6ee7b7;
        color: #065f46;
        padding: 16px 20px;
        border-radius: 12px;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1);
      "
    >
      <span style="font-size: 1.5rem">🎉</span>
      <div>
        <strong style="display: block; font-size: 1rem; margin-bottom: 2px">
          Thanh Toán Qua Cổng VNPay Sandbox Thành Công!
        </strong>
        <span style="font-size: 0.88rem">
          Hệ thống đã tự động ghi nhận thanh toán và cập nhật trạng thái đơn hàng sang <strong>Đang chuẩn bị hàng</strong>.
        </span>
      </div>
    </div>

    <div
      v-if="vnpayStatus === 'cancel'"
      style="background: #fffbeb; border: 1px solid #fcd34d; color: #92400e; padding: 14px 18px; border-radius: 12px; margin-bottom: 20px"
    >
      ⚠️ Giao dịch qua cổng thanh toán VNPay đã bị hủy hoặc chưa hoàn tất. Bạn có thể tra cứu trạng thái đơn hàng bên dưới.
    </div>

    <form class="customer-track-form" @submit.prevent="lookup(code, phone)">
      <div class="form-group">
        <label for="track-code" class="customer-form-label">Mã đơn hàng</label>
        <input id="track-code" v-model="code" class="form-control" placeholder="AG-2026-1234" />
      </div>
      <div class="form-group">
        <label for="track-phone" class="customer-form-label">Số điện thoại đặt hàng</label>
        <input id="track-phone" v-model="phone" type="tel" class="form-control" placeholder="0912345678" />
      </div>
      <button type="submit" class="customer-ai-submit" :disabled="isLoading">
        {{ isLoading ? 'Đang tra cứu...' : 'Tra cứu' }}
      </button>
    </form>

    <div v-if="error" class="customer-alert-error">{{ error }}</div>

    <article v-if="order" class="customer-order-card expanded customer-track-result">
      <header class="customer-order-head">
        <div>
          <span class="customer-order-code">{{ order.orderCode }}</span>
          <span class="customer-order-date">Đặt lúc {{ formatDateTimeVN(order.createdAt) }}</span>
        </div>
        <span class="customer-track-status">{{ CUSTOMER_STATUS_LABELS[status] || order.statusLabel }}</span>
      </header>

      <OrderTimeline :status="order.status" :last-location="order.lastUpdateLocation" />

      <div class="customer-order-detail-grid">
        <div>
          <h4>Người nhận</h4>
          <p>{{ maskName(order.customerName || '') }}</p>
        </div>
        <div>
          <h4>Vận chuyển</h4>
          <p>{{ order.carrier }} · Mã vận đơn {{ order.trackingCode || '—' }}</p>
          <p v-if="order.estimatedDelivery">Dự kiến giao: {{ order.estimatedDelivery }}</p>
        </div>
      </div>

      <div class="customer-order-items">
        <div v-for="item in order.items" :key="item.id" class="customer-order-item">
          <img :src="item.imageUrl || FALLBACK_IMAGE" :alt="item.productName" @error="onImgError" />
          <div class="customer-order-item-info">
            <strong>{{ item.productName }}</strong>
            <span>{{ item.specs || 'Tiêu chuẩn' }} · x{{ item.quantity }}</span>
          </div>
          <span class="customer-order-item-price">{{ formatVND(item.subtotal || item.price * item.quantity) }}</span>
        </div>
      </div>

      <footer class="customer-order-foot">
        <span>
          Tổng thanh toán: <strong class="customer-order-total">{{ formatVND(order.totalAmount || 0) }}</strong>
        </span>
        <router-link v-if="token" :to="`/shop/my-orders?code=${order.orderCode}`" class="customer-btn-outline">
          Xem trong Đơn Hàng Của Tôi
        </router-link>
        <router-link v-else to="/login" class="customer-btn-outline">Đăng nhập để quản lý đơn</router-link>
      </footer>
    </article>
  </div>
</template>
