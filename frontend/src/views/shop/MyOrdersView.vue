<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { FileSpreadsheet } from 'lucide-vue-next';
import type { Order } from '@/types';
import { orderService } from '@/services/order.service';
import { useAuth } from '@/stores/auth';
import { useToast } from '@/stores/toast';
import { useConfirmDialog } from '@/composables/useConfirmDialog';
import { invalidateCatalog } from '@/composables/useCatalog';
import { signalRService } from '@/services/signalr.service';
import CustomerOrderCard from '@/components/customer/CustomerOrderCard.vue';
import ShopSubnav from '@/components/customer/ShopSubnav.vue';
import { exportToCsv, formatDate, formatVND } from '@/lib/utils';
import { getErrorMessage, normalizeStatus } from '@/lib/customer';

const TABS: { key: string; label: string; match: (s: string) => boolean }[] = [
  { key: 'all', label: 'Tất cả', match: () => true },
  { key: 'pending', label: 'Chờ xác nhận', match: (s) => s === 'PENDING' },
  { key: 'processing', label: 'Đang xử lý', match: (s) => s === 'CONFIRMED' || s === 'PROCESSING' },
  { key: 'shipping', label: 'Đang giao', match: (s) => s === 'SHIPPED' || s === 'SHIPPING' },
  { key: 'delivered', label: 'Đã giao', match: (s) => s === 'DELIVERED' || s === 'COMPLETED' },
  { key: 'cancelled', label: 'Đã hủy', match: (s) => s === 'CANCELLED' },
];

const route = useRoute();
const highlightCode = computed(() => String(route.query.code || ''));
const { user, token, isLoading: authLoading } = useAuth();
const { showToast } = useToast();
const { confirm } = useConfirmDialog();

const orders = ref<Order[]>([]);
const isLoading = ref(true);
const loadError = ref('');
const activeTab = ref('all');
const search = ref('');
const expandedId = ref<number | null>(null);
const cancellingId = ref<number | null>(null);
const confirmingId = ref<number | null>(null);

const isSellerView = computed(() => user.value?.role === 'Seller' || user.value?.role === 'Admin');

async function loadOrders() {
  isLoading.value = true;
  loadError.value = '';
  try {
    const data = await orderService.getMyOrders();
    orders.value = data;
    const highlighted = data.find((o) => o.orderCode === highlightCode.value);
    if (highlighted) expandedId.value = highlighted.id;
  } catch (err) {
    loadError.value = getErrorMessage(err, 'Không tải được danh sách đơn hàng. Vui lòng kiểm tra kết nối máy chủ.');
  } finally {
    isLoading.value = false;
  }
}

let unsub: (() => void) | null = null;

onMounted(() => {
  if (!authLoading.value && token.value) loadOrders();
  else isLoading.value = false;

  unsub = signalRService.subscribe((notif) => {
    if (notif.type === 'ORDER_STATUS' || notif.type === 'ORDER_CREATED' || notif.type === 'PAYMENT_CONFIRMED') {
      loadOrders();
    }
  });
});

onUnmounted(() => {
  if (unsub) unsub();
});

watch([highlightCode, isLoading], async ([code, loading]) => {
  if (!code || loading) return;
  await nextTick();
  document.getElementById(`order-${code}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

const counts = computed(() => {
  const map: Record<string, number> = {};
  TABS.forEach((t) => {
    map[t.key] = orders.value.filter((o) => t.match(normalizeStatus(o.status))).length;
  });
  return map;
});

const visibleOrders = computed(() => {
  const tab = TABS.find((t) => t.key === activeTab.value) || TABS[0];
  const q = search.value.trim().toLowerCase();
  return orders.value.filter((o) => {
    if (!tab.match(normalizeStatus(o.status))) return false;
    if (!q) return true;
    return o.orderCode.toLowerCase().includes(q) || o.items?.some((i) => i.productName.toLowerCase().includes(q));
  });
});

const totalSpent = computed(() =>
  orders.value
    .filter((o) => normalizeStatus(o.status) !== 'CANCELLED')
    .reduce((s, o) => s + (o.totalAmount || 0), 0)
);

async function handleCancel(order: Order) {
  const ok = await confirm({
    title: 'Hủy Đơn Hàng',
    message: `Bạn chắc chắn muốn hủy đơn ${order.orderCode}? Sản phẩm sẽ được hoàn lại kho của shop và không thể khôi phục đơn này.`,
    confirmText: 'Hủy Đơn',
    cancelText: 'Giữ Đơn',
    tone: 'danger',
  });
  if (!ok) return;

  cancellingId.value = order.id;
  try {
    const updated = await orderService.cancelMyOrder(order.id);
    orders.value = orders.value.map((o) => (o.id === order.id ? { ...o, ...updated } : o));
    showToast(`Đã hủy đơn hàng ${order.orderCode}`);
    invalidateCatalog();
  } catch (err) {
    showToast(getErrorMessage(err, 'Không thể hủy đơn hàng lúc này.'));
  } finally {
    cancellingId.value = null;
  }
}

async function handleConfirmReceived(order: Order) {
  const ok = await confirm({
    title: 'Xác Nhận Đã Nhận Hàng',
    message: `Bạn xác nhận đã nhận được kiện hàng ${order.orderCode} nguyên vẹn và đầy đủ? Sau khi xác nhận, đơn hàng sẽ hoàn tất và bạn có thể để lại đánh giá cho sản phẩm.`,
    confirmText: 'Đã Nhận Được Hàng',
    cancelText: 'Chưa Nhận',
    tone: 'default',
  });
  if (!ok) return;

  confirmingId.value = order.id;
  try {
    const updated = await orderService.confirmReceived(order.id);
    orders.value = orders.value.map((o) => (o.id === order.id ? { ...o, ...updated } : o));
    showToast(`Cảm ơn bạn! Đơn hàng ${order.orderCode} đã hoàn tất thành công.`);
  } catch (err) {
    showToast(getErrorMessage(err, 'Không thể xác nhận nhận hàng lúc này. Vui lòng thử lại.'));
  } finally {
    confirmingId.value = null;
  }
}

function handleExportCSV() {
  if (visibleOrders.value.length === 0) {
    showToast('Không có đơn hàng nào để xuất báo cáo.');
    return;
  }
  exportToCsv(
    visibleOrders.value,
    [
      { key: (o) => o.orderCode || o.id, label: 'Mã Đơn Hàng' },
      { key: (o) => formatDate(o.createdAt, 'datetime'), label: 'Thời Gian Đặt' },
      { key: (o) => o.customerName || '', label: 'Người Nhận' },
      { key: (o) => o.customerPhone || '', label: 'Số Điện Thoại' },
      { key: (o) => o.shippingAddress || '', label: 'Địa Chỉ Giao' },
      { key: (o) => o.paymentMethod || '', label: 'Thanh Toán' },
      { key: (o) => o.statusLabel || o.status || '', label: 'Trạng Thái' },
      { key: (o) => o.totalAmount || 0, label: 'Tổng Tiền (VNĐ)' },
      { key: (o) => o.items?.map((i) => `${i.productName} (x${i.quantity})`).join('; ') || '', label: 'Danh Sách Món' },
    ],
    `lich-su-don-hang-${new Date().toISOString().slice(0, 10)}.csv`
  );
  showToast(`Đã xuất ${visibleOrders.value.length} đơn hàng ra file CSV.`);
}
</script>

<template>
  <div class="customer-page">
    <div class="customer-page-head">
      <div>
        <h1 class="customer-page-title">Đơn Hàng Của Tôi</h1>
        <p class="customer-page-sub">
          Theo dõi hành trình kiện hàng, xem lại chi tiết thanh toán và hủy đơn khi shop chưa xác nhận.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="orders.length > 0"
          type="button"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-all cursor-pointer"
          title="Xuất lịch sử đơn hàng ra file CSV Excel"
          @click="handleExportCSV"
        >
          <FileSpreadsheet class="w-3.5 h-3.5 text-sky-600" />
          <span>Xuất CSV</span>
        </button>
        <ShopSubnav />
      </div>
    </div>

    <div v-if="isSellerView" class="customer-alert-info">
      Bạn đang đăng nhập bằng tài khoản {{ user?.role }}. Danh sách bên dưới là đơn theo phạm vi quản lý của bạn — để xử lý đơn hãy dùng trang
      <router-link to="/orders">Quản lý Đơn Hàng</router-link>.
    </div>

    <div v-if="!isLoading && !loadError && orders.length > 0" class="customer-order-stats">
      <div><span>Tổng đơn hàng</span><strong>{{ orders.length }}</strong></div>
      <div><span>Đang xử lý / giao</span><strong>{{ counts.pending + counts.processing + counts.shipping }}</strong></div>
      <div><span>Đã giao thành công</span><strong>{{ counts.delivered }}</strong></div>
      <div><span>Tổng chi tiêu</span><strong>{{ formatVND(totalSpent) }}</strong></div>
    </div>

    <div class="customer-orders-toolbar">
      <div class="customer-tabs" role="tablist">
        <button
          v-for="t in TABS"
          :key="t.key"
          type="button"
          role="tab"
          :aria-selected="activeTab === t.key"
          :class="['customer-tab', activeTab === t.key ? 'active' : '']"
          @click="activeTab = t.key"
        >
          {{ t.label }}
          <span v-if="counts[t.key] > 0" class="count-tag">{{ counts[t.key] }}</span>
        </button>
      </div>
      <input v-model="search" class="form-control customer-orders-search" placeholder="Tìm theo mã đơn hoặc tên sản phẩm..." />
    </div>

    <div v-if="isLoading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="h-36 rounded-2xl bg-slate-100 animate-pulse" />
    </div>

    <div v-else-if="loadError" class="customer-alert-error">{{ loadError }}</div>

    <div v-else-if="visibleOrders.length === 0" class="customer-empty-state">
      <p>Không có đơn hàng nào phù hợp.</p>
      <router-link to="/shop" class="customer-link-btn">Tiếp tục mua sắm →</router-link>
    </div>

    <div v-else class="customer-orders-list">
      <CustomerOrderCard
        v-for="order in visibleOrders"
        :key="order.id"
        :order="order"
        :expanded="expandedId === order.id"
        :can-cancel="!isSellerView"
        :can-confirm="!isSellerView"
        :is-cancelling="cancellingId === order.id"
        :is-confirming="confirmingId === order.id"
        @toggle="expandedId = expandedId === order.id ? null : order.id"
        @cancel="handleCancel"
        @confirm-received="handleConfirmReceived"
      />
    </div>
  </div>
</template>
