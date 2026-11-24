<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { LayoutDashboard, Users, Store, Package, Wallet, Settings, RefreshCw } from 'lucide-vue-next';
import { adminService } from '@/services/admin.service';
import { useToast } from '@/stores/toast';
import { formatVND } from '@/lib/utils';
import type {
  AdminDashboardStats,
  AdminPayout,
  AdminProduct,
  AdminSeller,
  AdminUser,
  PlatformSettings,
} from '@/types/admin.types';

const route = useRoute();
const router = useRouter();
const { showToast } = useToast();

const tabs = [
  { key: 'overview', path: '/admin', label: 'Tổng Quan', icon: LayoutDashboard },
  { key: 'sellers', path: '/admin/sellers', label: 'Gian Hàng', icon: Store },
  { key: 'users', path: '/admin/users', label: 'Người Dùng', icon: Users },
  { key: 'products', path: '/admin/products', label: 'Sản Phẩm', icon: Package },
  { key: 'payouts', path: '/admin/payouts', label: 'Rút Tiền', icon: Wallet },
  { key: 'settings', path: '/admin/settings', label: 'Cấu Hình Sàn', icon: Settings },
] as const;

const activeTab = computed(() => {
  const p = route.path;
  if (p.startsWith('/admin/sellers')) return 'sellers';
  if (p.startsWith('/admin/users')) return 'users';
  if (p.startsWith('/admin/products')) return 'products';
  if (p.startsWith('/admin/payouts')) return 'payouts';
  if (p.startsWith('/admin/settings')) return 'settings';
  return 'overview';
});

const loading = ref(false);
const stats = ref<AdminDashboardStats | null>(null);
const sellers = ref<AdminSeller[]>([]);
const users = ref<AdminUser[]>([]);
const products = ref<AdminProduct[]>([]);
const payouts = ref<AdminPayout[]>([]);
const settings = ref<PlatformSettings | null>(null);

async function loadTabData() {
  loading.value = true;
  try {
    if (activeTab.value === 'overview') {
      stats.value = await adminService.getDashboardStats();
    } else if (activeTab.value === 'sellers') {
      const res = await adminService.getSellers({ pageSize: 50 });
      sellers.value = res.items || [];
    } else if (activeTab.value === 'users') {
      const res = await adminService.getUsers({ pageSize: 50 });
      users.value = res.items || [];
    } else if (activeTab.value === 'products') {
      const res = await adminService.getProducts({ pageSize: 50 });
      products.value = res.items || [];
    } else if (activeTab.value === 'payouts') {
      payouts.value = await adminService.getPayouts();
    } else if (activeTab.value === 'settings') {
      settings.value = await adminService.getSettings();
    }
  } catch {
    showToast('Không thể tải dữ liệu quản trị.', 'error');
  } finally {
    loading.value = false;
  }
}

onMounted(loadTabData);
watch(activeTab, loadTabData);

async function toggleUserActive(u: AdminUser) {
  try {
    await adminService.updateUserStatus(u.id, { isActive: !u.isActive });
    u.isActive = !u.isActive;
    showToast(`Đã ${u.isActive ? 'kích hoạt' : 'khóa'} tài khoản ${u.email}.`);
  } catch {
    showToast('Cập nhật trạng thái thất bại.', 'error');
  }
}

async function toggleProductActive(p: AdminProduct) {
  try {
    await adminService.updateProductStatus(p.id, { isActive: !p.isActive });
    p.isActive = !p.isActive;
    showToast(`Đã ${p.isActive ? 'duyệt hiển thị' : 'tạm ẩn'} sản phẩm ${p.name}.`);
  } catch {
    showToast('Cập nhật sản phẩm thất bại.', 'error');
  }
}

async function saveSettings() {
  if (!settings.value) return;
  try {
    await adminService.updateSettings(settings.value);
    showToast('Đã lưu cấu hình sàn thành công!');
  } catch {
    showToast('Không thể lưu cấu hình.', 'error');
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-8">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-extrabold text-slate-900 m-0">Trung Tâm Quản Trị Sàn Aethelgard</h1>
        <p class="text-xs text-slate-500 mt-1 m-0">Giám sát vận hành, kiểm duyệt gian hàng, người dùng và tài chính toàn hệ thống.</p>
      </div>
      <button type="button" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold cursor-pointer" @click="loadTabData">
        <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" /> Làm mới
      </button>
    </div>

    <div class="flex gap-2 overflow-x-auto pb-2 mb-6">
      <button
        v-for="t in tabs"
        :key="t.key"
        type="button"
        :class="[
          'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all',
          activeTab === t.key ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50',
        ]"
        @click="router.push(t.path)"
      >
        <component :is="t.icon" class="w-4 h-4" />
        <span>{{ t.label }}</span>
      </button>
    </div>

    <div v-if="activeTab === 'overview' && stats" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <span class="text-xs font-bold text-slate-400 uppercase">Tổng Doanh Thu Sàn (GMV)</span>
        <strong class="block text-2xl font-extrabold text-slate-900 mt-1">{{ formatVND(stats.grossGmv || 0) }}</strong>
      </div>
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <span class="text-xs font-bold text-slate-400 uppercase">Tổng Đơn Hàng</span>
        <strong class="block text-2xl font-extrabold text-slate-900 mt-1">{{ stats.totalOrders || 0 }}</strong>
      </div>
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <span class="text-xs font-bold text-slate-400 uppercase">Gian Hàng Đối Tác</span>
        <strong class="block text-2xl font-extrabold text-slate-900 mt-1">{{ stats.totalSellers || 0 }}</strong>
      </div>
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <span class="text-xs font-bold text-slate-400 uppercase">Tổng Sản Phẩm</span>
        <strong class="block text-2xl font-extrabold text-slate-900 mt-1">{{ stats.totalProducts || 0 }}</strong>
      </div>
    </div>

    <div v-if="activeTab === 'sellers'" class="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
      <table class="orders-table">
        <thead><tr><th>ID</th><th>Tên Shop / Người Bán</th><th>Email</th><th>Trạng Thái</th></tr></thead>
        <tbody>
          <tr v-for="s in sellers" :key="s.id">
            <td>{{ s.id }}</td>
            <td class="font-bold">{{ s.fullName }}</td>
            <td>{{ s.email }}</td>
            <td><span class="status-badge status-CONFIRMED">{{ s.sellerStatus || 'Active' }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="activeTab === 'users'" class="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
      <table class="orders-table">
        <thead><tr><th>ID</th><th>Họ Tên</th><th>Email</th><th>Vai Trò</th><th>Trạng Thái</th><th>Thao Tác</th></tr></thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td>{{ u.id }}</td>
            <td class="font-bold">{{ u.fullName }}</td>
            <td>{{ u.email }}</td>
            <td>{{ u.role }}</td>
            <td>{{ u.isActive ? 'Hoạt động' : 'Đã khóa' }}</td>
            <td>
              <button type="button" class="px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold cursor-pointer" @click="toggleUserActive(u)">
                {{ u.isActive ? 'Khóa' : 'Mở khóa' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="activeTab === 'products'" class="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
      <table class="orders-table">
        <thead><tr><th>ID</th><th>Sản Phẩm</th><th>SKU</th><th>Giá</th><th>Hiển Thị</th><th>Thao Tác</th></tr></thead>
        <tbody>
          <tr v-for="p in products" :key="p.id">
            <td>{{ p.id }}</td>
            <td class="font-bold">{{ p.name }}</td>
            <td class="font-mono text-xs">{{ p.sku }}</td>
            <td>{{ formatVND(p.basePrice) }}</td>
            <td>{{ p.isActive ? 'Đang bán' : 'Tạm ẩn' }}</td>
            <td>
              <button type="button" class="px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold cursor-pointer" @click="toggleProductActive(p)">
                {{ p.isActive ? 'Ẩn' : 'Duyệt' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="activeTab === 'payouts'" class="bg-white rounded-2xl border border-slate-200 p-6">
      <p v-if="payouts.length === 0" class="text-sm text-slate-500 m-0">Hiện chưa có yêu cầu rút tiền nào.</p>
      <table v-else class="orders-table">
        <thead><tr><th>ID</th><th>Số Tiền</th><th>Trạng Thái</th></tr></thead>
        <tbody>
          <tr v-for="pay in payouts" :key="pay.id">
            <td>{{ pay.id }}</td>
            <td>{{ formatVND(pay.amount || 0) }}</td>
            <td>{{ pay.status }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="activeTab === 'settings' && settings" class="bg-white rounded-2xl border border-slate-200 p-6 max-w-xl space-y-4">
      <h3 class="text-base font-bold m-0">Cấu Hình Hoa Hồng & Vận Hành Sàn</h3>
      <div>
        <label class="block text-xs font-bold text-slate-600 mb-1">Phí hoa hồng sàn (%)</label>
        <input v-model.number="(settings as any).commissionRate" type="number" class="form-control" />
      </div>
      <button type="button" class="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer" @click="saveSettings">
        Lưu Cấu Hình
      </button>
    </div>
  </div>
</template>
