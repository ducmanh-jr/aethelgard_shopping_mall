<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Order } from '@/types';
import { useAuth } from '@/stores/auth';
import { useCart } from '@/stores/cart';
import { orderService } from '@/services/order.service';
import { formatVND } from '@/lib/utils';
import { calcOrderTotals, getErrorMessage, isValidVNPhone, normalizePhone } from '@/lib/customer';

const LAST_SHIPPING_KEY = 'aethelgard_last_shipping';

const PAYMENT_LABELS = {
  COD: 'Thanh toán khi nhận hàng (COD)',
  ONLINE: 'Thanh toán trực tuyến (Cổng thanh toán)',
} as const;

const emit = defineEmits<{
  success: [order: Order, payment: 'COD' | 'ONLINE'];
}>();

const { user } = useAuth();
const { cart, totalAmount, isCheckoutOpen, setIsCheckoutOpen, setIsCartOpen } = useCart();

const customerName = ref('');
const customerPhone = ref('');
const customerEmail = ref('');
const address = ref('');
const note = ref('');
const paymentMethod = ref<'COD' | 'ONLINE'>('COD');
const isSubmitting = ref(false);
const errors = ref<Record<string, string>>({});
const serverError = ref('');

watch(isCheckoutOpen, (open) => {
  if (!open) return;
  try {
    const saved = JSON.parse(localStorage.getItem(LAST_SHIPPING_KEY) || 'null');
    if (saved) {
      if (!customerName.value) customerName.value = saved.customerName || '';
      if (!customerPhone.value) customerPhone.value = saved.customerPhone || '';
      if (!customerEmail.value) customerEmail.value = saved.customerEmail || '';
      if (!address.value) address.value = saved.address || '';
    }
  } catch {}
  if (user.value) {
    if (!customerName.value) customerName.value = user.value.fullName || '';
    if (!customerEmail.value) customerEmail.value = user.value.email || '';
  }
  serverError.value = '';
});

const totals = computed(() => calcOrderTotals(totalAmount.value));

function validate() {
  const next: Record<string, string> = {};
  if (customerName.value.trim().length < 2) next.customerName = 'Vui lòng nhập họ tên người nhận';
  if (!isValidVNPhone(customerPhone.value)) next.customerPhone = 'Số điện thoại không hợp lệ (VD: 0912345678)';
  if (customerEmail.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.value.trim())) {
    next.customerEmail = 'Email không đúng định dạng';
  }
  if (address.value.trim().length < 10) next.address = 'Vui lòng nhập địa chỉ chi tiết (số nhà, đường, phường, quận, tỉnh)';
  errors.value = next;
  return Object.keys(next).length === 0;
}

async function handleSubmit() {
  if (user.value?.role === 'Seller' || user.value?.role === 'Admin') {
    serverError.value = 'Tài khoản Người bán không được phép đặt hàng. Vui lòng đăng nhập tài khoản Khách hàng để mua sắm.';
    return;
  }
  if (cart.value.length === 0) {
    serverError.value = 'Giỏ hàng đang trống!';
    return;
  }
  if (!validate()) return;

  isSubmitting.value = true;
  serverError.value = '';
  try {
    const phone = normalizePhone(customerPhone.value);
    const order = await orderService.createOrder({
      customerName: customerName.value.trim(),
      customerEmail: customerEmail.value.trim(),
      customerPhone: phone,
      shippingAddress: address.value.trim() + (note.value.trim() ? ` (Ghi chú: ${note.value.trim()})` : ''),
      paymentMethod: PAYMENT_LABELS[paymentMethod.value],
      items: cart.value.map((item) => ({
        productId: item.product.id,
        specs: item.specs || 'Tiêu chuẩn',
        quantity: item.quantity,
      })),
    });

    try {
      localStorage.setItem(
        LAST_SHIPPING_KEY,
        JSON.stringify({
          customerName: customerName.value.trim(),
          customerPhone: phone,
          customerEmail: customerEmail.value.trim(),
          address: address.value.trim(),
        })
      );
    } catch {}
    note.value = '';
    emit('success', order, paymentMethod.value);
  } catch (err) {
    serverError.value = getErrorMessage(
      err,
      'Không thể tạo đơn hàng. Vui lòng kiểm tra lại tồn kho hoặc kết nối máy chủ.'
    );
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div v-if="isCheckoutOpen" id="customer-checkout-modal" class="modal-backdrop">
    <div class="modal-card customer-checkout-card" style="max-width: 560px">
      <div class="modal-header">
        <h2>Thanh Toán Đơn Hàng</h2>
        <button class="close-btn" type="button" aria-label="Đóng" @click="setIsCheckoutOpen(false)">
          &times;
        </button>
      </div>

      <div class="customer-checkout-items">
        <div v-for="item in cart" :key="`${item.product.id}-${item.specs}`" class="customer-checkout-item">
          <span class="customer-checkout-item-name">
            {{ item.quantity }} × {{ item.product.name }}
            <em>{{ item.specs }}</em>
          </span>
          <span>{{ formatVND(item.product.basePrice * item.quantity) }}</span>
        </div>
        <button
          type="button"
          class="customer-text-btn"
          @click="setIsCheckoutOpen(false); setIsCartOpen(true)"
        >
          ← Chỉnh sửa giỏ hàng
        </button>
      </div>

      <form class="checkout-form" novalidate @submit.prevent="handleSubmit">
        <div class="customer-form-grid">
          <div class="form-group">
            <label for="cus-name" class="customer-form-label">Họ và tên (*)</label>
            <input id="cus-name" v-model="customerName" placeholder="Nguyễn Văn A" class="form-control" autocomplete="name" />
            <span v-if="errors.customerName" class="customer-field-error">{{ errors.customerName }}</span>
          </div>
          <div class="form-group">
            <label for="cus-phone" class="customer-form-label">Số điện thoại (*)</label>
            <input id="cus-phone" v-model="customerPhone" type="tel" placeholder="0912345678" class="form-control" autocomplete="tel" />
            <span v-if="errors.customerPhone" class="customer-field-error">{{ errors.customerPhone }}</span>
          </div>
        </div>

        <div class="form-group customer-form-row">
          <label for="cus-email" class="customer-form-label">Email nhận thông báo</label>
          <input id="cus-email" v-model="customerEmail" type="email" placeholder="email@example.com" class="form-control" autocomplete="email" />
          <span v-if="errors.customerEmail" class="customer-field-error">{{ errors.customerEmail }}</span>
        </div>

        <div class="form-group customer-form-row">
          <label for="cus-address" class="customer-form-label">Địa chỉ giao hàng (*)</label>
          <textarea
            id="cus-address"
            v-model="address"
            placeholder="Nhập số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành..."
            class="form-control"
            rows="2"
            autocomplete="street-address"
          />
          <span v-if="errors.address" class="customer-field-error">{{ errors.address }}</span>
        </div>

        <div class="form-group customer-form-row">
          <label for="cus-note" class="customer-form-label">Ghi chú đơn hàng (Tùy chọn)</label>
          <input id="cus-note" v-model="note" type="text" placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi tới..." class="form-control" />
        </div>

        <div class="form-group customer-form-row">
          <label class="customer-form-label">Phương thức thanh toán</label>
          <div class="radio-group" style="margin-top: 8px">
            <label
              v-for="method in (['COD', 'ONLINE'] as const)"
              :key="method"
              :class="['radio-card customer-radio-card', paymentMethod === method ? 'active' : '']"
            >
              <input
                type="radio"
                name="customer_payment_method"
                :value="method"
                :checked="paymentMethod === method"
                @change="paymentMethod = method"
              />
              <div class="radio-content">
                <strong style="font-size: 0.9rem">{{ PAYMENT_LABELS[method] }}</strong>
                <p style="margin: 0; font-size: 0.78rem; color: #64748b">
                  {{
                    method === 'COD'
                      ? 'Trả tiền mặt trực tiếp cho shipper khi nhận kiện hàng'
                      : 'Chuyển khoản theo mã QR / thông tin tài khoản hiển thị sau khi đặt hàng'
                  }}
                </p>
              </div>
            </label>
          </div>
        </div>

        <div class="checkout-footer" style="border-top: 1px solid #e2e8f0; padding-top: 14px">
          <div class="summary-row">
            <span>Tạm tính:</span>
            <span>{{ formatVND(totals.subtotal) }}</span>
          </div>
          <div class="summary-row">
            <span>Phí vận chuyển:</span>
            <span>{{ totals.shipping === 0 ? 'Miễn phí' : formatVND(totals.shipping) }}</span>
          </div>
          <div class="summary-row">
            <span>Thuế VAT (8%):</span>
            <span>{{ formatVND(totals.taxes) }}</span>
          </div>
          <div class="summary-row" style="margin-bottom: 14px">
            <strong>Tổng thanh toán:</strong>
            <strong class="accent-price" style="font-size: 1.2rem; color: #8065c9">{{ formatVND(totals.total) }}</strong>
          </div>

          <div v-if="serverError" class="customer-alert-error">{{ serverError }}</div>

          <button
            type="submit"
            :disabled="isSubmitting"
            class="btn-primary btn-large"
            :style="{
              width: '100%',
              padding: '12px',
              background: isSubmitting ? '#94A3B8' : '#8065c9',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }"
          >
            {{ isSubmitting ? 'Đang Xử Lý Đơn Hàng...' : 'Xác Nhận Đặt Hàng' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
