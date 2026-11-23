<script setup lang="ts">
import { computed, reactive, ref, watch, watchEffect } from 'vue';
import { useRouter } from 'vue-router';
import { isAxiosError } from 'axios';
import {
  User,
  Shield,
  Bell,
  KeyRound,
  LogOut,
  Building2,
  Store,
  Mail,
  Phone,
  CheckCircle2,
  Sliders,
  Lock,
} from 'lucide-vue-next';
import { authState, useAuth } from '@/stores/auth';
import { useToast } from '@/stores/toast';
import { authService } from '@/services/auth.service';
import { STORAGE_KEYS } from '@/lib/constants';
import PasswordStrengthMeter from '@/components/auth/PasswordStrengthMeter.vue';

const router = useRouter();
const { user, token, isLoading: isAuthLoading, logout } = useAuth();
const { showToast } = useToast();

const isAuthorized = ref<boolean | null>(null);
const isGuardLoading = computed(() => isAuthLoading.value || isAuthorized.value === null);

watchEffect(() => {
  if (isAuthLoading.value) return;

  if (!token.value) {
    isAuthorized.value = false;
    router.replace('/login');
    return;
  }

  if (user.value?.role === 'Customer') {
    isAuthorized.value = false;
    showToast('Khu vực quản trị chỉ dành cho Người bán (Seller) và Quản trị viên sàn.');
    router.replace('/');
    return;
  }

  isAuthorized.value = true;
});

const activeTab = ref<'profile' | 'security' | 'operations'>('profile');

// Form thông tin người bán
const profileForm = reactive({
  fullName: '',
  email: '',
  phoneNumber: '',
  storeName: '',
  role: 'Seller',
});

// Form đổi mật khẩu
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});
const isChangingPassword = ref(false);

// Cấu hình vận hành
const settings = reactive({
  orderNotification: true,
  lowStockAlert: true,
  lowStockThreshold: 10,
  autoConfirmOrders: false,
  emailDailyReport: true,
});

watch(
  user,
  (u) => {
    if (typeof window !== 'undefined' && u) {
      profileForm.fullName = u.fullName || 'Đối Tác Luxury';
      profileForm.email = u.email || '';
      profileForm.phoneNumber = u.phoneNumber || '(+84) 28 3824 0000';
      profileForm.storeName = u.fullName || 'Gian Hàng Chính Hãng';
      profileForm.role = u.role || 'Seller';
    }
  },
  { immediate: true },
);

const handleUpdateProfile = () => {
  if (typeof window !== 'undefined' && user.value) {
    const updated = {
      ...user.value,
      fullName: profileForm.fullName,
      phoneNumber: profileForm.phoneNumber,
    };
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(updated));
    authState.user = updated;
  }
  showToast('Đã lưu thông tin tài khoản thành công!');
};

const handleChangePassword = async () => {
  if (isChangingPassword.value) return;
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    showToast('Mật khẩu mới và xác nhận mật khẩu không khớp!', 'error');
    return;
  }

  isChangingPassword.value = true;
  try {
    await authService.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
    showToast('Đổi mật khẩu tài khoản seller thành công!', 'success');
    passwordForm.currentPassword = '';
    passwordForm.newPassword = '';
    passwordForm.confirmPassword = '';
  } catch (error) {
    const message = isAxiosError(error) ? error.response?.data?.message : undefined;
    showToast(message || 'Không thể đổi mật khẩu, vui lòng thử lại.', 'error');
  } finally {
    isChangingPassword.value = false;
  }
};

const handleLogout = () => {
  logout();
  router.push('/login');
  showToast('Đã đăng xuất khỏi tài khoản đối tác.');
};
</script>

<template>
  <div
    v-if="isGuardLoading || !isAuthorized"
    class="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white text-center"
  >
    <div class="flex flex-col items-center gap-3">
      <div class="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      <p class="text-sm text-slate-400 font-medium">Đang xác thực quyền quản trị tài khoản seller...</p>
    </div>
  </div>

  <main v-else class="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
    <div class="max-w-5xl mx-auto">
      <!-- Header Breadcrumb -->
      <div class="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
        <div>
          <nav class="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2">
            <router-link to="/" class="hover:text-slate-900 transition-colors">Cửa Hàng</router-link>
            <span>/</span>
            <span class="text-sky-600">Tài Khoản Đối Tác</span>
          </nav>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Quản Trị Tài Khoản Seller
          </h1>
          <p class="text-sm text-slate-500 mt-1">
            Quản lý định danh doanh nghiệp, bảo mật phân quyền và các thiết lập vận hành bán hàng.
          </p>
        </div>

        <button
          type="button"
          @click="handleLogout"
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          <LogOut class="w-4 h-4" />
          <span>Đăng Xuất</span>
        </button>
      </div>

      <!-- Tab Navigation -->
      <div class="flex items-center gap-2 mb-8 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
        <button
          type="button"
          @click="activeTab = 'profile'"
          :class="[
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
            activeTab === 'profile'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-100'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
          ]"
        >
          <User class="w-4 h-4" />
          <span>Hồ Sơ Doanh Nghiệp</span>
        </button>

        <button
          type="button"
          @click="activeTab = 'security'"
          :class="[
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
            activeTab === 'security'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-100'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
          ]"
        >
          <Shield class="w-4 h-4" />
          <span>Bảo Mật &amp; Mật Khẩu</span>
        </button>

        <button
          type="button"
          @click="activeTab = 'operations'"
          :class="[
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
            activeTab === 'operations'
              ? 'bg-sky-500 text-white shadow-md shadow-sky-100'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
          ]"
        >
          <Sliders class="w-4 h-4" />
          <span>Cấu Hình Vận Hành</span>
        </button>
      </div>

      <!-- TAB 1: HỒ SƠ DOANH NGHIỆP -->
      <div
        v-if="activeTab === 'profile'"
        class="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm"
      >
        <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div class="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600">
            <Building2 class="w-6 h-6" />
          </div>
          <div>
            <h2 class="text-base font-bold text-slate-900">Thông Tin Định Danh Gian Hàng</h2>
            <p class="text-xs text-slate-500">Thông tin hiển thị chính thức trên hệ thống hợp đồng phân phối</p>
          </div>
        </div>

        <form @submit.prevent="handleUpdateProfile" class="space-y-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Tên Đại Diện Doanh Nghiệp / Thương Hiệu
              </label>
              <div class="relative">
                <Store class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  v-model="profileForm.fullName"
                  class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Email Quản Trị Hệ Thống
              </label>
              <div class="relative">
                <Mail class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  disabled
                  :value="profileForm.email"
                  class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-500 cursor-not-allowed"
                />
              </div>
              <span class="text-[11px] text-slate-400 mt-1 block">Email dùng để đăng nhập và định danh tài khoản</span>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Số Điện Thoại Hotline Đối Tác
              </label>
              <div class="relative">
                <Phone class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  v-model="profileForm.phoneNumber"
                  class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Cấp Độ Đối Tác (Role)
              </label>
              <div class="flex items-center gap-2 p-2.5 rounded-xl bg-sky-50 border border-sky-200">
                <CheckCircle2 class="w-5 h-5 text-sky-600" />
                <div>
                  <span class="text-xs font-bold text-sky-950 block">Thương Hiệu Được Ủy Quyền Chính Thức</span>
                  <span class="text-[11px] text-sky-700">Quyền quản trị toàn diện: Đăng bán, Tồn kho, Báo cáo tài chính</span>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
            <router-link
              to="/shop-profile"
              class="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
            >
              Xem Hồ Sơ Shop
            </router-link>
            <button
              type="submit"
              class="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-md shadow-sky-100 transition-all cursor-pointer"
            >
              Lưu Thay Đổi
            </button>
          </div>
        </form>
      </div>

      <!-- TAB 2: BẢO MẬT & ĐỔI MẬT KHẨU -->
      <div
        v-if="activeTab === 'security'"
        class="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm"
      >
        <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div class="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600">
            <KeyRound class="w-6 h-6" />
          </div>
          <div>
            <h2 class="text-base font-bold text-slate-900">Thiết Lập Bảo Mật &amp; Mật Khẩu</h2>
            <p class="text-xs text-slate-500">Cập nhật mật khẩu định kỳ để bảo vệ gian hàng và dữ liệu doanh số</p>
          </div>
        </div>

        <form @submit.prevent="handleChangePassword" class="space-y-6 max-w-lg">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Mật Khẩu Hiện Tại
            </label>
            <div class="relative">
              <Lock class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                autocomplete="current-password"
                placeholder="Nhập mật khẩu hiện tại"
                v-model="passwordForm.currentPassword"
                class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Mật Khẩu Mới
            </label>
            <div class="relative">
              <KeyRound class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                autocomplete="new-password"
                :minlength="8"
                :maxlength="128"
                placeholder="Tối thiểu 8 ký tự"
                :aria-describedby="passwordForm.newPassword ? 'account-password-strength' : undefined"
                v-model="passwordForm.newPassword"
                class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <PasswordStrengthMeter :password="passwordForm.newPassword" id="account-password-strength" />

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Xác Nhận Mật Khẩu Mới
            </label>
            <div class="relative">
              <KeyRound class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                autocomplete="new-password"
                :maxlength="128"
                placeholder="Nhập lại mật khẩu mới"
                v-model="passwordForm.confirmPassword"
                class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div class="pt-4">
            <button
              type="submit"
              :disabled="isChangingPassword"
              class="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-md shadow-sky-100 transition-all cursor-pointer disabled:opacity-50"
            >
              {{ isChangingPassword ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu Mới' }}
            </button>
          </div>
        </form>
      </div>

      <!-- TAB 3: CẤU HÌNH VẬN HÀNH -->
      <div
        v-if="activeTab === 'operations'"
        class="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm"
      >
        <div class="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div class="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Bell class="w-6 h-6" />
          </div>
          <div>
            <h2 class="text-base font-bold text-slate-900">Thiết Lập Thông Báo &amp; Tồn Kho</h2>
            <p class="text-xs text-slate-500">Tùy biến cảnh báo vận hành gian hàng thời gian thực</p>
          </div>
        </div>

        <div class="space-y-6">
          <div class="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
            <div>
              <h3 class="text-sm font-bold text-slate-900">Thông Báo Đơn Hàng Mới Tức Thì</h3>
              <p class="text-xs text-slate-500 mt-0.5">Phát tín hiệu chuông và cập nhật số liệu qua SignalR khi có khách đặt hàng</p>
            </div>
            <input
              type="checkbox"
              v-model="settings.orderNotification"
              class="w-5 h-5 accent-sky-500 rounded cursor-pointer"
            />
          </div>

          <div class="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
            <div>
              <h3 class="text-sm font-bold text-slate-900">Cảnh Báo Tồn Kho Thấp</h3>
              <p class="text-xs text-slate-500 mt-0.5">Nhận cảnh báo khi số lượng sản phẩm trong kho giảm dưới ngưỡng thiết lập</p>
            </div>
            <div class="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="100"
                v-model.number="settings.lowStockThreshold"
                class="w-16 px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-center"
              />
              <span class="text-xs text-slate-500">sản phẩm</span>
              <input
                type="checkbox"
                v-model="settings.lowStockAlert"
                class="w-5 h-5 accent-sky-500 rounded cursor-pointer"
              />
            </div>
          </div>

          <div class="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
            <div>
              <h3 class="text-sm font-bold text-slate-900">Báo Cáo Doanh Thu Định Kỳ</h3>
              <p class="text-xs text-slate-500 mt-0.5">Tự động tổng hợp dữ liệu doanh số và gửi báo cáo về tài khoản</p>
            </div>
            <input
              type="checkbox"
              v-model="settings.emailDailyReport"
              class="w-5 h-5 accent-sky-500 rounded cursor-pointer"
            />
          </div>

          <div class="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              @click="showToast('Đã lưu cấu hình vận hành thành công!')"
              class="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-md shadow-sky-100 transition-all cursor-pointer"
            >
              Lưu Cấu Hình
            </button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
