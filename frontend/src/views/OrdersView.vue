<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { orderService } from '../services/apiServices';
import type { Order } from '../types/models';

const orders = ref<Order[]>([]);
const selectedStatus = ref('');
const loading = ref(false);
const error = ref('');

async function loadOrders() {
  loading.value = true;
  error.value = '';
  try {
    const params: Record<string, string> = {};
    if (selectedStatus.value) params.status = selectedStatus.value;
    orders.value = await orderService.getAll(params);
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Không thể tải danh sách đơn hàng.';
  } finally {
    loading.value = false;
  }
}

function formatVnd(value: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

onMounted(loadOrders);
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <h2 style="margin: 0;">Danh sách Đơn hàng</h2>
      <select v-model="selectedStatus" class="input" @change="loadOrders">
        <option value="">Tất cả trạng thái</option>
        <option value="Pending">Pending</option>
        <option value="Confirmed">Confirmed</option>
        <option value="Shipping">Shipping</option>
        <option value="Delivered">Delivered</option>
        <option value="Cancelled">Cancelled</option>
      </select>
    </div>

    <p v-if="error" style="color: #dc2626;">{{ error }}</p>
    <div class="card">
      <p v-if="loading">Đang tải đơn hàng...</p>
      <p v-else-if="orders.length === 0" style="color: #64748b;">Chưa có đơn hàng nào.</p>
      <table v-else>
        <thead>
          <tr>
            <th>Mã đơn</th>
            <th>Khách hàng & Địa chỉ</th>
            <th>Sản phẩm</th>
            <th>Tổng tiền</th>
            <th>Trạng thái</th>
            <th>Ngày tạo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in orders" :key="o.id">
            <td><strong>{{ o.orderCode }}</strong></td>
            <td>
              <div>{{ o.customerName || '—' }}</div>
              <small style="color: #64748b;">{{ o.shippingAddress }}</small>
            </td>
            <td>
              <div v-for="item in o.items" :key="item.id" style="font-size: 13px;">
                {{ item.productName }} × {{ item.quantity }}
              </div>
            </td>
            <td>{{ formatVnd(o.totalAmount) }}</td>
            <td>{{ o.statusLabel || o.status }}</td>
            <td>{{ new Date(o.createdAt).toLocaleString('vi-VN') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
