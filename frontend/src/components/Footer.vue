<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuth } from '@/stores/auth';

const route = useRoute();
const { token, isLoading } = useAuth();

const shouldHide = computed(() => route.path === '/login' || (!isLoading.value && !token.value));
const socials = ['X', 'F', 'IN', 'IG'];
</script>

<template>
  <footer v-if="!shouldHide" class="bg-slate-900 text-slate-300 py-12 border-t border-slate-800 mt-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
      <div class="space-y-4">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-950 font-serif font-bold text-lg">
            Æ
          </div>
          <span class="text-lg font-bold tracking-widest text-white uppercase">
            Aethelgard <span class="text-[#0284C7]">Mall</span>
          </span>
        </div>
        <p class="footer-tagline text-slate-400 text-sm max-w-sm leading-relaxed">
          Sàn Thương Mại Điện Tử Tích Hợp AI Hàng Đầu.
        </p>
      </div>

      <div>
        <h4 class="text-white text-xs font-bold uppercase tracking-wider mb-3">Về Chúng Tôi</h4>
        <ul class="space-y-2 text-sm text-slate-400">
          <li><a href="#" class="hover:text-white transition-colors" @click.prevent>Tin tức</a></li>
          <li><a href="#" class="hover:text-white transition-colors" @click.prevent>Đội ngũ</a></li>
          <li><a href="#" class="hover:text-white transition-colors" @click.prevent>Liên hệ</a></li>
        </ul>
      </div>

      <div>
        <h4 class="text-white text-xs font-bold uppercase tracking-wider mb-3">Hỗ Trợ</h4>
        <ul class="space-y-2 text-sm text-slate-400">
          <li><a href="#" class="hover:text-white transition-colors" @click.prevent>Liên hệ</a></li>
          <li><a href="#" class="hover:text-white transition-colors" @click.prevent>Vận chuyển</a></li>
          <li><a href="#" class="hover:text-white transition-colors" @click.prevent>Đổi trả</a></li>
          <li><a href="#" class="hover:text-white transition-colors" @click.prevent>Câu hỏi thường gặp</a></li>
        </ul>
      </div>

      <div>
        <h4 class="text-white text-xs font-bold uppercase tracking-wider mb-3">Mạng Xã Hội</h4>
        <div class="flex items-center gap-2.5">
          <a
            v-for="item in socials"
            :key="item"
            href="#"
            class="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 hover:text-white transition-all border border-slate-700"
            @click.prevent
          >
            {{ item }}
          </a>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-4">
      <span>Bản quyền © 2026 Aethelgard Mall. Bảo lưu mọi quyền.</span>
      <div class="flex items-center gap-4">
        <a href="#" class="hover:text-slate-400 transition-colors" @click.prevent>Điều khoản dịch vụ</a>
        <a href="#" class="hover:text-slate-400 transition-colors" @click.prevent>Chính sách bảo mật</a>
      </div>
    </div>
  </footer>
</template>
