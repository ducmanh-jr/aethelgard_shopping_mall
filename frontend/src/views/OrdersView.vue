<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  AlertCircle,
  Ban,
  Calendar,
  CheckCircle,
  FileSpreadsheet,
  Loader2,
  Printer,
  RefreshCw,
  Search,
  X,
} from 'lucide-vue-next';
import Modal from '@/components/ui/Modal.vue';
import { orderService } from '@/services/order.service';
import { signalRService } from '@/services/signalr.service';
import { useAuth } from '@/stores/auth';
import { useToast } from '@/stores/toast';
import type { Order } from '@/types';
import { exportToCsv, formatDate, formatVND } from '@/lib/utils';

const route = useRoute();
const router = useRouter();
const { user } = useAuth();
const { showToast } = useToast();

const codeParam = computed(() => String(route.query.code || ''));

const isAdmin = computed(
  () =>
    user.value?.role === 'Admin' ||
    (user.value?.role as unknown) === 1 ||
    String(user.value?.role || '').toLowerCase() === 'admin'
);

const orders = ref<Order[]>([]);
const loading = ref(false);
const activeTab = ref<string>('ALL');
const dateFilter = ref<string>('ALL');
const searchTerm = ref('');
const selectedOrder = ref<Order | null>(null);
const isDrawerOpen = ref(false);

// Staggered dual-drawer animation states
const shouldRenderDrawer = ref(false);
const isAnimatingDrawer = ref(false);
const lookupId = ref('');

let drawerTimer: ReturnType<typeof setTimeout> | null = null;
watch([isDrawerOpen, selectedOrder], ([open, order]) => {
  if (drawerTimer) clearTimeout(drawerTimer);
  if (open && order) {
    shouldRenderDrawer.value = true;
    drawerTimer = setTimeout(() => {
      isAnimatingDrawer.value = true;
    }, 20);
  } else {
    isAnimatingDrawer.value = false;
    drawerTimer = setTimeout(() => {
      shouldRenderDrawer.value = false;
    }, 300);
  }
});

// Packing Slip modal state (Item 11)
const packingSlipOrder = ref<Order | null>(null);
const isPackingSlipOpen = ref(false);

// Cancellation reason modal state (Item 12)
const PRESET_REASONS = [
  'Hết hàng trong kho phân phối (Out of stock)',
  'Khách hàng chủ động yêu cầu hủy đơn qua hotline',
  'Thông tin giao hàng hoặc số điện thoại không liên lạc được',
  'Nghi vấn đơn hàng trùng lặp / rủi ro spam',
  'Lý do vận hành khác',
];
const orderToCancel = ref<Order | null>(null);
const isCancelModalOpen = ref(false);
const selectedCancelReason = ref(PRESET_REASONS[0]);
const cancelDetailNote = ref('');
const isCancelSubmitting = ref(false);
const cancelError = ref('');

const TABS = [
  { id: 'ALL', label: 'Tất Cả', countKey: 'all' },
  { id: 'PENDING', label: 'Chờ Duyệt', countKey: 'pending' },
  { id: 'CONFIRMED', label: 'Đã Xác Nhận', countKey: 'confirmed' },
  { id: 'SHIPPED', label: 'Đang Giao', countKey: 'shipped' },
  { id: 'DELIVERED', label: 'Đã Giao', countKey: 'delivered' },
] as const;

async function loadOrders() {
  try {
    loading.value = true;
    const data = await orderService.getOrders();
    if (Array.isArray(data)) {
      orders.value = data;

      // Nếu có mã đơn trên URL, tự động tìm và mở Drawer chi tiết đơn đó
      if (codeParam.value) {
        const matched = data.find(
          (o) =>
            o.orderCode?.toLowerCase() === codeParam.value.toLowerCase() ||
            String(o.id) === codeParam.value
        );
        if (matched) {
          selectedOrder.value = matched;
          isDrawerOpen.value = true;
          activeTab.value = 'ALL';
          searchTerm.value = codeParam.value;
        } else {
          searchTerm.value = '';
          showToast(`Đơn hàng #${codeParam.value} không thuộc quyền quản lý của gian hàng bạn.`);
        }
      }
    } else {
      orders.value = [];
    }
  } catch {
    orders.value = [];
  } finally {
    loading.value = false;
  }
}

let unsubscribeSignalR: (() => void) | null = null;
onMounted(() => {
  loadOrders();
  unsubscribeSignalR = signalRService.subscribe((notif) => {
    if (
      notif.type === 'ORDER_CREATED' ||
      notif.type === 'ORDER_STATUS' ||
      notif.type === 'PAYMENT_CONFIRMED'
    ) {
      loadOrders();
    }
  });
});

onUnmounted(() => {
  if (unsubscribeSignalR) unsubscribeSignalR();
  if (drawerTimer) clearTimeout(drawerTimer);
});

const counts = computed(() => ({
  all: orders.value.length,
  pending: orders.value.filter((o) => o.status?.toUpperCase() === 'PENDING').length,
  confirmed: orders.value.filter(
    (o) => o.status?.toUpperCase() === 'CONFIRMED' || o.status?.toUpperCase() === 'PROCESSING'
  ).length,
  shipped: orders.value.filter((o) => o.status?.toUpperCase() === 'SHIPPED').length,
  delivered: orders.value.filter((o) => o.status?.toUpperCase() === 'DELIVERED').length,
}));

const filteredOrders = computed(() => {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return orders.value.filter((order) => {
    // 1. Lọc theo trạng thái
    const matchesTab =
      activeTab.value === 'ALL' ||
      order.status?.toUpperCase() === activeTab.value ||
      order.statusLabel?.toUpperCase() === activeTab.value;

    // 2. Lọc theo khoảng ngày (Item 10)
    let matchesDate = true;
    if (dateFilter.value !== 'ALL' && order.createdAt) {
      const orderDate = new Date(order.createdAt);
      if (dateFilter.value === 'TODAY') {
        matchesDate = order.createdAt.startsWith(todayStr);
      } else if (dateFilter.value === '7DAYS') {
        matchesDate = orderDate >= sevenDaysAgo;
      } else if (dateFilter.value === 'THIS_MONTH') {
        matchesDate = orderDate >= firstDayOfMonth;
      }
    }

    // 3. Lọc theo từ khóa tìm kiếm
    const q = searchTerm.value.toLowerCase();
    const matchesSearch =
      !searchTerm.value ||
      (order.orderCode && order.orderCode.toLowerCase().includes(q)) ||
      (order.customerName && order.customerName.toLowerCase().includes(q)) ||
      (order.customerPhone && order.customerPhone.includes(q)) ||
      (order.trackingCode && order.trackingCode.toLowerCase().includes(q));

    return matchesTab && matchesDate && matchesSearch;
  });
});

const hasUnmatchedCodeBanner = computed(
  () =>
    !!codeParam.value &&
    !loading.value &&
    !orders.value.some(
      (o) =>
        o.orderCode?.toLowerCase() === codeParam.value.toLowerCase() ||
        String(o.id) === codeParam.value
    )
);

async function handleUpdateStatus(
  orderId: number,
  nextStatusInt: number,
  statusName: string,
  locationNote?: string
) {
  try {
    const updated = await orderService.updateOrderStatus(orderId, {
      status: nextStatusInt,
      location: locationNote || 'Kho Trung Chuyển Aethelgard Logistics, Hà Nội',
    });

    orders.value = orders.value.map((o) =>
      o.id === orderId ? { ...o, ...updated, status: updated.status } : o
    );

    if (selectedOrder.value?.id === orderId) {
      selectedOrder.value = { ...selectedOrder.value, ...updated };
    }

    showToast(`Đơn hàng #${orderId} đã được cập nhật: ${statusName}!`);
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } }; message?: string };
    showToast(e?.response?.data?.message || e?.message || 'Cập nhật trạng thái thất bại.');
  }
}

function handleRequestCancel(order: Order) {
  orderToCancel.value = order;
  selectedCancelReason.value = PRESET_REASONS[0];
  cancelDetailNote.value = '';
  cancelError.value = '';
  isCancelModalOpen.value = true;
}

async function handleSubmitCancelModal() {
  if (!orderToCancel.value) return;
  const order = orderToCancel.value;
  const finalReason = cancelDetailNote.value.trim()
    ? `${selectedCancelReason.value}: ${cancelDetailNote.value.trim()}`
    : selectedCancelReason.value;

  isCancelSubmitting.value = true;
  cancelError.value = '';
  try {
    await handleUpdateStatus(order.id, 6, 'Đã Hủy Đơn', `Lý do hủy: ${finalReason}`);
    showToast(`Đã hủy đơn #${order.orderCode || order.id} với lý do: "${finalReason}".`);
    isCancelModalOpen.value = false;
  } catch (err: unknown) {
    const e = err as { message?: string };
    cancelError.value = e?.message || 'Không thể hủy đơn hàng lúc này.';
  } finally {
    isCancelSubmitting.value = false;
  }
}

function handleOpenPackingSlip(order: Order) {
  packingSlipOrder.value = order;
  isPackingSlipOpen.value = true;
}

function handleExportCSV() {
  if (filteredOrders.value.length === 0) {
    showToast('Hiện không có dữ liệu đơn hàng nào để xuất báo cáo.');
    return;
  }

  exportToCsv(
    filteredOrders.value,
    [
      { key: (o) => o.orderCode || o.id, label: 'Mã Đơn Hàng' },
      {
        key: (o) => formatDate(o.createdAt, 'datetime') || o.createdAt || '',
        label: 'Thời Gian Đặt',
      },
      { key: (o) => o.customerName || '', label: 'Tên Khách Hàng' },
      { key: (o) => o.customerPhone || '', label: 'Số Điện Thoại' },
      { key: (o) => o.shippingAddress || '', label: 'Địa Chỉ Giao Hàng' },
      { key: (o) => o.paymentMethod || '', label: 'Phương Thức Thanh Toán' },
      { key: (o) => o.carrier || '', label: 'Đơn Vị Vận Chuyển' },
      { key: (o) => o.trackingCode || '', label: 'Mã Vận Đơn Tracking' },
      { key: (o) => o.statusLabel || o.status || '', label: 'Trạng Thái Đơn' },
      { key: (o) => o.totalAmount || 0, label: 'Tổng Tiền (VNĐ)' },
      { key: (o) => o.items?.length || 0, label: 'Số Loại Sản Phẩm' },
    ],
    `danh-sach-don-hang-aethelgard-${new Date().toISOString().slice(0, 10)}.csv`
  );

  showToast(`Đã xuất thành công ${filteredOrders.value.length} đơn hàng ra file CSV Excel!`);
}

function handleOpenDrawer(order: Order) {
  selectedOrder.value = order;
  isDrawerOpen.value = true;
}

function handleCloseDrawer() {
  isDrawerOpen.value = false;
}

function handleDrawerBackdropClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (e.target === e.currentTarget || target.classList.contains('track-drawer-wrapper')) {
    handleCloseDrawer();
  }
}

function handleLookupSubmit() {
  const q = lookupId.value.trim();
  if (!q) return;
  const matched = orders.value.find(
    (o) =>
      o.orderCode?.toLowerCase() === q.toLowerCase() ||
      String(o.id) === q ||
      o.trackingCode?.toLowerCase() === q.toLowerCase()
  );
  if (matched) {
    selectedOrder.value = matched;
    lookupId.value = '';
  } else {
    showToast(`Không tìm thấy đơn hàng #${q} trong danh sách.`);
  }
}

function handlePrint() {
  window.print();
}

function handleImageError(e: Event) {
  (e.target as HTMLImageElement).src = '/img/products/adidas-samba.jpg';
}

function dismissCodeBanner() {
  searchTerm.value = '';
  router.replace('/orders');
}

const drawerStep = computed(() => selectedOrder.value?.progressStep || 1);
const drawerStepPercent = computed(() => {
  const step = drawerStep.value;
  return step === 1 ? '0%' : step === 2 ? '33.33%' : step === 3 ? '66.66%' : '100%';
});
</script>

<template>
  <main class="orders-container">
    <!-- 1. Header Toolbar -->
    <div class="orders-page-header">
      <div class="orders-header-titles">
        <h1>
          Quản Lý Đơn Hàng &amp; Vận Chuyển
          <span
            v-if="isAdmin"
            style="
              font-size: 0.75rem;
              font-weight: 650;
              padding: 3px 10px;
              border-radius: 9999px;
              background: #0F172A;
              color: #F8FAFC;
              margin-left: 12px;
              vertical-align: middle;
              letter-spacing: 0.02em;
            "
          >
            Chế Độ Giám Sát Sàn
          </span>
        </h1>
        <p>
          {{
            isAdmin
              ? 'Giám sát luồng xử lý đơn đặt hàng và hành trình giao nhận bưu kiện trên toàn bộ 273 gian hàng đối tác Aethelgard'
              : 'Theo dõi luồng xử lý đơn đặt hàng, hành trình giao nhận bưu kiện và in phiếu giao hàng A5'
          }}
        </p>
      </div>

      <div class="orders-header-actions">
        <button
          type="button"
          class="btn-order-action"
          title="Đồng bộ đơn hàng từ máy chủ"
          style="display: flex; align-items: center; gap: 6px"
          @click="loadOrders"
        >
          <RefreshCw :class="['w-3.5 h-3.5', loading ? 'animate-spin text-sky-600' : '']" />
          <span>Làm Mới</span>
        </button>
        <button
          type="button"
          class="btn-order-action"
          style="
            background: #0284C7;
            color: #FFFFFF;
            border-color: #0284C7;
            display: flex;
            align-items: center;
            gap: 6px;
          "
          @click="handleExportCSV"
        >
          <FileSpreadsheet :size="14" />
          <span>Xuất Excel (.CSV)</span>
        </button>
      </div>
    </div>

    <!-- 2. Thẻ chỉ số KPI -->
    <div class="orders-kpi-grid">
      <div
        :class="['order-kpi-card cursor-pointer', activeTab === 'ALL' ? 'active' : '']"
        role="button"
        tabindex="0"
        @click="activeTab = 'ALL'"
        @keydown.enter="activeTab = 'ALL'"
      >
        <span class="kpi-num">{{ counts.all }}</span>
        <span class="kpi-label">Tổng Đơn Hàng</span>
      </div>

      <div
        :class="['order-kpi-card cursor-pointer', activeTab === 'PENDING' ? 'active' : '']"
        role="button"
        tabindex="0"
        @click="activeTab = 'PENDING'"
        @keydown.enter="activeTab = 'PENDING'"
      >
        <span class="kpi-num text-amber-600">{{ counts.pending }}</span>
        <span class="kpi-label">Chờ Xác Nhận</span>
      </div>

      <div
        :class="['order-kpi-card cursor-pointer', activeTab === 'CONFIRMED' ? 'active' : '']"
        role="button"
        tabindex="0"
        @click="activeTab = 'CONFIRMED'"
        @keydown.enter="activeTab = 'CONFIRMED'"
      >
        <span class="kpi-num text-sky-600">{{ counts.confirmed }}</span>
        <span class="kpi-label">Đã Xác Nhận</span>
      </div>

      <div
        :class="['order-kpi-card cursor-pointer', activeTab === 'SHIPPED' ? 'active' : '']"
        role="button"
        tabindex="0"
        @click="activeTab = 'SHIPPED'"
        @keydown.enter="activeTab = 'SHIPPED'"
      >
        <span class="kpi-num text-orange-600">{{ counts.shipped }}</span>
        <span class="kpi-label">Đang Vận Chuyển</span>
      </div>

      <div
        :class="['order-kpi-card cursor-pointer', activeTab === 'DELIVERED' ? 'active' : '']"
        role="button"
        tabindex="0"
        @click="activeTab = 'DELIVERED'"
        @keydown.enter="activeTab = 'DELIVERED'"
      >
        <span class="kpi-num text-emerald-600">{{ counts.delivered }}</span>
        <span class="kpi-label">Giao Thành Công</span>
      </div>
    </div>

    <!-- Banner thông báo khi mã đơn trên URL không thuộc gian hàng này -->
    <div
      v-if="hasUnmatchedCodeBanner"
      style="
        background: #fffbeb;
        border: 1px solid #fde68a;
        color: #92400e;
        padding: 12px 18px;
        border-radius: 12px;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 0.86rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      "
    >
      <span>
        ⚠️ Đơn hàng <strong>#{{ codeParam }}</strong> không chứa sản phẩm thuộc gian hàng của bạn
        hoặc không tồn tại. Đang hiển thị danh sách đơn hàng thực tế của bạn bên dưới.
      </span>
      <button
        type="button"
        style="
          background: #fef3c7;
          border: 1px solid #f59e0b;
          color: #78350f;
          padding: 5px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 700;
          font-size: 0.8rem;
        "
        @click="dismissCodeBanner"
      >
        Đóng thông báo
      </button>
    </div>

    <!-- 3. Thanh bộ lọc (Kèm Date Picker Item 10) -->
    <div class="orders-filter-bar flex-wrap gap-3 items-center justify-between">
      <!-- Tab trạng thái dạng Sliding Pill (Item 4) -->
      <div
        class="orders-tab-group relative p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 inline-flex gap-1"
      >
        <button
          v-for="tab in TABS"
          :key="tab.id"
          type="button"
          :class="[
            'relative px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ease-out cursor-pointer',
            activeTab === tab.id
              ? 'bg-sky-600 text-white shadow-sm scale-100'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60',
          ]"
          @click="activeTab = tab.id"
        >
          <span>{{ tab.label }}</span>
          <span
            :class="[
              'ml-1 text-[11px] font-semibold transition-opacity duration-300',
              activeTab === tab.id ? 'opacity-90' : 'opacity-60',
            ]"
          >
            ({{ counts[tab.countKey] || 0 }})
          </span>
        </button>
      </div>

      <div class="flex items-center gap-3 ml-auto flex-wrap">
        <!-- Bộ lọc khoảng ngày đặt hàng (Item 10) -->
        <div
          class="flex items-center gap-1 bg-white border border-slate-200/90 rounded-xl px-2 py-1 shadow-2xs hover:border-slate-300 transition-colors"
        >
          <Calendar class="w-3.5 h-3.5 text-slate-400" />
          <select
            v-model="dateFilter"
            class="text-xs font-semibold text-slate-700 bg-transparent pr-1 pl-1 py-0.5 focus:outline-none cursor-pointer"
          >
            <option value="ALL">Mọi thời gian</option>
            <option value="TODAY">Hôm nay</option>
            <option value="7DAYS">7 ngày qua</option>
            <option value="THIS_MONTH">Tháng này</option>
          </select>
        </div>

        <!-- Ô tìm kiếm mở rộng mượt mà khi focus (Item 12 & 46) -->
        <div
          class="relative flex items-center transition-all duration-300 ease-in-out w-48 sm:w-64 focus-within:w-72 sm:focus-within:w-80"
        >
          <Search class="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            id="orders-search-input"
            v-model="searchTerm"
            type="text"
            placeholder="Tìm mã đơn, tên khách, tracking..."
            class="w-full h-9 pl-9 pr-8 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all shadow-2xs"
          />
          <button
            v-if="searchTerm"
            type="button"
            class="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer transition-colors"
            title="Xóa tìm kiếm"
            @click="searchTerm = ''"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- 4. Bảng đơn hàng (Kèm nút In Phiếu Item 11 & Hủy Đơn Item 12) -->
    <div class="orders-table-wrapper">
      <table class="orders-table">
        <thead>
          <tr>
            <th>Mã Đơn</th>
            <th>Thời Gian</th>
            <th>Khách Hàng</th>
            <th>Sản Phẩm</th>
            <th>Đơn Vị / Tracking</th>
            <th>Tổng Tiền</th>
            <th>Trạng Thái</th>
            <th style="text-align: right">Thao Tác</th>
          </tr>
        </thead>
        <tbody id="orders-table-body">
          <template v-if="loading">
            <tr v-for="idx in 5" :key="`skeleton-${idx}`" class="animate-pulse">
              <td><div class="h-4 w-20 bg-slate-200 rounded"></div></td>
              <td><div class="h-4 w-24 bg-slate-200 rounded"></div></td>
              <td>
                <div class="h-4 w-28 bg-slate-200 rounded mb-1"></div>
                <div class="h-3 w-20 bg-slate-100 rounded"></div>
              </td>
              <td>
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 bg-slate-200 rounded-md shrink-0"></div>
                  <div>
                    <div class="h-4 w-36 bg-slate-200 rounded mb-1"></div>
                    <div class="h-3 w-20 bg-slate-100 rounded"></div>
                  </div>
                </div>
              </td>
              <td>
                <div class="h-4 w-24 bg-slate-200 rounded mb-1"></div>
                <div class="h-3 w-20 bg-slate-100 rounded"></div>
              </td>
              <td><div class="h-4 w-20 bg-slate-200 rounded"></div></td>
              <td><div class="h-5 w-20 bg-slate-200 rounded"></div></td>
              <td><div class="h-6 w-24 bg-slate-200 rounded ml-auto"></div></td>
            </tr>
          </template>

          <tr v-else-if="filteredOrders.length === 0">
            <td colspan="8" class="text-center py-16">
              <div
                class="flex flex-col items-center justify-center gap-2 max-w-md mx-auto text-slate-500"
              >
                <div
                  class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xl mb-1"
                >
                  📦
                </div>
                <p class="text-sm font-bold text-slate-800">Chưa Có Đơn Hàng Nào</p>
                <p class="text-xs text-slate-500 leading-relaxed">
                  Hiện tại gian hàng chưa ghi nhận đơn đặt hàng mới. Đơn hàng từ khách mua sắm sẽ
                  tự động đồng bộ tại đây theo thời gian thực qua SignalR.
                </p>
              </div>
            </td>
          </tr>

          <tr
            v-for="o in filteredOrders"
            v-else
            :key="o.id || o.orderCode"
            class="order-clickable-row cursor-pointer transition-colors duration-200 hover:bg-sky-50/40"
            @click="handleOpenDrawer(o)"
          >
            <td>
              <span class="order-code-badge">#{{ o.orderCode || o.id }}</span>
            </td>
            <td>
              <div class="text-[0.82rem] font-semibold text-slate-700">
                {{ formatDate(o.createdAt, 'datetime') || o.createdAt }}
              </div>
            </td>
            <td>
              <div class="font-bold text-slate-900">{{ o.customerName }}</div>
              <div class="text-[0.74rem] text-slate-500">{{ o.customerPhone }}</div>
            </td>
            <td>
              <div v-if="o.items && o.items.length > 0" class="order-item-cell">
                <img
                  class="order-thumb-img aspect-square object-cover"
                  loading="lazy"
                  decoding="async"
                  :src="o.items[0].imageUrl"
                  :alt="o.items[0].productName"
                  @error="handleImageError"
                />
                <div class="order-item-meta">
                  <strong>{{ o.items[0].productName }}</strong>
                  <span>
                    {{ o.items[0].specs }}
                    <strong v-if="o.items.length > 1" class="text-sky-600">
                      +{{ o.items.length - 1 }} món khác
                    </strong>
                  </span>
                </div>
              </div>
              <span v-else class="text-slate-400 text-xs">Không có sản phẩm</span>
            </td>
            <td>
              <div class="font-semibold text-[0.82rem] text-slate-900">{{ o.carrier }}</div>
              <div class="font-mono text-[0.74rem] text-slate-500">{{ o.trackingCode }}</div>
            </td>
            <td>
              <div class="font-bold text-slate-900 text-[0.88rem]">
                {{ formatVND(o.totalAmount) }}
              </div>
              <div class="text-[0.72rem] text-slate-500">
                {{ o.paymentMethod?.includes('COD') ? 'COD' : 'Đã thanh toán' }}
              </div>
            </td>
            <td>
              <span :class="['badge-order-status', o.status?.toUpperCase()]">
                {{ o.statusLabel || o.status }}
              </span>
            </td>
            <td class="text-right">
              <div class="flex items-center justify-end gap-1.5" @click.stop>
                <span
                  v-if="isAdmin"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[0.72rem] font-bold text-slate-500 bg-slate-100 group-hover:bg-slate-200 transition-colors"
                >
                  Chi tiết ›
                </span>
                <template v-else>
                  <button
                    v-if="o.status?.toUpperCase() === 'PENDING'"
                    type="button"
                    class="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer whitespace-nowrap"
                    title="Xác nhận đơn hàng ngay"
                    @click="handleUpdateStatus(o.id, 2, 'Đã Xác Nhận')"
                  >
                    Xác Nhận
                  </button>
                  <button
                    type="button"
                    class="p-1.5 rounded-lg border border-slate-200 hover:bg-sky-50 hover:border-sky-300 text-slate-600 hover:text-sky-700 transition-all cursor-pointer"
                    title="In phiếu đóng gói A5"
                    @click="handleOpenPackingSlip(o)"
                  >
                    <Printer class="w-3.5 h-3.5" />
                  </button>
                  <button
                    v-if="o.status?.toUpperCase() === 'PENDING'"
                    type="button"
                    class="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition-all cursor-pointer"
                    title="Hủy đơn hàng"
                    @click="handleRequestCancel(o)"
                  >
                    <Ban class="w-3.5 h-3.5" />
                  </button>
                  <span class="text-slate-400 text-lg font-bold ml-1">›</span>
                </template>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 5. Ngăn theo dõi vận đơn chi tiết (Dual-Panel Sliding Drawer) -->
    <div
      v-if="shouldRenderDrawer && selectedOrder"
      id="track-order-modal"
      :class="['track-drawer-backdrop', isAnimatingDrawer ? 'active' : '']"
      @click="handleDrawerBackdropClick"
    >
      <div class="track-drawer-wrapper">
        <!-- KHUNG PHỤ (BÊN TRÁI) -->
        <div class="track-panel track-panel-secondary">
          <div class="track-panel-header">
            <h3>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
              Vận Đơn &amp; Giao Nhận
            </h3>
            <span class="badge-transit">Đang vận chuyển</span>
          </div>

          <div class="track-panel-body">
            <!-- Thông tin đơn vị vận chuyển -->
            <div class="track-card">
              <div class="track-card-title">Thông Tin Vận Đơn</div>
              <div class="carrier-info-grid mt-2">
                <div class="carrier-col">
                  <div class="carrier-name-row">
                    <span>{{ selectedOrder.carrier }}</span>
                  </div>
                  <div class="tracking-code-val">Mã vận đơn: {{ selectedOrder.trackingCode }}</div>
                  <div class="mt-1.5 text-[0.78rem] text-slate-500">
                    Dự kiến giao:
                    <strong class="text-slate-900">{{ selectedOrder.estimatedDelivery }}</strong>
                  </div>
                </div>

                <div class="carrier-col border-t border-dashed border-slate-200 pt-2 mt-1">
                  <div class="font-semibold text-slate-500 text-[0.74rem]">Cập Nhật Gần Nhất</div>
                  <p class="text-[0.78rem] text-slate-900 mt-0.5">
                    {{
                      selectedOrder.lastUpdate ||
                      selectedOrder.lastUpdateLocation ||
                      'Đang luân chuyển qua trạm phân phối'
                    }}
                  </p>
                  <div class="mt-1 text-[0.74rem] font-semibold text-slate-500">
                    Vị Trí Hiện Tại:
                    <span class="text-slate-900 font-bold">{{
                      selectedOrder.lastLocation || selectedOrder.lastUpdateLocation || 'Kho Tổng'
                    }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Địa chỉ giao hàng -->
            <div class="half-card">
              <div class="half-card-title">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                Địa Chỉ Giao Hàng
              </div>
              <div class="half-card-content">
                <strong>{{ selectedOrder.customerName }}</strong><br />
                <span>{{ selectedOrder.shippingAddress }}</span><br />
                <span class="block mt-1 font-semibold">{{ selectedOrder.customerPhone }}</span>
              </div>
            </div>

            <!-- Phương thức thanh toán -->
            <div class="half-card">
              <div class="half-card-title">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
                Phương Thức Thanh Toán
              </div>
              <div class="half-card-content">
                <strong>{{ selectedOrder.paymentMethod }}</strong><br />
                <span class="text-[0.75rem] text-slate-500">Cổng Aethelgard Gateway bảo mật</span><br />
                <span class="block mt-1.5 font-bold text-emerald-600">
                  Tổng: {{ formatVND(selectedOrder.totalAmount) }}
                </span>
              </div>
            </div>

            <!-- Tra cứu nhanh -->
            <div class="track-card">
              <div class="track-card-title">Tra Cứu Đơn Khác</div>
              <div class="track-card-subtitle">Tra cứu mã đơn khác trong hệ thống</div>
              <form @submit.prevent="handleLookupSubmit">
                <div class="track-inputs-row" style="grid-template-columns: 1fr">
                  <div class="track-input-group">
                    <input
                      v-model="lookupId"
                      type="text"
                      placeholder="VD: AG-2026-7890"
                    />
                  </div>
                </div>
                <button type="submit" class="btn-track-submit">Tra Cứu Bưu Kiện</button>
              </form>
            </div>
          </div>
        </div>

        <!-- KHUNG CHÍNH (BÊN PHẢI) -->
        <div class="track-panel track-panel-primary">
          <div class="track-panel-header">
            <div class="track-order-summary-header flex-1 mr-3">
              <div class="order-headline-left">
                <div class="order-title-code">
                  <span>Đơn hàng {{ selectedOrder.orderCode || selectedOrder.id }}</span>
                  <span :class="['badge-order-status', selectedOrder.status?.toUpperCase()]">
                    {{ selectedOrder.statusLabel || selectedOrder.status }}
                  </span>
                </div>
                <div class="order-date-text">
                  Ngày đặt: {{ selectedOrder.placedDateText || selectedOrder.createdAt }}
                </div>
              </div>

              <div class="order-header-buttons">
                <button class="btn-order-action" type="button" @click="handlePrint">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Hóa đơn
                </button>
                <button class="btn-order-action" type="button" @click="handlePrint">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path
                      d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"
                    />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  In đơn
                </button>
              </div>
            </div>

            <button class="track-panel-close" type="button" @click="handleCloseDrawer">
              &times;
            </button>
          </div>

          <div class="track-panel-body">
            <!-- Tiến trình giao hàng (4 bước) -->
            <div class="track-card">
              <div class="stepper-header">
                <h3>Tiến Trình Giao Hàng</h3>
                <span>Dự kiến giao: {{ selectedOrder.estimatedDelivery }}</span>
              </div>

              <div class="delivery-progress-bar-wrap">
                <div
                  class="delivery-progress-line-fill"
                  :style="{ width: drawerStepPercent }"
                />

                <div class="stepper-steps-row">
                  <div
                    v-for="(title, idx) in ['Đã đặt hàng', 'Đã xác nhận', 'Đang giao', 'Đã giao']"
                    :key="title"
                    :class="[
                      'stepper-step-node',
                      idx + 1 <= drawerStep ? 'completed' : '',
                      idx + 1 === drawerStep ? 'current' : '',
                    ]"
                  >
                    <div class="node-circle">{{ idx + 1 <= drawerStep ? '✓' : idx + 1 }}</div>
                    <span class="node-title">{{ title }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Chi tiết sản phẩm trong đơn -->
            <div class="track-card">
              <div class="track-card-title">Chi Tiết Kiện Hàng</div>
              <div class="track-items-list mt-3">
                <div
                  v-for="(item, idx) in selectedOrder.items"
                  :key="idx"
                  class="track-item-row flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                >
                  <div class="flex items-center gap-3">
                    <img
                      :src="item.imageUrl"
                      :alt="item.productName"
                      class="w-12 h-12 object-cover rounded-md border"
                      @error="handleImageError"
                    />
                    <div>
                      <h4 class="text-sm font-bold text-slate-900">{{ item.productName }}</h4>
                      <p class="text-xs text-slate-500">{{ item.specs }}</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="font-bold text-sm text-slate-900">{{ formatVND(item.price) }}</div>
                    <div class="text-xs text-slate-500">Số lượng: x{{ item.quantity }}</div>
                  </div>
                </div>
              </div>

              <!-- Tổng kết thanh toán -->
              <div class="border-t border-slate-200 mt-4 pt-3 space-y-1.5 text-xs text-slate-600">
                <div class="flex justify-between">
                  <span>Tiền hàng (Subtotal):</span>
                  <strong>{{ formatVND(selectedOrder.subtotal) }}</strong>
                </div>
                <div class="flex justify-between">
                  <span>Phí vận chuyển:</span>
                  <strong>{{ formatVND(selectedOrder.shippingCharge) }}</strong>
                </div>
                <div class="flex justify-between">
                  <span>Thuế VAT (8%):</span>
                  <strong>{{ formatVND(selectedOrder.taxes) }}</strong>
                </div>
                <div v-if="selectedOrder.discount > 0" class="flex justify-between text-red-500">
                  <span>Giảm giá khuyến mãi:</span>
                  <strong>-{{ formatVND(selectedOrder.discount) }}</strong>
                </div>
                <div
                  class="flex justify-between text-sm font-extrabold text-slate-900 border-t border-slate-200 pt-2"
                >
                  <span>TỔNG CỘNG:</span>
                  <span class="text-sky-600">{{ formatVND(selectedOrder.totalAmount) }}</span>
                </div>
              </div>

              <!-- Thanh nút thao tác -->
              <div class="pt-4 border-t border-slate-200 flex flex-wrap gap-2 justify-end items-center">
                <div
                  v-if="isAdmin"
                  class="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold"
                >
                  <span class="flex items-center gap-1.5 text-slate-700">
                    <span class="w-2 h-2 rounded-full bg-slate-500"></span>
                    Chế độ Giám sát: Quyền xác nhận &amp; xử lý đơn hàng thuộc về chủ gian hàng.
                  </span>
                  <button
                    type="button"
                    class="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all shadow-xs cursor-pointer"
                    @click="handlePrint"
                  >
                    In Phiếu Đơn
                  </button>
                </div>

                <template v-else>
                  <button
                    v-if="selectedOrder.status?.toUpperCase() === 'PENDING'"
                    type="button"
                    class="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
                    @click="
                      handleUpdateStatus(selectedOrder.id, 2, 'Đã Xác Nhận');
                      handleCloseDrawer();
                    "
                  >
                    Xác Nhận Đơn Hàng
                  </button>

                  <button
                    v-if="
                      selectedOrder.status?.toUpperCase() === 'CONFIRMED' ||
                      selectedOrder.status?.toUpperCase() === 'PROCESSING'
                    "
                    type="button"
                    class="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
                    @click="
                      handleUpdateStatus(selectedOrder.id, 4, 'Đang Vận Chuyển FedEx');
                      handleCloseDrawer();
                    "
                  >
                    Giao Vận Chuyển FedEx
                  </button>

                  <button
                    v-if="selectedOrder.status?.toUpperCase() === 'SHIPPED'"
                    type="button"
                    class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
                    @click="
                      handleUpdateStatus(selectedOrder.id, 5, 'Giao Hàng Thành Công');
                      handleCloseDrawer();
                    "
                  >
                    Xác Nhận Đã Giao
                  </button>

                  <button
                    v-if="
                      selectedOrder.status?.toUpperCase() !== 'DELIVERED' &&
                      selectedOrder.status?.toUpperCase() !== 'CANCELLED'
                    "
                    type="button"
                    class="px-4 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs transition-all cursor-pointer"
                    @click="
                      handleRequestCancel(selectedOrder);
                      handleCloseDrawer();
                    "
                  >
                    Hủy Đơn Hàng
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 6. Modal In Phiếu Giao Hàng & Đóng Gói A5 (Item 11) -->
    <Modal
      :is-open="isPackingSlipOpen && !!packingSlipOrder"
      size="xl"
      :show-close-button="false"
      @close="isPackingSlipOpen = false"
    >
      <template v-if="packingSlipOrder">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center justify-between w-full pr-4">
            <div>
              <h3 class="text-lg font-bold text-slate-900">Phiếu Giao Hàng &amp; Đóng Gói (A5/A4)</h3>
              <p class="text-xs text-slate-500">
                Mã đơn hàng #{{ packingSlipOrder.orderCode || packingSlipOrder.id }}
              </p>
            </div>
            <button
              type="button"
              class="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer print:hidden"
              @click="handlePrint"
            >
              <Printer class="w-4 h-4" />
              <span>In Phiếu Ngay</span>
            </button>
          </div>
          <button
            type="button"
            class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 text-xl cursor-pointer shrink-0"
            aria-label="Đóng"
            @click="isPackingSlipOpen = false"
          >
            &times;
          </button>
        </div>

        <!-- NỘI DUNG PHIẾU ĐÓNG GÓI CHUẨN IN ẤN (IN ẤN A5) -->
        <div id="printable-packing-slip" class="text-slate-800 space-y-5 print:overflow-visible">
          <!-- Header phiếu -->
          <div class="flex items-center justify-between border-b-2 border-slate-900 pb-3">
            <div>
              <div class="text-xl font-black tracking-widest text-slate-900">AETHELGARD</div>
              <div class="text-[10px] text-slate-500 uppercase tracking-wider">
                Haute Couture Logistics &amp; Fulfillment
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm font-bold text-slate-900 font-mono">
                *{{ packingSlipOrder.orderCode || packingSlipOrder.id }}*
              </div>
              <div class="text-[10px] text-slate-500">
                Ngày in: {{ formatDate(new Date(), 'datetime') }}
              </div>
            </div>
          </div>

          <!-- Thông tin 2 bên: Gửi & Nhận -->
          <div class="grid grid-cols-2 gap-4 text-xs">
            <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div class="font-bold text-slate-900 mb-1 flex items-center gap-1">
                <span>ĐƠN VỊ GỬI:</span>
                <span class="text-[10px] text-sky-600 font-medium">Kho Tổng Aethelgard</span>
              </div>
              <div class="text-slate-600 space-y-0.5">
                <div>Trung tâm Vận hành Flagship Aethelgard</div>
                <div>Tòa nhà Landmark 81, P. 22, Q. Bình Thạnh, TP. HCM</div>
                <div>Hotline CSKH: 1900 8899 (VIP Support)</div>
              </div>
            </div>

            <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div class="font-bold text-slate-900 mb-1 flex items-center gap-1">
                <span>NGƯỜI NHẬN:</span>
                <span class="text-[10px] text-emerald-600 font-medium">Khách Hàng VIP</span>
              </div>
              <div class="text-slate-600 space-y-0.5">
                <div class="font-bold text-slate-900">
                  {{ packingSlipOrder.customerName || 'Quý Khách Hàng' }}
                </div>
                <div>
                  {{ packingSlipOrder.shippingAddress || 'Địa chỉ đăng ký theo hồ sơ tài khoản' }}
                </div>
                <div>Điện thoại: {{ packingSlipOrder.customerPhone || '090 ••• ••••' }}</div>
              </div>
            </div>
          </div>

          <!-- Bảng danh sách sản phẩm đóng gói -->
          <div>
            <div class="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wider">
              Chi Tiết Sản Phẩm Đóng Hộp
            </div>
            <table class="w-full text-xs text-left border-collapse">
              <thead>
                <tr class="border-b border-slate-300 bg-slate-100 text-slate-700 font-bold">
                  <th class="py-2 px-2 w-10 text-center">STT</th>
                  <th class="py-2 px-3">Tên Tác Phẩm / Sản Phẩm</th>
                  <th class="py-2 px-2 text-center w-16">Phân Loại</th>
                  <th class="py-2 px-2 text-center w-12">SL</th>
                  <th class="py-2 px-3 text-right w-28">Đơn Giá</th>
                  <th class="py-2 px-3 text-right w-28">Thành Tiền</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                <template v-if="packingSlipOrder.items && packingSlipOrder.items.length > 0">
                  <tr v-for="(item, idx) in packingSlipOrder.items" :key="item.id || idx">
                    <td class="py-2 px-2 text-center font-medium text-slate-500">{{ idx + 1 }}</td>
                    <td class="py-2 px-3">
                      <div class="font-bold text-slate-900">{{ item.productName }}</div>
                      <div class="text-[10px] text-slate-400 font-mono">
                        SKU #{{
                          item.productId
                            ? `AE-${String(item.productId).padStart(5, '0')}`
                            : 'AE-CUSTOM'
                        }}
                      </div>
                    </td>
                    <td class="py-2 px-2 text-center text-slate-600">Standard</td>
                    <td class="py-2 px-2 text-center font-bold text-slate-900">
                      {{ item.quantity }}
                    </td>
                    <td class="py-2 px-3 text-right text-slate-600 font-mono">
                      {{ formatVND(item.price) }}
                    </td>
                    <td class="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                      {{ formatVND(item.subtotal) }}
                    </td>
                  </tr>
                </template>
                <tr v-else>
                  <td colspan="6" class="py-3 text-center text-slate-400">
                    Sản phẩm thời trang cao cấp Aethelgard
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="border-t-2 border-slate-900 font-bold text-xs">
                  <td colspan="4" class="py-2 px-3 text-right">
                    Tổng Tiền Thu Khách (COD / Đã Thanh Toán):
                  </td>
                  <td
                    colspan="2"
                    class="py-2 px-3 text-right text-sm text-sky-700 font-black font-mono"
                  >
                    {{ formatVND(packingSlipOrder.totalAmount) }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Ghi chú & Chữ ký nghiệm thu -->
          <div class="pt-2 border-t border-slate-200 text-xs">
            <div class="text-[11px] text-slate-500 italic mb-4">
              * Lưu ý kiểm tra nguyên vẹn tem niêm phong hologram Aethelgard trước khi nhận hàng.
              Trường hợp bao bì có dấu hiệu cạy mở, quý khách vui lòng từ chối nhận và gọi 1900 8899.
            </div>

            <div class="grid grid-cols-3 gap-4 text-center text-[11px] text-slate-700 pt-2">
              <div>
                <div class="font-bold mb-10">Người Đóng Gói</div>
                <div class="border-t border-slate-300 w-24 mx-auto pt-1 text-[10px] text-slate-400">
                  (Ký, ghi rõ họ tên)
                </div>
              </div>
              <div>
                <div class="font-bold mb-10">Đơn Vị Vận Chuyển</div>
                <div class="border-t border-slate-300 w-24 mx-auto pt-1 text-[10px] text-slate-400">
                  (Ký xác nhận)
                </div>
              </div>
              <div>
                <div class="font-bold mb-10">Khách Hàng Nhận</div>
                <div class="border-t border-slate-300 w-24 mx-auto pt-1 text-[10px] text-slate-400">
                  (Ký xác nhận đã kiểm tra)
                </div>
              </div>
            </div>
          </div>

          <!-- Footer bảo đảm -->
          <div
            class="pt-3 border-t border-dashed border-slate-300 flex items-center justify-between text-[10px] text-slate-400"
          >
            <div class="flex items-center gap-1 text-emerald-600 font-semibold">
              <CheckCircle class="w-3.5 h-3.5" />
              <span>Bảo hành chính hãng 12 tháng tại các Boutique chính thức toàn quốc.</span>
            </div>
            <div>Bản in điện tử hợp lệ</div>
          </div>
        </div>
      </template>
    </Modal>

    <!-- 7. Modal Lý Do Hủy Đơn Hàng Bắt Buộc (Item 12) -->
    <Modal
      :is-open="isCancelModalOpen && !!orderToCancel"
      size="md"
      :show-close-button="false"
      @close="isCancelModalOpen = false"
    >
      <template v-if="orderToCancel">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <div
              class="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center"
            >
              <Ban class="w-4 h-4" />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900">Xác Nhận Hủy Đơn Hàng</h3>
              <p class="text-xs text-slate-500">
                Mã đơn #{{ orderToCancel.orderCode || orderToCancel.id }}
              </p>
            </div>
          </div>
          <button
            type="button"
            class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 text-xl cursor-pointer"
            aria-label="Đóng"
            @click="isCancelModalOpen = false"
          >
            &times;
          </button>
        </div>

        <form class="space-y-4" @submit.prevent="handleSubmitCancelModal">
          <div
            v-if="cancelError"
            class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2"
          >
            <AlertCircle class="w-4 h-4 shrink-0" />
            <span>{{ cancelError }}</span>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">
              Lý do hủy đơn bắt buộc <span class="text-rose-500">*</span>
            </label>
            <select
              v-model="selectedCancelReason"
              :disabled="isCancelSubmitting"
              class="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            >
              <option v-for="r in PRESET_REASONS" :key="r" :value="r">
                {{ r }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">
              Ghi chú chi tiết cho vận hành (tùy chọn)
            </label>
            <textarea
              v-model="cancelDetailNote"
              rows="3"
              :disabled="isCancelSubmitting"
              placeholder="Nhập thêm chi tiết biên bản hủy đơn..."
              class="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
            />
          </div>

          <div class="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              :disabled="isCancelSubmitting"
              class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              @click="isCancelModalOpen = false"
            >
              Đóng
            </button>
            <button
              type="submit"
              :disabled="isCancelSubmitting"
              class="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <template v-if="isCancelSubmitting">
                <Loader2 class="w-3.5 h-3.5 animate-spin" />
                <span>Đang xử lý...</span>
              </template>
              <span v-else>Xác Nhận Hủy</span>
            </button>
          </div>
        </form>
      </template>
    </Modal>
  </main>
</template>
