<script setup lang="ts">
import { computed } from 'vue';
import type { Order } from '@/types';
import { formatVND } from '@/lib/utils';
import { FALLBACK_IMAGE } from '@/lib/constants';
import { CUSTOMER_STATUS_LABELS, formatDateTimeVN, normalizeStatus } from '@/lib/customer';
import OrderTimeline from './OrderTimeline.vue';

const BADGE_CLASS: Record<string, string> = {
  PENDING: 'status-PENDING',
  CONFIRMED: 'status-CONFIRMED',
  PROCESSING: 'status-CONFIRMED',
  SHIPPED: 'status-SHIPPING',
  SHIPPING: 'status-SHIPPING',
  DELIVERED: 'status-COMPLETED',
  COMPLETED: 'status-COMPLETED',
  CANCELLED: 'status-CANCELLED',
};

const props = defineProps<{
  order: Order;
  expanded: boolean;
  isCancelling?: boolean;
  isConfirming?: boolean;
  canCancel?: boolean;
  canConfirm?: boolean;
}>();

const emit = defineEmits<{
  toggle: [];
  cancel: [order: Order];
  confirmReceived: [order: Order];
}>();

const status = computed(() => normalizeStatus(props.order.status));
const label = computed(() => CUSTOMER_STATUS_LABELS[status.value] || props.order.statusLabel || status.value);
const itemCount = computed(() => props.order.items?.reduce((s, i) => s + i.quantity, 0) || 0);
const isDelivered = computed(() => status.value === 'DELIVERED' || status.value === 'COMPLETED');
const isCustomerConfirmed = computed(() => !!props.order.lastUpdateLocation?.includes('Khách hàng đã nhận'));
const canConfirmReceived = computed(() => isDelivered.value && !isCustomerConfirmed.value);
const firstProductId = computed(
  () => props.order.items?.find((i) => i.productId)?.productId || props.order.items?.[0]?.productId
);

function onImgError(e: Event) {
  (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
}
</script>

<template>
  <article :id="`order-${order.orderCode}`" :class="['customer-order-card', expanded ? 'expanded' : '']">
    <header class="customer-order-head">
      <div>
        <span class="customer-order-code">{{ order.orderCode }}</span>
        <span class="customer-order-date">Đặt lúc {{ formatDateTimeVN(order.createdAt) }}</span>
      </div>
      <span :class="['status-badge', BADGE_CLASS[status] || 'status-PENDING']">{{ label }}</span>
    </header>

    <div class="customer-order-items">
      <div
        v-for="item in (expanded ? order.items : order.items?.slice(0, 2))"
        :key="item.id"
        class="customer-order-item"
      >
        <img :src="item.imageUrl || FALLBACK_IMAGE" :alt="item.productName" @error="onImgError" />
        <div class="customer-order-item-info">
          <strong>{{ item.productName }}</strong>
          <span>{{ item.specs || 'Tiêu chuẩn' }} · x{{ item.quantity }}</span>
        </div>
        <span class="customer-order-item-price">{{ formatVND(item.subtotal || item.price * item.quantity) }}</span>
      </div>
      <p v-if="!expanded && (order.items?.length || 0) > 2" class="customer-order-more">
        + {{ (order.items?.length || 0) - 2 }} sản phẩm khác
      </p>
    </div>

    <div v-if="expanded" class="customer-order-detail">
      <OrderTimeline :status="order.status" :last-location="order.lastUpdateLocation" />

      <div class="customer-order-detail-grid">
        <div>
          <h4>Thông tin nhận hàng</h4>
          <p>{{ order.customerName }} · {{ order.customerPhone }}</p>
          <p>{{ order.shippingAddress }}</p>
        </div>
        <div>
          <h4>Vận chuyển & thanh toán</h4>
          <p>{{ order.carrier || 'Đơn vị vận chuyển' }} · Mã vận đơn {{ order.trackingCode || '—' }}</p>
          <p v-if="order.estimatedDelivery">Dự kiến giao: {{ order.estimatedDelivery }}</p>
          <p>{{ order.paymentMethod }}</p>
        </div>
      </div>

      <div class="customer-order-money">
        <div class="summary-row"><span>Tạm tính</span><span>{{ formatVND(order.subtotal || 0) }}</span></div>
        <div class="summary-row">
          <span>Phí vận chuyển</span>
          <span>{{ order.shippingCharge ? formatVND(order.shippingCharge) : 'Miễn phí' }}</span>
        </div>
        <div class="summary-row"><span>Thuế VAT</span><span>{{ formatVND(order.taxes || 0) }}</span></div>
        <div v-if="order.discount > 0" class="summary-row">
          <span>Giảm giá</span><span>-{{ formatVND(order.discount) }}</span>
        </div>
      </div>
    </div>

    <footer class="customer-order-foot">
      <span>
        {{ itemCount }} sản phẩm · Tổng: <strong class="customer-order-total">{{ formatVND(order.totalAmount || 0) }}</strong>
      </span>
      <div class="customer-order-actions">
        <button
          v-if="status === 'PENDING' && canCancel"
          type="button"
          class="customer-btn-outline-danger"
          :disabled="isCancelling"
          @click="emit('cancel', order)"
        >
          {{ isCancelling ? 'Đang hủy...' : 'Hủy đơn' }}
        </button>

        <button
          v-if="canConfirmReceived && canConfirm"
          type="button"
          class="customer-btn-success"
          :disabled="isConfirming"
          title="Xác nhận bạn đã nhận được kiện hàng an toàn & đầy đủ"
          @click="emit('confirmReceived', order)"
        >
          {{ isConfirming ? 'Đang xác nhận...' : '✓ Đã nhận được hàng' }}
        </button>

        <template v-if="isCustomerConfirmed">
          <span
            style="
              display: inline-flex;
              align-items: center;
              gap: 4px;
              font-size: 0.8rem;
              font-weight: 700;
              color: #059669;
              padding: 6px 12px;
              background: #ecfdf5;
              border-radius: 999px;
              border: 1px solid #a7f3d0;
            "
          >
            ✓ Đã nhận hàng
          </span>
          <router-link v-if="firstProductId" :to="`/product-detail/${firstProductId}`" class="customer-btn-outline-success">
            ★ Viết đánh giá
          </router-link>
        </template>

        <button type="button" class="customer-btn-outline" @click="emit('toggle')">
          {{ expanded ? 'Thu gọn' : 'Xem chi tiết' }}
        </button>
      </div>
    </footer>
  </article>
</template>
