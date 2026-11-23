<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { statisticsService } from '@/services/statistics.service';
import type { IncomeSummary } from '@/types';
import { useToast } from '@/stores/toast';
import { formatVND } from '@/lib/utils';

interface MatrixMonthItem {
  month: string;
  existing: number;
  newUsers: number;
  valTotal: string;
  newText?: string;
  existText?: string;
}

const MONTH_LABELS: Record<string, string> = {
  JAN: 'TH1', FEB: 'TH2', MAR: 'TH3', APR: 'TH4', MAY: 'TH5', JUN: 'TH6',
  JUL: 'TH7', AUG: 'TH8', SEP: 'TH9', OCT: 'TH10', NOV: 'TH11', DEC: 'TH12',
};

const TX_STATUS_LABELS: Record<string, string> = {
  Success: 'Thành công',
  Pending: 'Đang xử lý',
  Refunded: 'Đã hoàn tiền',
};

const needleHeights = [
  { dark: 30, light: 20 }, { dark: 45, light: 25 }, { dark: 20, light: 15 },
  { dark: 35, light: 30 }, { dark: 60, light: 20 }, { dark: 25, light: 30 },
  { dark: 40, light: 20 }, { dark: 30, light: 35 }, { dark: 50, light: 25 },
  { dark: 70, light: 30 }, { dark: 35, light: 20 }, { dark: 45, light: 25 },
  { dark: 55, light: 20 }, { dark: 28, light: 30 }, { dark: 65, light: 25 },
  { dark: 40, light: 30 }, { dark: 50, light: 20 }, { dark: 30, light: 25 },
];

interface Transaction {
  id: string;
  customer: string;
  product: string;
  status: 'Success' | 'Pending' | 'Refunded';
  qty: number;
  unitPrice: string;
  total: string;
}

const { showToast } = useToast();
const activeMonth = ref('JUN');
const period = ref<'weekly' | 'monthly' | 'yearly'>('monthly');
const searchQuery = ref('');
const transactions = ref<Transaction[]>([]);
const selectedIds = ref<string[]>([]);
const showAiModal = ref(false);
const apiData = ref<IncomeSummary | null>(null);

onMounted(async () => {
  try {
    const res = await statisticsService.getIncomeStats();
    if (res) {
      apiData.value = res;
      if (res.recentTransactions) transactions.value = res.recentTransactions as unknown as Transaction[];
    }
  } catch {}
});

const matrixData = computed<MatrixMonthItem[]>(() => {
  if (apiData.value?.monthlyMatrix?.length) {
    return apiData.value.monthlyMatrix.map((m) => ({
      month: m.month,
      existing: m.existingUsers,
      newUsers: m.newUsers,
      valTotal: m.valTotal,
      newText: m.newText ?? undefined,
      existText: m.existText ?? undefined,
    }));
  }
  return Object.keys(MONTH_LABELS).map((m) => ({ month: m, existing: 0, newUsers: 0, valTotal: '0 ₫' }));
});

const totalRevenueDisplay = computed(() =>
  apiData.value && apiData.value.totalRevenue > 0 ? formatVND(apiData.value.totalRevenue) : '0 ₫'
);
const totalOrdersDisplay = computed(() =>
  apiData.value && apiData.value.totalOrders > 0 ? `${apiData.value.totalOrders.toLocaleString()} Đơn hàng` : '0 Đơn hàng'
);
const growthDisplay = computed(() =>
  apiData.value && apiData.value.growthPercent ? `+${apiData.value.growthPercent}%` : '0.0%'
);
const conversionDisplay = computed(() =>
  apiData.value && apiData.value.totalOrders > 0
    ? `${((apiData.value.totalOrders / Math.max(apiData.value.totalOrders, 1)) * 100).toFixed(1)}%`
    : '0.0%'
);

const categoryBreakdown = computed(() =>
  apiData.value?.categoryBreakdown?.length
    ? apiData.value.categoryBreakdown
    : [
        { categoryName: 'Giày Sneaker & Dép', revenue: 0, percentage: 40, orderCount: 0 },
        { categoryName: 'Túi Xách Da Cao Cấp', revenue: 0, percentage: 35, orderCount: 0 },
        { categoryName: 'Trang Phục & Outerwear', revenue: 0, percentage: 15, orderCount: 0 },
        { categoryName: 'Phụ Kiện & Đồng Hồ', revenue: 0, percentage: 10, orderCount: 0 },
      ]
);

const filteredTransactions = computed(() => {
  if (!searchQuery.value) return transactions.value;
  const q = searchQuery.value.toLowerCase();
  return transactions.value.filter(
    (tx) =>
      tx.id.toLowerCase().includes(q) ||
      tx.customer.toLowerCase().includes(q) ||
      tx.product.toLowerCase().includes(q) ||
      tx.status.toLowerCase().includes(q)
  );
});

function handleSelectAll(e: Event) {
  const checked = (e.target as HTMLInputElement).checked;
  selectedIds.value = checked ? filteredTransactions.value.map((tx) => tx.id) : [];
}

function handleToggleRow(id: string) {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((x) => x !== id)
    : [...selectedIds.value, id];
}
</script>

<template>
  <main class="income-dashboard-wrap">
    <div class="metric-cards-grid">
      <div class="kpi-stat-box">
        <div class="kpi-top-row">
          <span class="kpi-title-mono">TỔNG DOANH THU</span>
          <div class="sparkline-bars">
            <div class="spark-bar" style="height: 12px" />
            <div class="spark-bar" style="height: 18px" />
            <div class="spark-bar" style="height: 14px" />
            <div class="spark-bar" style="height: 22px" />
            <div class="spark-bar active" style="height: 28px" />
            <div class="spark-bar" style="height: 16px" />
            <div class="spark-bar" style="height: 20px" />
          </div>
        </div>
        <div class="kpi-big-num">{{ totalRevenueDisplay }}</div>
        <div class="kpi-bottom-row">
          <span class="kpi-info-icon" title="Chi tiết doanh thu">ⓘ</span>
          <span class="kpi-growth-tag">
            {{ growthDisplay }} <span style="font-weight: 500; color: #6b7280; margin-left: 2px">so với kỳ trước</span>
          </span>
        </div>
      </div>

      <div class="kpi-stat-box">
        <div class="kpi-top-row">
          <span class="kpi-title-mono">TỔNG ĐƠN HÀNG</span>
          <div class="sparkline-bars">
            <div class="spark-bar" style="height: 14px" />
            <div class="spark-bar" style="height: 10px" />
            <div class="spark-bar" style="height: 16px" />
            <div class="spark-bar active" style="height: 24px" />
            <div class="spark-bar" style="height: 18px" />
            <div class="spark-bar" style="height: 22px" />
            <div class="spark-bar" style="height: 14px" />
          </div>
        </div>
        <div class="kpi-big-num">{{ totalOrdersDisplay }}</div>
        <div class="kpi-bottom-row">
          <span class="kpi-info-icon" title="Thống kê đơn hàng">ⓘ</span>
          <span class="kpi-growth-tag">
            0 <span style="font-weight: 500; color: #6b7280; margin-left: 2px">đơn mới trong kỳ</span>
          </span>
        </div>
      </div>

      <div class="kpi-stat-box">
        <div class="kpi-top-row">
          <span class="kpi-title-mono">LƯỢT GHÉ THĂM SHOP</span>
          <div class="sparkline-bars">
            <div class="spark-bar" style="height: 16px" />
            <div class="spark-bar" style="height: 20px" />
            <div class="spark-bar" style="height: 12px" />
            <div class="spark-bar" style="height: 18px" />
            <div class="spark-bar active" style="height: 26px" />
            <div class="spark-bar" style="height: 14px" />
            <div class="spark-bar" style="height: 19px" />
          </div>
        </div>
        <div class="kpi-big-num">{{ apiData?.shopViews ?? 0 }} <span class="kpi-subtext">Lượt xem</span></div>
        <div class="kpi-bottom-row">
          <span class="kpi-info-icon" title="Lưu lượng khách xem gian hàng">ⓘ</span>
          <span class="kpi-growth-tag">
            0 <span style="font-weight: 500; color: #6b7280; margin-left: 2px">lượt xem trong kỳ</span>
          </span>
        </div>
      </div>

      <div class="kpi-stat-box">
        <div class="kpi-top-row">
          <span class="kpi-title-mono">TỶ LỆ CHUYỂN ĐỔI</span>
          <div class="sparkline-bars">
            <div class="spark-bar" style="height: 10px" />
            <div class="spark-bar" style="height: 14px" />
            <div class="spark-bar" style="height: 20px" />
            <div class="spark-bar" style="height: 15px" />
            <div class="spark-bar active" style="height: 25px" />
            <div class="spark-bar" style="height: 18px" />
            <div class="spark-bar" style="height: 12px" />
          </div>
        </div>
        <div class="kpi-big-num">{{ conversionDisplay }}</div>
        <div class="kpi-bottom-row">
          <span class="kpi-info-icon" title="Tỷ lệ đơn hàng thành công trên khách ghé thăm">ⓘ</span>
          <span class="kpi-growth-tag">
            0.0% <span style="font-weight: 500; color: #6b7280; margin-left: 2px">tỷ lệ chuyển đổi</span>
          </span>
        </div>
      </div>
    </div>

    <div class="analytics-two-col-grid">
      <div class="dash-card">
        <div class="dash-card-header">
          <div class="dash-card-title-group"><span>XU HƯỚNG DOANH SỐ</span><span>ⓘ</span></div>
          <span class="dash-card-action-icon" @click="showToast('Cập nhật dữ liệu xu hướng doanh số')">⋯</span>
        </div>

        <div class="sales-trend-toolbar">
          <div class="trend-stat-left">
            <div class="trend-total-label">Tổng doanh thu : <strong id="trend-total-amount">{{ totalRevenueDisplay }}</strong></div>
            <div class="trend-legend">
              <div class="trend-legend-item"><span class="legend-square-new" /><span>KHÁCH MỚI</span></div>
              <div class="trend-legend-item"><span class="legend-square-existing" /><span>KHÁCH QUEN</span></div>
            </div>
          </div>

          <div class="time-pill-selector">
            <button type="button" :class="['time-pill-btn', period === 'weekly' ? 'active' : '']" @click="period = 'weekly'">Theo tuần</button>
            <button type="button" :class="['time-pill-btn', period === 'monthly' ? 'active' : '']" @click="period = 'monthly'">Theo tháng</button>
            <button type="button" :class="['time-pill-btn', period === 'yearly' ? 'active' : '']" @click="period = 'yearly'">Theo năm</button>
          </div>
        </div>

        <div class="matrix-chart-wrapper">
          <div class="matrix-y-axis">
            <span>60k</span><span>50k</span><span>40k</span><span>30k</span><span>20k</span><span>10k</span><span>0k</span>
          </div>

          <div class="matrix-grid-area">
            <div class="matrix-guidelines">
              <div class="matrix-guide-line" />
              <div class="matrix-guide-line" />
              <div class="matrix-guide-line" />
              <div class="matrix-guide-line" />
              <div class="matrix-guide-line" />
              <div class="matrix-guide-line" />
              <div class="matrix-guide-line" style="border-top: 1px solid #e5e7eb" />
            </div>

            <div id="matrix-cols-container" class="matrix-columns-container">
              <div
                v-for="item in matrixData"
                :key="item.month"
                class="matrix-month-col"
                style="cursor: pointer"
                @click="activeMonth = item.month"
              >
                <template v-if="item.month === activeMonth">
                  <div class="matrix-tooltip-pin">
                    <div class="tt-title">{{ MONTH_LABELS[item.month] || item.month }} 2025</div>
                    <div class="tt-row"><span class="legend-square-new" /><span>Khách mới <strong>{{ item.newText || item.valTotal }}</strong></span></div>
                    <div class="tt-row"><span class="legend-square-existing" /><span>Khách quen <strong>{{ item.existText || '18k' }}</strong></span></div>
                  </div>
                  <div class="matrix-vertical-dash" />
                </template>

                <div class="blocks-stack">
                  <div
                    v-for="idx in item.existing"
                    :key="`exist-${idx}`"
                    :class="['matrix-block existing', item.month === activeMonth ? 'highlight' : '']"
                  />
                  <div v-for="idx in item.newUsers" :key="`new-${idx}`" class="matrix-block new" />
                </div>
              </div>
            </div>

            <div id="matrix-x-axis" class="matrix-x-axis">
              <span
                v-for="item in matrixData"
                :key="item.month"
                :class="['matrix-x-label', item.month === activeMonth ? 'active' : '']"
                style="cursor: pointer"
                @click="activeMonth = item.month"
              >
                {{ MONTH_LABELS[item.month] || item.month }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="dash-card">
        <div class="dash-card-header">
          <div class="dash-card-title-group"><span>CƠ CẤU DOANH THU</span><span>ⓘ</span></div>
          <span class="dash-card-action-icon" @click="showToast('Phân rã theo danh mục kinh doanh')">⋯</span>
        </div>

        <div class="breakdown-top-meta">
          <span class="breakdown-cat-title">Doanh thu theo danh mục</span>
          <div class="breakdown-date-pill">
            <span>📅 01/01 - 31/12</span>
            <span style="font-size: 0.65rem">▼</span>
          </div>
        </div>

        <div class="breakdown-big-val">{{ totalRevenueDisplay }}</div>

        <button class="btn-ai-insight" type="button" @click="showAiModal = true">
          <span class="ai-icon-spark">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Nhận phân tích chuyên sâu từ AI
          </span>
          <span>›</span>
        </button>

        <div id="needle-chart-bars" class="needle-chart-container">
          <div v-for="(h, i) in needleHeights" :key="i" class="needle-col">
            <div class="needle-dark-seg" :style="{ height: `${h.dark}px` }" />
            <div class="needle-light-seg" :style="{ height: `${h.light}px` }" />
          </div>
        </div>

        <div class="needle-axis-labels">
          <span>01 THG 1</span>
          <span>31 THG 12, 2025</span>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 space-y-2.5">
          <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Tỷ Trọng Doanh Thu Ngành Hàng</div>
          <div v-for="(cat, idx) in categoryBreakdown" :key="cat.categoryName" class="space-y-1">
            <div class="flex justify-between text-xs">
              <span class="font-semibold text-slate-700">{{ cat.categoryName }}</span>
              <span class="font-bold text-slate-900">
                {{ cat.revenue > 0 ? `${formatVND(cat.revenue)} (${cat.percentage}%)` : `${cat.percentage}%` }}
              </span>
            </div>
            <div class="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                :class="['h-full rounded-full', ['bg-sky-500', 'bg-blue-600', 'bg-teal-500', 'bg-amber-500'][idx % 4]]"
                :style="{ width: `${Math.max(cat.percentage, 2)}%` }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="dash-card" style="padding: 18px 20px">
      <div class="recent-tx-header">
        <div class="dash-card-title-group"><span>GIAO DỊCH GẦN ĐÂY</span><span>ⓘ</span></div>
        <div class="tx-header-actions">
          <div class="tx-search-box">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input id="tx-search-input" v-model="searchQuery" type="text" placeholder="Tìm kiếm giao dịch..." />
          </div>
          <button class="btn-more-options" type="button" @click="showToast('Tùy chọn lọc giao dịch tài chính')">⋯</button>
        </div>
      </div>

      <div class="tx-table-wrapper">
        <table class="tx-table">
          <thead>
            <tr>
              <th style="width: 28px">
                <input
                  id="tx-check-all"
                  type="checkbox"
                  class="tx-checkbox"
                  :checked="selectedIds.length === filteredTransactions.length && filteredTransactions.length > 0"
                  @change="handleSelectAll"
                />
              </th>
              <th>MÃ ↕</th>
              <th>KHÁCH HÀNG ↕</th>
              <th>SẢN PHẨM ↕</th>
              <th>TRẠNG THÁI ↕</th>
              <th>SL ↕</th>
              <th>ĐƠN GIÁ ↕</th>
              <th>TỔNG DOANH THU ↕</th>
              <th style="text-align: right">THAO TÁC</th>
            </tr>
          </thead>
          <tbody id="tx-table-body">
            <tr v-if="filteredTransactions.length === 0">
              <td colspan="9" style="text-align: center; padding: 30px; color: #9ca3af">
                {{
                  searchQuery
                    ? `Không tìm thấy giao dịch nào phù hợp với "${searchQuery}"`
                    : 'Chưa có giao dịch thanh toán nào được ghi nhận cho gian hàng.'
                }}
              </td>
            </tr>
            <tr v-for="tx in filteredTransactions" v-else :key="tx.id">
              <td style="width: 28px">
                <input
                  type="checkbox"
                  class="tx-checkbox tx-row-check"
                  :checked="selectedIds.includes(tx.id)"
                  @change="handleToggleRow(tx.id)"
                />
              </td>
              <td><span class="tx-id-badge">{{ tx.id }}</span></td>
              <td><span class="tx-customer-name">{{ tx.customer }}</span></td>
              <td><span class="tx-product-name">{{ tx.product }}</span></td>
              <td><span :class="['tx-status-badge', tx.status]">{{ TX_STATUS_LABELS[tx.status] || tx.status }}</span></td>
              <td><span style="font-weight: 650; color: #111827">{{ tx.qty }}</span></td>
              <td><span class="tx-unit-price">{{ tx.unitPrice }}</span></td>
              <td><span class="tx-total-rev">{{ tx.total }}</span></td>
              <td style="text-align: right">
                <button class="btn-tx-actions" type="button" @click="showToast(`Chi tiết đơn ${tx.id}: ${tx.customer} - ${tx.total}`)">
                  •••
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      v-if="showAiModal"
      style="position: fixed; inset: 0; background-color: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 9999"
      @click="showAiModal = false"
    >
      <div
        style="background: #ffffff; border-radius: 16px; padding: 28px; max-width: 520px; width: 90%; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15)"
        @click.stop
      >
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px">
          <span style="font-size: 24px">✨</span>
          <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #111827">AI Phân Tích & Đánh Giá Kinh Doanh</h3>
        </div>
        <div style="font-size: 14px; line-height: 1.7; color: #4b5563">
          <p style="margin: 0 0 10px">• <strong>Doanh số tháng 6 đạt đỉnh</strong> nhờ chiến dịch thời trang cao cấp.</p>
          <p style="margin: 0 0 10px">• <strong>Tỷ lệ chuyển đổi khách quen duy trì ổn định</strong> ở nhóm sản phẩm chủ lực.</p>
          <p style="margin: 0 0 10px">• <strong>Dự báo quý tới:</strong> Doanh thu kỳ vọng tăng thêm <strong>+12%</strong> nếu tiếp tục tối ưu tồn kho.</p>
        </div>
        <div style="margin-top: 24px; display: flex; justify-content: flex-end">
          <button
            type="button"
            style="background: #111827; color: #ffffff; border: none; border-radius: 8px; padding: 10px 20px; font-weight: 600; font-size: 13px; cursor: pointer"
            @click="showAiModal = false"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  </main>
</template>
