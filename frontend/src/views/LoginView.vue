<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue';
import { Eye, EyeOff, ArrowLeft, Shield, Store, User } from 'lucide-vue-next';
import { isAxiosError } from 'axios';
import GoogleButton from '@/components/auth/GoogleButton.vue';
import AuthSlider from '@/components/auth/AuthSlider.vue';
import PasswordStrengthMeter from '@/components/auth/PasswordStrengthMeter.vue';
import { authService } from '@/services/auth.service';
import { useToast } from '@/stores/toast';
import { setAuthState } from '@/stores/auth';

function resolvePostLoginPath(role: string | undefined, savedPath: string | null): string {
  if (role === 'Admin') {
    if (savedPath && savedPath !== '/login') return savedPath;
    return '/admin';
  }
  if (role === 'Seller') {
    if (savedPath && savedPath !== '/login' && savedPath !== '/shop') return savedPath;
    return '/';
  }
  if (
    savedPath &&
    savedPath !== '/login' &&
    !savedPath.startsWith('/inventory') &&
    !savedPath.startsWith('/orders') &&
    !savedPath.startsWith('/income') &&
    savedPath !== '/shop-profile'
  ) {
    return savedPath;
  }
  return '/shop';
}

const { showToast } = useToast();

const activeTab = ref<'login' | 'register'>('login');
const showLoginPassword = ref(false);
const showRegPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

const forgotFlowOpen = ref(false);
const forgotStep = ref<1 | 2 | 3>(1);

const selectedRole = ref<'Admin' | 'Seller' | 'Customer' | null>(null);
const loginEmail = ref('');
const loginPassword = ref('');
const regName = ref('');
const regEmail = ref('');
const regPassword = ref('');
const forgotEmail = ref('');
const otpBoxes = ref<string[]>(['', '', '', '', '', '']);
const newPass = ref('');
const confirmPass = ref('');

const resetPending = ref(false);
const authPending = ref(false);
const resendSeconds = ref(60);
const resendActive = ref(false);

const otpInputsRef = ref<(HTMLInputElement | null)[]>([]);
let resendTimer: ReturnType<typeof setInterval> | null = null;

watch([forgotFlowOpen, forgotStep], async ([open, step]) => {
  if (open && step === 2) {
    await nextTick();
    otpInputsRef.value[0]?.focus();
  }
});

watch(resendActive, (active) => {
  if (resendTimer) {
    clearInterval(resendTimer);
    resendTimer = null;
  }
  if (!active) return;
  resendTimer = setInterval(() => {
    if (resendSeconds.value <= 1) {
      resendSeconds.value = 0;
      resendActive.value = false;
      if (resendTimer) clearInterval(resendTimer);
    } else {
      resendSeconds.value -= 1;
    }
  }, 1000);
});

onUnmounted(() => {
  if (resendTimer) clearInterval(resendTimer);
});

async function handleGoogleCredential(credential: string) {
  try {
    showToast('Đang xác thực tài khoản Google.', 'info');
    const res = await authService.googleLogin(credential, selectedRole.value ?? undefined);
    if (res && res.token) {
      setAuthState(res.token, res);
      showToast(`Đăng nhập Google thành công! Chào mừng ${res.fullName}.`);
      const dest = resolvePostLoginPath(res.role, sessionStorage.getItem('redirect_after_login'));
      sessionStorage.removeItem('redirect_after_login');
      setTimeout(() => {
        window.location.href = dest;
      }, 500);
    }
  } catch (err: unknown) {
    const msg = isAxiosError(err) ? err.response?.data?.message : undefined;
    showToast(msg || 'Đăng nhập Google thất bại', 'error');
  }
}

async function handleLoginSubmit() {
  if (authPending.value) return;
  authPending.value = true;
  try {
    const data = await authService.login({
      email: loginEmail.value.trim(),
      password: loginPassword.value,
    });
    setAuthState(data.token, data);
    showToast(`Đăng nhập thành công! Chào mừng ${data.fullName || loginEmail.value} trở lại.`);
    const dest = resolvePostLoginPath(data.role, sessionStorage.getItem('redirect_after_login'));
    sessionStorage.removeItem('redirect_after_login');
    setTimeout(() => {
      window.location.href = dest;
    }, 500);
  } catch (error) {
    const errorMsg =
      (isAxiosError(error) ? error.response?.data?.message : undefined) ||
      'Email hoặc mật khẩu không chính xác.';
    showToast(errorMsg, 'error');
    authPending.value = false;
  }
}

function handleRoleSelect(role: 'Admin' | 'Seller' | 'Customer') {
  selectedRole.value = role;
  activeTab.value = 'login';
  if (role === 'Admin') {
    loginEmail.value = 'admin@gmail.com';
  } else if (role === 'Seller') {
    loginEmail.value = 'gucci@gmail.com';
  } else {
    loginEmail.value = 'esther.howard@example.com';
  }
  loginPassword.value = '';
}

async function handleRegisterSubmit() {
  if (authPending.value) return;
  authPending.value = true;
  try {
    const data = await authService.register({
      fullName: regName.value.trim(),
      email: regEmail.value.trim(),
      password: regPassword.value,
      role: 'Customer',
    });
    setAuthState(data.token, data);
    showToast(`Đăng ký thành công! Chào mừng ${data.fullName || regName.value} đến với Aethelgard.`);
    setTimeout(() => {
      window.location.href = resolvePostLoginPath(data.role, '/');
    }, 600);
  } catch (error) {
    const errorMsg =
      (isAxiosError(error) ? error.response?.data?.message : undefined) ||
      'Đăng ký tài khoản thất bại.';
    showToast(errorMsg, 'error');
    authPending.value = false;
  }
}

function showResetError(error: unknown, fallback: string) {
  const response = isAxiosError(error) ? error.response : undefined;
  showToast(
    response?.status === 429
      ? 'Quá nhiều yêu cầu. Vui lòng thử lại sau.'
      : response?.data?.message || fallback,
    'error'
  );
}

async function sendResetCode() {
  if (resetPending.value || (forgotStep.value === 2 && resendActive.value)) return;
  resetPending.value = true;
  try {
    await authService.forgotPassword({ email: forgotEmail.value.trim() });
    otpBoxes.value = Array(6).fill('');
    resendSeconds.value = 60;
    resendActive.value = true;
    forgotStep.value = 2;
    await nextTick();
    otpInputsRef.value[0]?.focus();
    showToast('Nếu email đã đăng ký, bạn sẽ nhận được mã xác thực.', 'info');
  } catch (error) {
    showResetError(error, 'Không gửi được mã xác thực. Vui lòng thử lại.');
  } finally {
    resetPending.value = false;
  }
}

function handleOtpChange(index: number, value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 6);
  if (digits.length === 6) {
    otpBoxes.value = digits.split('');
    otpInputsRef.value[5]?.focus();
    return;
  }
  const digit = digits.slice(-1);
  otpBoxes.value = otpBoxes.value.map((current, i) => (i === index ? digit : current));
  if (digit) otpInputsRef.value[index + 1]?.focus();
}

function handleOtpKeyDown(index: number, e: KeyboardEvent) {
  if (e.key === 'Backspace' && !otpBoxes.value[index]) {
    otpInputsRef.value[index - 1]?.focus();
  }
}

function handleOtpPaste(e: ClipboardEvent) {
  e.preventDefault();
  const digits = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
  if (!digits) return;
  otpBoxes.value = Array.from({ length: 6 }, (_, i) => digits[i] ?? '');
  otpInputsRef.value[Math.min(digits.length, 5)]?.focus();
}

async function verifyResetCode() {
  const otp = otpBoxes.value.join('');
  if (resetPending.value || otp.length !== 6) return;
  resetPending.value = true;
  try {
    await authService.verifyOtp({ email: forgotEmail.value.trim(), otp });
    forgotStep.value = 3;
    showToast('Mã hợp lệ. Bạn có thể đặt mật khẩu mới.', 'success');
  } catch (error) {
    showResetError(error, 'Không xác thực được mã. Vui lòng thử lại.');
  } finally {
    resetPending.value = false;
  }
}

function closeResetFlow() {
  forgotFlowOpen.value = false;
  forgotStep.value = 1;
  otpBoxes.value = Array(6).fill('');
  newPass.value = '';
  confirmPass.value = '';
  showNewPassword.value = false;
  showConfirmPassword.value = false;
}

async function handleForgotStep3Submit() {
  if (resetPending.value) return;
  if (newPass.value.length < 8 || !newPass.value.trim() || newPass.value.length > 128) {
    showToast('Nhập mật khẩu mới từ 8 đến 128 ký tự.', 'error');
    return;
  }
  if (newPass.value !== confirmPass.value) {
    showToast('Mật khẩu xác nhận không trùng khớp.', 'error');
    return;
  }

  resetPending.value = true;
  try {
    await authService.resetPassword({
      email: forgotEmail.value.trim(),
      otp: otpBoxes.value.join(''),
      newPassword: newPass.value,
    });
    loginEmail.value = forgotEmail.value.trim();
    loginPassword.value = '';
    closeResetFlow();
    activeTab.value = 'login';
    showToast('Đặt lại mật khẩu thành công. Hãy đăng nhập bằng mật khẩu mới.', 'success');
  } catch (error) {
    showResetError(error, 'Không đặt lại được mật khẩu. Vui lòng thử lại.');
  } finally {
    resetPending.value = false;
  }
}
</script>

<template>
  <div class="login-split-page antialiased font-jakarta">
    <div class="login-left-col">
      <div class="mb-4 flex items-center justify-between">
        <router-link to="/" class="inline-flex items-center gap-3.5 group">
          <div class="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-white font-serif font-bold text-xl shadow-md border border-slate-800 tracking-tighter group-hover:scale-105 transition-all">
            <span class="bg-gradient-to-tr from-slate-200 via-white to-slate-400 bg-clip-text text-transparent italic">Æ</span>
          </div>
          <div class="flex flex-col">
            <span class="text-xl font-extrabold tracking-[0.18em] text-slate-900 uppercase font-serif">Aethelgard</span>
            <span class="text-[10px] tracking-[0.2em] text-slate-400 font-semibold uppercase -mt-0.5">Trung Tâm Mua Sắm • Tích Hợp AI</span>
          </div>
        </router-link>
      </div>

      <div v-if="!forgotFlowOpen" class="my-auto py-2 transition-transform motion-reduce:transition-none duration-300">
        <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
          {{ activeTab === 'login' ? 'Đăng nhập tài khoản' : 'Tạo tài khoản mới' }}
        </h1>
        <p class="text-slate-500 text-sm sm:text-base leading-relaxed mb-6">
          {{
            activeTab === 'login'
              ? 'Chào mừng bạn trở lại! Đăng nhập để vào không gian cá nhân, nhận ưu đãi độc quyền và mua sắm thông minh cùng AI.'
              : 'Không gian mua sắm của riêng bạn bắt đầu từ đây. Tạo tài khoản để sử dụng đầy đủ tính năng.'
          }}
        </p>

        <div>
          <GoogleButton label="Tiếp tục với Google" @credential="handleGoogleCredential" />
        </div>

        <div class="mt-3.5 mb-6">
          <div class="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              :class="[
                'group relative flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border transition-all duration-200 cursor-pointer',
                selectedRole === 'Admin'
                  ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                  : 'bg-white border-slate-200/90 text-slate-700 hover:border-slate-400 hover:bg-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
              ]"
              title="Chọn vai trò Quản trị viên (admin@gmail.com)"
              @click="handleRoleSelect('Admin')"
            >
              <Shield :class="['w-3.5 h-3.5 transition-colors', selectedRole === 'Admin' ? 'text-white' : 'text-slate-400 group-hover:text-slate-700']" />
              <span class="text-[12px] font-semibold tracking-wide">Quản trị</span>
            </button>

            <button
              type="button"
              :class="[
                'group relative flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border transition-all duration-200 cursor-pointer',
                selectedRole === 'Seller'
                  ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                  : 'bg-white border-slate-200/90 text-slate-700 hover:border-slate-400 hover:bg-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
              ]"
              title="Chọn vai trò Người bán (gucci@gmail.com)"
              @click="handleRoleSelect('Seller')"
            >
              <Store :class="['w-3.5 h-3.5 transition-colors', selectedRole === 'Seller' ? 'text-white' : 'text-slate-400 group-hover:text-slate-700']" />
              <span class="text-[12px] font-semibold tracking-wide">Người bán</span>
            </button>

            <button
              type="button"
              :class="[
                'group relative flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border transition-all duration-200 cursor-pointer',
                selectedRole === 'Customer'
                  ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                  : 'bg-white border-slate-200/90 text-slate-700 hover:border-slate-400 hover:bg-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
              ]"
              title="Chọn vai trò Khách hàng (esther.howard@example.com)"
              @click="handleRoleSelect('Customer')"
            >
              <User :class="['w-3.5 h-3.5 transition-colors', selectedRole === 'Customer' ? 'text-white' : 'text-slate-400 group-hover:text-slate-700']" />
              <span class="text-[12px] font-semibold tracking-wide">Khách hàng</span>
            </button>
          </div>
        </div>

        <div class="flex items-center gap-4 mb-6">
          <div class="flex-1 h-px bg-slate-200"></div>
          <span class="text-xs text-slate-400 font-medium">or</span>
          <div class="flex-1 h-px bg-slate-200"></div>
        </div>

        <div class="relative bg-slate-100 rounded-xl p-1 flex mb-6">
          <div :class="['tab-slider', activeTab === 'login' ? 'slide-right' : '']"></div>
          <button
            type="button"
            :class="['tab-button', activeTab === 'register' ? 'active' : '']"
            @click="activeTab = 'register'"
          >
            Đăng Ký
          </button>
          <button
            type="button"
            :class="['tab-button', activeTab === 'login' ? 'active' : '']"
            @click="activeTab = 'login'"
          >
            Đăng Nhập
          </button>
        </div>

        <form v-if="activeTab === 'login'" class="space-y-4 animate-fade-in" @submit.prevent="handleLoginSubmit">
          <div>
            <label class="input-label">Địa chỉ Email</label>
            <input v-model="loginEmail" type="email" required class="input-field !pl-4" placeholder="dior@gmail.com" />
          </div>

          <div>
            <div class="flex justify-between items-center mb-1">
              <label class="input-label mb-0">Mật khẩu</label>
              <a
                href="#"
                class="text-xs font-semibold text-sketch-purple hover:underline transition-colors flex items-center gap-1"
                @click.prevent="forgotFlowOpen = true; forgotStep = 1"
              >
                <span>Quên mật khẩu?</span>
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            </div>
            <div class="input-wrapper relative">
              <input
                v-model="loginPassword"
                :type="showLoginPassword ? 'text' : 'password'"
                required
                autocomplete="current-password"
                class="input-field !pl-4 pr-12"
                :placeholder="showLoginPassword ? 'Mật khẩu' : '••••••••'"
              />
              <button
                type="button"
                class="toggle-eye"
                style="z-index: 20"
                aria-label="Hiện/ẩn mật khẩu"
                @mousedown.prevent
                @click.prevent.stop="showLoginPassword = !showLoginPassword"
              >
                <EyeOff v-if="showLoginPassword" class="w-5 h-5 text-sky-600" />
                <Eye v-else class="w-5 h-5" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            :disabled="authPending"
            class="w-full py-3.5 px-4 bg-sketch-purple hover:opacity-90 text-white rounded-lg font-bold text-sm transition-all shadow-md mt-4 cursor-pointer"
          >
            Đăng Nhập
          </button>
        </form>

        <form v-if="activeTab === 'register'" class="space-y-4 animate-fade-in" @submit.prevent="handleRegisterSubmit">
          <div>
            <label class="input-label">Họ và tên</label>
            <input v-model="regName" type="text" required class="input-field !pl-4" placeholder="Nguyễn Đức Mạnh" />
          </div>

          <div>
            <label class="input-label">Địa chỉ Email</label>
            <input v-model="regEmail" type="email" required class="input-field !pl-4" placeholder="seller@gmail.com" />
          </div>

          <div>
            <label class="input-label">Mật khẩu</label>
            <div class="input-wrapper relative">
              <input
                v-model="regPassword"
                :type="showRegPassword ? 'text' : 'password'"
                required
                autocomplete="new-password"
                minlength="8"
                maxlength="128"
                :aria-describedby="regPassword ? 'register-password-strength' : undefined"
                class="input-field !pl-4 pr-12"
                placeholder="Tạo mật khẩu an toàn"
              />
              <button
                type="button"
                class="toggle-eye"
                style="z-index: 20"
                aria-label="Hiện/ẩn mật khẩu"
                @mousedown.prevent
                @click.prevent.stop="showRegPassword = !showRegPassword"
              >
                <EyeOff v-if="showRegPassword" class="w-5 h-5 text-sky-600" />
                <Eye v-else class="w-5 h-5" />
              </button>
            </div>

            <PasswordStrengthMeter id="register-password-strength" :password="regPassword" />
          </div>

          <button
            type="submit"
            :disabled="authPending"
            class="w-full py-3.5 px-4 bg-sketch-purple hover:opacity-90 text-white rounded-lg font-bold text-sm transition-all shadow-md mt-4 cursor-pointer"
          >
            Tiếp tục
          </button>
        </form>

        <p class="text-xs text-slate-400 mt-5 leading-relaxed text-center">
          Khi tiếp tục, bạn đồng ý với
          <a href="#" class="text-slate-700 underline font-medium" @click.prevent="showToast('Điều khoản dịch vụ')">
            Điều khoản dịch vụ
          </a>
          và
          <a href="#" class="text-slate-700 underline font-medium" @click.prevent="showToast('Chính sách bảo mật')">
            Chính sách bảo mật
          </a>.
        </p>
      </div>

      <div v-else class="my-auto py-2 text-center max-w-sm mx-auto w-full animate-fade-in">
        <div v-if="forgotStep === 1">
          <div class="text-left mb-2">
            <button type="button" :disabled="resetPending" class="sketch-back-btn" title="Quay lại đăng nhập" @click="closeResetFlow">
              <ArrowLeft class="w-4 h-4" />
              <span>Quay lại</span>
            </button>
          </div>

          <div class="sketch-illustration-box">
            <div class="sketch-semicircle-bg"></div>
            <svg class="sketch-svg" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="20" y1="140" x2="180" y2="140" stroke="#8065c9" stroke-width="2.5" stroke-dasharray="14 8 4 6" stroke-linecap="round" />
              <path d="M70 140 C70 115, 80 105, 100 105 C120 105, 130 115, 130 140" stroke="#8065c9" stroke-width="3.5" fill="#e8e2fc" stroke-linecap="round" />
              <circle cx="100" cy="80" r="22" stroke="#8065c9" stroke-width="3.5" fill="#ffffff" />
              <path d="M78 78 C78 60, 122 60, 122 78 C120 62, 80 62, 78 78 Z" fill="#8065c9" />
              <circle cx="93" cy="78" r="2.5" fill="#8065c9" />
              <circle cx="107" cy="78" r="2.5" fill="#8065c9" />
              <path d="M96 90 Q100 88 104 90" stroke="#8065c9" stroke-width="2" stroke-linecap="round" />
              <text x="60" y="55" font-family="sans-serif" font-weight="bold" font-size="22" fill="#8065c9">?</text>
              <text x="135" y="50" font-family="sans-serif" font-weight="bold" font-size="24" fill="#8065c9">?</text>
              <text x="145" y="80" font-family="sans-serif" font-weight="bold" font-size="18" fill="#8065c9">?</text>
              <text x="50" y="85" font-family="sans-serif" font-weight="bold" font-size="18" fill="#8065c9">?</text>
            </svg>
          </div>

          <h2 class="text-2xl font-extrabold text-slate-800 mb-1.5">Quên mật khẩu?</h2>
          <p class="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto mb-6">
            Nhập địa chỉ email, chúng tôi sẽ gửi mã để bạn đặt lại mật khẩu
          </p>

          <form class="space-y-4" @submit.prevent="sendResetCode">
            <div>
              <input v-model="forgotEmail" type="email" required class="sketch-input" placeholder="Địa chỉ email (VD: ten@gmail.com)" />
            </div>

            <div class="grid grid-cols-2 gap-3 pt-2">
              <button type="button" :disabled="resetPending" class="sketch-btn-cancel" @click="closeResetFlow">Hủy</button>
              <button type="submit" :disabled="resetPending" class="sketch-btn-purple">Gửi mã xác thực</button>
            </div>
          </form>
        </div>

        <div v-if="forgotStep === 2">
          <div class="text-left mb-2">
            <button type="button" :disabled="resetPending" class="sketch-back-btn" title="Quay lại bước 1" @click="forgotStep = 1">
              <ArrowLeft class="w-4 h-4" />
              <span>Quay lại</span>
            </button>
          </div>

          <div class="sketch-illustration-box">
            <div class="sketch-semicircle-bg"></div>
            <svg class="sketch-svg" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="20" y1="140" x2="180" y2="140" stroke="#8065c9" stroke-width="2.5" stroke-dasharray="14 8 4 6" stroke-linecap="round" />
              <rect x="75" y="45" width="50" height="55" rx="3" fill="#ffffff" stroke="#8065c9" stroke-width="3" />
              <text x="82" y="64" font-family="sans-serif" font-weight="bold" font-size="10" fill="#8065c9" letter-spacing="1">ĐẶT LẠI</text>
              <line x1="84" y1="74" x2="116" y2="74" stroke="#8065c9" stroke-width="2.5" stroke-linecap="round" />
              <line x1="86" y1="82" x2="114" y2="82" stroke="#8065c9" stroke-width="2.5" stroke-linecap="round" />
              <path d="M60 80 L100 105 L140 80 L140 135 L60 135 Z" fill="#e8e2fc" stroke="#8065c9" stroke-width="3.5" stroke-linejoin="round" />
              <path d="M60 80 L100 110 L140 80" stroke="#8065c9" stroke-width="3" fill="none" stroke-linejoin="round" />
            </svg>
          </div>

          <h2 class="text-2xl font-extrabold text-slate-800 mb-1.5">Kiểm tra hộp thư của bạn!</h2>
          <p class="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto mb-4">
            Nếu email đã đăng ký, bạn sẽ nhận được mã xác thực.
          </p>

          <div class="space-y-4 mb-6">
            <div class="flex items-center justify-center gap-2">
              <input
                v-for="(digit, idx) in otpBoxes"
                :key="idx"
                :ref="(el) => { otpInputsRef[idx] = el as HTMLInputElement | null; }"
                type="text"
                :maxlength="idx === 0 ? 6 : 1"
                pattern="[0-9]*"
                inputmode="numeric"
                :autocomplete="idx === 0 ? 'one-time-code' : 'off'"
                :aria-label="`Chữ số OTP thứ ${idx + 1}`"
                :disabled="resetPending"
                :value="digit"
                :class="['otp-box', digit ? 'filled' : '']"
                @input="handleOtpChange(idx, ($event.target as HTMLInputElement).value)"
                @keydown="handleOtpKeyDown(idx, $event)"
                @paste="handleOtpPaste"
              />
            </div>

            <div class="flex items-center justify-between text-xs px-2">
              <button type="button" :disabled="resetPending" class="text-slate-400 hover:text-slate-700" @click="forgotStep = 1">
                ← Quay lại
              </button>
              <button
                type="button"
                :disabled="resendActive || resetPending"
                :class="['text-sketch-purple font-semibold', resendActive ? 'opacity-50 cursor-not-allowed' : 'hover:underline']"
                @click="sendResetCode"
              >
                {{ resendActive ? `Gửi lại OTP (${resendSeconds}s)` : 'Gửi lại OTP' }}
              </button>
            </div>

            <button
              type="button"
              :disabled="resetPending || otpBoxes.some((d) => !d)"
              class="sketch-btn-purple w-full"
              @click="verifyResetCode"
            >
              Xác thực OTP & Tiếp tục
            </button>
          </div>

          <div class="border-t border-slate-100 pt-4 mt-4">
            <p class="text-[11px] text-slate-400">Mọi thắc mắc hoặc sự cố, vui lòng gửi email tới</p>
            <a href="mailto:helpdesk@aethelgard.com" class="text-xs font-bold text-sketch-purple hover:underline mt-0.5 inline-block">
              helpdesk@aethelgard.com
            </a>
          </div>
        </div>

        <div v-if="forgotStep === 3">
          <div class="text-left mb-2">
            <button type="button" :disabled="resetPending" class="sketch-back-btn" title="Quay lại bước nhập OTP" @click="forgotStep = 2">
              <ArrowLeft class="w-4 h-4" />
              <span>Quay lại</span>
            </button>
          </div>

          <div class="sketch-illustration-box">
            <div class="sketch-semicircle-bg"></div>
            <svg class="sketch-svg" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="20" y1="140" x2="180" y2="140" stroke="#8065c9" stroke-width="2.5" stroke-dasharray="14 8 4 6" stroke-linecap="round" />
              <path d="M60 115 C50 60, 150 50, 140 120 M60 115 L80 100 M60 115 L80 130" stroke="#8065c9" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
              <circle cx="130" cy="55" r="18" fill="#ffffff" stroke="#8065c9" stroke-width="3" />
              <rect x="122" y="55" width="16" height="13" rx="2" fill="#8065c9" />
              <path d="M125 55 V50 A5 5 0 0 1 135 50 V55" stroke="#8065c9" stroke-width="2.5" fill="none" />
            </svg>
          </div>

          <h2 class="text-2xl font-extrabold text-slate-800 mb-1.5">Đặt lại mật khẩu</h2>
          <p class="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto mb-6">
            Bạn muốn đặt mật khẩu mới là gì?
          </p>

          <form class="space-y-4" @submit.prevent="handleForgotStep3Submit">
            <div>
              <div class="input-wrapper relative">
                <input
                  v-model="newPass"
                  :type="showNewPassword ? 'text' : 'password'"
                  required
                  autocomplete="new-password"
                  minlength="8"
                  maxlength="128"
                  :aria-describedby="newPass ? 'reset-password-strength' : undefined"
                  class="sketch-input pr-12"
                  placeholder="Mật khẩu"
                />
                <button
                  type="button"
                  class="toggle-eye"
                  style="z-index: 20"
                  aria-label="Hiện/ẩn mật khẩu"
                  @mousedown.prevent
                  @click.prevent.stop="showNewPassword = !showNewPassword"
                >
                  <EyeOff v-if="showNewPassword" class="w-5 h-5 text-sky-600" />
                  <Eye v-else class="w-5 h-5" />
                </button>
              </div>
              <PasswordStrengthMeter id="reset-password-strength" :password="newPass" />
            </div>

            <div>
              <div class="input-wrapper relative">
                <input
                  v-model="confirmPass"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  required
                  autocomplete="new-password"
                  maxlength="128"
                  class="sketch-input pr-12"
                  placeholder="Xác nhận mật khẩu"
                />
                <button
                  type="button"
                  class="toggle-eye"
                  style="z-index: 20"
                  aria-label="Hiện/ẩn mật khẩu"
                  @mousedown.prevent
                  @click.prevent.stop="showConfirmPassword = !showConfirmPassword"
                >
                  <EyeOff v-if="showConfirmPassword" class="w-5 h-5 text-sky-600" />
                  <Eye v-else class="w-5 h-5" />
                </button>
              </div>
            </div>

            <button type="submit" :disabled="resetPending" class="sketch-btn-purple w-full">Lưu</button>
          </form>
        </div>
      </div>

      <div class="pt-4 border-t border-slate-100 text-center">
        <p class="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2">Khám Phá Danh Mục Nổi Bật</p>
        <div class="flex items-center justify-center gap-3 flex-wrap opacity-75 grayscale hover:grayscale-0 transition-all">
          <span class="px-2.5 py-1 rounded-md bg-slate-100 font-bold text-[10px] text-slate-700 tracking-wider uppercase">THỜI TRANG</span>
          <span class="px-2.5 py-1 rounded-md bg-slate-100 font-bold text-[10px] text-slate-700 tracking-wider uppercase">ĐIỆN TỬ</span>
          <span class="px-2.5 py-1 rounded-md bg-slate-100 font-bold text-[10px] text-slate-700 tracking-wider uppercase">LÀM ĐẸP</span>
          <span class="px-2.5 py-1 rounded-md bg-slate-100 font-bold text-[10px] text-slate-700 tracking-wider uppercase">NHÀ CỬA</span>
          <span class="px-2.5 py-1 rounded-md bg-slate-100 font-bold text-[10px] text-slate-700 tracking-wider uppercase">TRỢ LÝ AI</span>
        </div>
      </div>
    </div>

    <AuthSlider />
  </div>
</template>
