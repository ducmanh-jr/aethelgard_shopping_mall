<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { authService } from '../services/apiServices';
import { setAuth } from '../stores/auth';

const router = useRouter();
const isRegister = ref(false);
const error = ref('');
const loading = ref(false);

const form = reactive({
  fullName: '',
  email: '',
  password: '',
  role: 'Customer'
});

function fillDemo(email: string) {
  isRegister.value = false;
  form.email = email;
  form.password = 'Password123@';
}

async function submit() {
  error.value = '';
  if (!form.email.trim() || !form.password) {
    error.value = 'Vui lòng nhập đầy đủ Email và Mật khẩu.';
    return;
  }
  if (isRegister.value && (!form.fullName.trim() || form.password.length < 8)) {
    error.value = 'Họ tên không được trống và mật khẩu tối thiểu 8 ký tự.';
    return;
  }

  loading.value = true;
  try {
    const data = isRegister.value
      ? await authService.register({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          role: form.role
        })
      : await authService.login({ email: form.email, password: form.password });

    setAuth({
      userId: data.userId,
      fullName: data.fullName,
      email: data.email,
      role: data.role,
      token: data.token
    });
    router.push('/');
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Đăng nhập/Đăng ký thất bại.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="card" style="max-width: 440px; margin: 40px auto;">
    <h2 style="margin-top: 0;">{{ isRegister ? 'Đăng ký tài khoản' : 'Đăng nhập hệ thống' }}</h2>
    <p v-if="error" style="color: #dc2626; font-weight: 500;">{{ error }}</p>

    <div style="display: flex; flex-direction: column; gap: 10px;">
      <input v-if="isRegister" v-model="form.fullName" class="input" placeholder="Họ và tên" />
      <input v-model="form.email" type="email" class="input" placeholder="Email" @keyup.enter="submit" />
      <input v-model="form.password" type="password" class="input" placeholder="Mật khẩu" @keyup.enter="submit" />
      <select v-if="isRegister" v-model="form.role" class="input">
        <option value="Customer">Customer</option>
        <option value="Seller">Seller</option>
      </select>

      <button class="btn btn-primary" :disabled="loading" @click="submit">
        {{ loading ? 'Đang xử lý...' : isRegister ? 'Đăng ký' : 'Đăng nhập' }}
      </button>

      <button class="btn" @click="isRegister = !isRegister">
        {{ isRegister ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký' }}
      </button>
    </div>

    <div v-if="!isRegister" style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
      <p style="font-size: 13px; color: #64748b; margin: 0 0 8px;">Tài khoản mẫu (Seeded):</p>
      <div style="display: flex; gap: 6px; flex-wrap: wrap;">
        <button class="btn" style="font-size: 12px;" @click="fillDemo('esther.howard@example.com')">Customer</button>
        <button class="btn" style="font-size: 12px;" @click="fillDemo('gucci@gmail.com')">Seller</button>
        <button class="btn" style="font-size: 12px;" @click="fillDemo('admin@gmail.com')">Admin</button>
      </div>
    </div>
  </div>
</template>
