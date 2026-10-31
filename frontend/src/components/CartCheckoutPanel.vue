<script setup lang="ts">
import { reactive } from 'vue';
import { authState } from '../stores/auth';
import type { CartItem } from '../types/models';

const props = defineProps<{
  cart: CartItem[];
}>();

const emit = defineEmits<{
  remove: [productId: number];
  close: [];
  submit: [payload: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    shippingAddress: string;
    paymentMethod: string;
  }];
}>();

const checkoutForm = reactive({
  customerName: authState.user?.fullName || '',
  customerEmail: authState.user?.email || '',
  customerPhone: '0900000000',
  shippingAddress: 'Hà Nội',
  paymentMethod: 'COD'
});

const total = () =>
  props.cart.reduce((sum, item) => sum + item.product.basePrice * item.quantity, 0);

function formatVnd(value: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}
</script>

<template>
  <div class="card">
    <h3>Giỏ hàng & Đặt hàng</h3>
    <table>
      <thead>
        <tr>
          <th>Sản phẩm</th>
          <th>Đơn giá</th>
          <th>Số lượng</th>
          <th>Thành tiền</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in cart" :key="item.product.id">
          <td>{{ item.product.name }}</td>
          <td>{{ formatVnd(item.product.basePrice) }}</td>
          <td>
            <input
              v-model.number="item.quantity"
              type="number"
              min="1"
              :max="item.product.stockQuantity"
              class="input"
              style="width: 70px;"
            />
          </td>
          <td>{{ formatVnd(item.product.basePrice * item.quantity) }}</td>
          <td>
            <button class="btn btn-danger" @click="emit('remove', item.product.id)">Xóa</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px;">
      <input v-model="checkoutForm.customerName" class="input" placeholder="Tên người nhận" />
      <input v-model="checkoutForm.customerPhone" class="input" placeholder="Số điện thoại" />
      <input v-model="checkoutForm.shippingAddress" class="input" placeholder="Địa chỉ giao hàng" style="grid-column: span 2;" />
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px;">
      <strong>Tổng thanh toán: {{ formatVnd(total()) }}</strong>
      <div style="display: flex; gap: 8px;">
        <button class="btn" @click="emit('close')">Đóng</button>
        <button class="btn btn-primary" @click="emit('submit', { ...checkoutForm })">Xác nhận đặt hàng</button>
      </div>
    </div>
  </div>
</template>
