<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Order } from '@/types';
import Modal from '@/components/ui/Modal.vue';
import { useAuth } from '@/stores/auth';
import { useToast } from '@/stores/toast';
import { orderService } from '@/services/order.service';
import { formatVND } from '@/lib/utils';

const props = defineProps<{
  order: Order | null;
  payment: 'COD' | 'ONLINE';
}>();

const emit = defineEmits<{
  close: [];
}>();

const { token } = useAuth();
const { showToast } = useToast();
const isRedirectingVnpay = ref(false);

const trackHref = computed(() => {
  if (!props.order) return '/shop/track-order';
  return token.value
    ? `/shop/my-orders?code=${encodeURIComponent(props.order.orderCode)}`
    : `/shop/track-order?code=${encodeURIComponent(props.order.orderCode)}&phone=${encodeURIComponent(props.order.customerPhone || '')}`;
});

async function handlePayWithVnpay() {
  if (!props.order) return;
  isRedirectingVnpay.value = true;
  try {
    const url = await orderService.getVnpayUrl(props.order.id);
    if (url) {
      window.location.href = url;
    } else {
      showToast('Không lấy được URL thanh toán VNPay.');
    }
  } catch {
    showToast('Lỗi kết nối cổng thanh toán VNPay Sandbox.');
  } finally {
    isRedirectingVnpay.value = false;
  }
}

async function copyCode() {
  if (!props.order) return;
  try {
    await navigator.clipboard.writeText(props.order.orderCode);
    showToast(`Đã sao chép mã đơn ${props.order.orderCode}`);
  } catch {
    showToast('Không thể sao chép, vui lòng ghi lại mã đơn hàng.');
  }
}
</script>

<template>
  <Modal :is-open="!!order" size="md" @close="emit('close')">
    <div v-if="order" class="customer-success">
      <div class="customer-success-icon">✓</div>
      <h3 class="customer-success-title">Đặt hàng thành công!</h3>
      <p class="customer-success-sub">
        Cảm ơn {{ order.customerName || 'bạn' }} đã mua sắm tại Aethelgard Mall. Boutique sẽ xác nhận đơn trong thời gian sớm nhất.
      </p>

      <div class="customer-success-code">
        <span>Mã đơn hàng</span>
        <strong>{{ order.orderCode }}</strong>
        <button type="button" class="customer-text-btn" @click="copyCode">Sao chép</button>
      </div>

      <div class="customer-success-summary">
        <div class="summary-row">
          <span>Số sản phẩm</span>
          <span>{{ order.items?.reduce((s, i) => s + i.quantity, 0) || 0 }} món</span>
        </div>
        <div class="summary-row">
          <span>Giao tới</span>
          <span class="customer-success-address">{{ order.shippingAddress }}</span>
        </div>
        <div v-if="order.estimatedDelivery" class="summary-row">
          <span>Dự kiến giao</span>
          <span>{{ order.estimatedDelivery }}</span>
        </div>
        <div class="summary-row grand-total">
          <span>Tổng thanh toán</span>
          <strong class="accent-price">{{ formatVND(order.totalAmount || 0) }}</strong>
        </div>
      </div>

      <div
        v-if="payment === 'ONLINE'"
        class="customer-transfer-box"
        style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 16px"
      >
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px">
          <span style="font-size: 1.25rem">💳</span>
          <strong style="color: #0369a1; font-size: 0.95rem">Cổng Thanh Toán VNPay Sandbox</strong>
        </div>
        <p style="font-size: 0.82rem; color: #0c4a6e; margin-bottom: 12px">
          Đơn hàng của bạn đã được khởi tạo. Bạn có thể thanh toán trực tuyến ngay qua thẻ ATM nội địa hoặc quét mã QR VNPay Sandbox.
        </p>

        <button
          type="button"
          :disabled="isRedirectingVnpay"
          :style="{
            width: '100%',
            padding: '12px 16px',
            background: isRedirectingVnpay ? '#94A3B8' : '#0284C7',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 700,
            cursor: isRedirectingVnpay ? 'not-allowed' : 'pointer',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
          }"
          @click="handlePayWithVnpay"
        >
          {{ isRedirectingVnpay ? 'Đang chuyển hướng sang VNPay...' : '🚀 Thanh Toán Ngay Qua VNPay Sandbox' }}
        </button>

        <div style="font-size: 0.78rem; color: #475569; background: #fff; padding: 10px; border-radius: 8px; border: 1px dashed #cbd5e1">
          <strong style="display: block; color: #0f172a; margin-bottom: 4px">Thẻ Thử Nghiệm Sandbox VNPay:</strong>
          <div>• Ngân hàng: <strong>NCB</strong></div>
          <div>• Số thẻ: <strong>9704198526191432198</strong></div>
          <div>• Tên chủ thẻ: <strong>NGUYEN VAN A</strong></div>
          <div>• Ngày phát hành: <strong>07/15</strong> | OTP: <strong>123456</strong></div>
        </div>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn-secondary" @click="emit('close')">Tiếp tục mua sắm</button>
        <router-link :to="trackHref" class="btn-primary customer-btn-link" @click="emit('close')">
          Theo dõi đơn hàng
        </router-link>
      </div>
    </div>
  </Modal>
</template>
