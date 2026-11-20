<script setup lang="ts">
import { useRouter } from 'vue-router';
import { authState, clearAuth } from '../stores/auth';

const router = useRouter();

function logout() {
  clearAuth();
  router.push('/login');
}
</script>

<template>
  <header style="background: #0f172a; color: #fff; padding: 12px 0;">
    <div
      class="container"
      style="display: flex; align-items: center; justify-content: space-between; padding-top: 0; padding-bottom: 0;"
    >
      <div style="display: flex; gap: 18px; align-items: center;">
        <strong>Aethelgard Mall (Vue 3 + .NET)</strong>
        <router-link to="/" active-class="nav-active" style="color: #e2e8f0; text-decoration: none;">Sản phẩm</router-link>
        <router-link to="/orders" active-class="nav-active" style="color: #e2e8f0; text-decoration: none;">Đơn hàng</router-link>
        <router-link to="/ai" active-class="nav-active" style="color: #e2e8f0; text-decoration: none;">Trợ lý AI</router-link>
      </div>
      <div style="display: flex; gap: 12px; align-items: center;">
        <template v-if="authState.user">
          <span style="font-size: 13px; color: #cbd5e1;">
            {{ authState.user.fullName }} ({{ authState.user.role }})
          </span>
          <button class="btn" @click="logout">Đăng xuất</button>
        </template>
        <router-link v-else to="/login" class="btn">Đăng nhập</router-link>
      </div>
    </div>
  </header>
</template>
